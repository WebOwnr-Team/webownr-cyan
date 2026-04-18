import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import type { TeamMember, CyanPersonalSettings, Department, MemberRole } from '@/types'
import { calculateMemberStreak } from '@/lib/attendance-engine'

// ─────────────────────────────────────────────
// GET  /api/cyan/member       — get own profile
// PATCH /api/cyan/member      — update own profile fields
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  const snap = await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).get()
  if (!snap.exists) {
    return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
  }

  return NextResponse.json({ member: snap.data() as TeamMember })
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { businessId, uid } = auth.context

  let body: {
    name?: string
    statusMessage?: string
    avatarUrl?: string
    department?: Department
    cyanSettings?: Partial<CyanPersonalSettings>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { 'lastSeenAt': Timestamp.now() }

  if (body.name?.trim())          updates.name          = body.name.trim().slice(0, 60)
  if (body.statusMessage !== undefined) updates.statusMessage = body.statusMessage.slice(0, 80)
  if (body.avatarUrl)             updates.avatarUrl     = body.avatarUrl
  if (body.department)            updates.department    = body.department

  // Merge Cyan settings — only update provided keys
  if (body.cyanSettings) {
    const snap = await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).get()
    if (snap.exists) {
      const current = (snap.data() as TeamMember).cyanSettings
      updates.cyanSettings = { ...current, ...body.cyanSettings }
    }
  }

  try {
    await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).update(updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[member PATCH] Error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
