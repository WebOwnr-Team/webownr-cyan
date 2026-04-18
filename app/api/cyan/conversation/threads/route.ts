import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import { listThreads, getThreadMessages } from '@/lib/conversation-manager'
import type { ConversationThread } from '@/types'

// ─────────────────────────────────────────────
// GET /api/cyan/conversation/threads
// Returns all non-archived threads for the current user.
//
// PATCH /api/cyan/conversation/threads
// Pin, unpin, archive, or rename a thread.
// Body: { threadId, action: 'pin'|'unpin'|'archive'|'rename', title? }
//
// GET /api/cyan/conversation/threads?threadId=xxx&messages=true
// Returns messages for a specific thread.
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context
  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('threadId')
  const includeMessages = searchParams.get('messages') === 'true'

  // Single thread + messages
  if (threadId) {
    const snap = await adminDb.doc(COLLECTIONS.thread(businessId, threadId)).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const thread = snap.data() as ConversationThread

    // Security: requester must own the thread or be the business owner
    if (thread.createdBy !== uid) {
      const ctxSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
      const ownerId = ctxSnap.data()?.identity?.ownerId as string
      if (ownerId !== uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    if (includeMessages) {
      const messages = await getThreadMessages(businessId, threadId)
      return NextResponse.json({ thread, messages })
    }

    return NextResponse.json({ thread })
  }

  // Thread list
  try {
    const threads = await listThreads(businessId, uid)
    return NextResponse.json({ threads, count: threads.length })
  } catch (err) {
    console.error('[threads GET] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  let body: { threadId: string; action: string; title?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { threadId, action, title } = body
  if (!threadId || !action) {
    return NextResponse.json({ error: 'threadId and action are required' }, { status: 400 })
  }

  const threadRef = adminDb.doc(COLLECTIONS.thread(businessId, threadId))
  const snap = await threadRef.get()
  if (!snap.exists) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const thread = snap.data() as ConversationThread
  if (thread.createdBy !== uid) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  switch (action) {
    case 'pin':     updates.isPinned = true;  break
    case 'unpin':   updates.isPinned = false; break
    case 'archive': updates.isArchived = true; break
    case 'rename':
      if (!title?.trim()) {
        return NextResponse.json({ error: 'title is required for rename' }, { status: 400 })
      }
      updates.title = title.trim().slice(0, 60)
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  await threadRef.update(updates)
  return NextResponse.json({ success: true, threadId, action })
}
