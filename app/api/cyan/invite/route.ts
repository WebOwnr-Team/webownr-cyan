import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/firebase/firebaseAdmin'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import { COLLECTIONS } from '@/lib/schema'
import type { MemberRole, Department } from '@/types'

// ─────────────────────────────────────────────
// POST /api/cyan/invite
//
// Creates a pending invite record in Firestore.
// The invite link contains the inviteId — when the invitee
// visits /accept-invite?token={inviteId} they set their password
// and are added as a team member.
//
// In production, wire sendInviteEmail() to your email provider
// (Resend, SendGrid, etc.). The invite link is always returned
// in the response so you can test without an email provider.
// ─────────────────────────────────────────────

export interface InvitePayload {
  email: string
  name: string
  role: MemberRole
  department: Department
}

async function sendInviteEmail(params: {
  toEmail: string
  toName: string
  inviterName: string
  businessName: string
  inviteUrl: string
}): Promise<void> {
  // TODO: wire to Resend / SendGrid / Nodemailer
  // For now this is a no-op — the invite URL is returned in the API response
  // so you can manually share or log it during development.
  console.log(`[invite] Invite URL for ${params.toEmail}: ${params.inviteUrl}`)
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })
  }

  const { uid, businessId } = auth.context

  // Only founders can invite
  const founderRef = await adminDb.doc(COLLECTIONS.teamMember(businessId, uid)).get()
  if (!founderRef.exists || founderRef.data()?.role !== 'founder') {
    return NextResponse.json({ error: 'Only the workspace founder can invite team members.' }, { status: 403 })
  }

  let body: InvitePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, name, role, department } = body

  if (!email?.trim() || !name?.trim()) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }

  // Get business context for email
  const contextSnap = await adminDb.doc(COLLECTIONS.businessContext(businessId)).get()
  const businessName = contextSnap.data()?.identity?.businessName ?? 'WebOwnr Workspace'
  const founderName = founderRef.data()?.name ?? 'Your founder'

  // Create invite document
  const inviteId = adminDb.collection('_invites').doc().id
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiry

  const inviteDoc = {
    inviteId,
    businessId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    department,
    invitedBy: uid,
    status: 'pending',
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
  }

  await adminDb.doc(`invites/${inviteId}`).set(inviteDoc)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cyan.webownr.com'
  const inviteUrl = `${appUrl}/accept-invite?token=${inviteId}`

  await sendInviteEmail({
    toEmail: email.trim(),
    toName: name.trim(),
    inviterName: founderName,
    businessName,
    inviteUrl,
  })

  return NextResponse.json({
    success: true,
    inviteId,
    inviteUrl, // always returned so you can test without email
    message: `Invite sent to ${email.trim()}`,
  })
}