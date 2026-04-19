import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/firebase/firebaseAdmin'
import { COLLECTIONS } from '@/lib/schema'
import { DEFAULT_CYAN_SETTINGS } from '@/types/teamMember'

// ─────────────────────────────────────────────
// POST /api/cyan/invite/accept
//
// Called when an invitee submits their password on /accept-invite.
// 1. Validates the invite token (not expired, still pending)
// 2. Creates a Firebase Auth user with the email + password
// 3. Writes the TeamMember document to Firestore
// 4. Marks the invite as accepted
//
// The client then signs in with signInWithEmailAndPassword()
// and navigates to /dashboard.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { token: string; password: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { token, password } = body

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // 1. Fetch and validate invite
  const inviteSnap = await adminDb.doc(`invites/${token}`).get()

  if (!inviteSnap.exists) {
    return NextResponse.json({ error: 'This invite link is invalid or has already been used.' }, { status: 404 })
  }

  const invite = inviteSnap.data()!

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been accepted or cancelled.' }, { status: 400 })
  }

  const expiresAt = invite.expiresAt?.toDate?.() as Date | undefined
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired. Ask your founder to send a new one.' }, { status: 400 })
  }

  const { businessId, email, name, role, department } = invite

  // 2. Create Firebase Auth user
  let uid: string
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })
    uid = userRecord.uid
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/email-already-exists') {
      // User already has an account — just get their UID and proceed
      try {
        const existing = await adminAuth.getUserByEmail(email)
        uid = existing.uid
      } catch {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in directly.' }, { status: 409 })
      }
    } else {
      console.error('[invite/accept] createUser failed:', err)
      return NextResponse.json({ error: 'Failed to create your account. Please try again.' }, { status: 500 })
    }
  }

  // 3. Write TeamMember document
  try {
    const memberRef = adminDb.doc(COLLECTIONS.teamMember(businessId, uid))
    await memberRef.set({
      memberId: uid,
      businessId,
      name,
      email,
      role,
      department,
      avatarUrl: null,
      statusMessage: 'Available',
      isOnline: false,
      lastSeenAt: null,
      joinedAt: Timestamp.now(),
      cyanSettings: DEFAULT_CYAN_SETTINGS,
      skillGrowth: [],
      unlockedDecorations: [],
      tasksCompletedTotal: 0,
      currentStreak: 0,
    })

    // 4. Mark invite as accepted
    await adminDb.doc(`invites/${token}`).update({
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      acceptedByUid: uid,
    })

    return NextResponse.json({
      success: true,
      email,
      message: 'Account created. You can now sign in.',
    })

  } catch (err) {
    console.error('[invite/accept] Firestore write failed:', err)
    return NextResponse.json({ error: 'Failed to set up your workspace access. Please try again.' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// GET /api/cyan/invite/accept?token=...
//
// Validates and returns invite details before the user
// sets their password. Used to pre-fill name/email on
// the accept-invite page.
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'No invite token provided.' }, { status: 400 })
  }

  const inviteSnap = await adminDb.doc(`invites/${token}`).get()

  if (!inviteSnap.exists) {
    return NextResponse.json({ error: 'This invite link is invalid or has already been used.' }, { status: 404 })
  }

  const invite = inviteSnap.data()!

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been accepted or cancelled.' }, { status: 400 })
  }

  const expiresAt = invite.expiresAt?.toDate?.() as Date | undefined
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired. Ask your founder to send a new one.' }, { status: 400 })
  }

  // Fetch business name
  const contextSnap = await adminDb.doc(COLLECTIONS.businessContext(invite.businessId)).get()
  const businessName = contextSnap.data()?.identity?.businessName ?? 'WebOwnr Workspace'

  return NextResponse.json({
    valid: true,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    department: invite.department,
    businessName,
  })
}