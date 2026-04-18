import { NextRequest } from 'next/server'
import { adminAuth, adminDb } from '@/firebase/firebaseAdmin'

// ─────────────────────────────────────────────
// Auth Middleware for API Routes
//
// Every Cyan API route MUST call verifyAuthAndGetContext()
// before doing anything else.
//
// This function:
//   1. Extracts the Firebase ID token from Authorization header
//   2. Verifies it with Firebase Admin Auth
//   3. Resolves the businessId from the user's TeamMember document
//   4. Returns the verified uid and businessId — never trusted from client input
//
// businessId is NEVER taken from the request body or query params.
// It is ALWAYS resolved server-side from the verified auth token.
// ─────────────────────────────────────────────

export interface AuthContext {
  uid: string
  businessId: string
  email: string | undefined
}

export interface AuthError {
  error: string
  status: 401 | 403 | 500
}

export type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; error: AuthError }

export async function verifyAuthAndGetContext(
  req: NextRequest
): Promise<AuthResult> {
  try {
    // 1. Extract token from Authorization: Bearer <token>
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: { error: 'Missing or invalid Authorization header', status: 401 },
      }
    }

    const idToken = authHeader.split('Bearer ')[1]

    // 2. Verify the token with Firebase Admin
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch {
      return {
        success: false,
        error: { error: 'Invalid or expired token', status: 401 },
      }
    }

    const uid = decodedToken.uid
    const email = decodedToken.email

    // 3. Resolve businessId server-side
    // Strategy: query teamMembers collection groups for a member doc with this uid
    // The first match gives us the businessId for this user.
    // For founders, they are always a member of their own business.
    const memberQuery = await adminDb
      .collectionGroup('members')
      .where('memberId', '==', uid)
      .limit(1)
      .get()

    if (memberQuery.empty) {
      // No team member record found — user has authenticated but not completed onboarding
      // Return uid without businessId so onboarding routes can handle this case
      return {
        success: false,
        error: { error: 'No business found for this user — onboarding required', status: 403 },
      }
    }

    const memberDoc = memberQuery.docs[0]
    const businessId = memberDoc.data().businessId as string

    if (!businessId) {
      return {
        success: false,
        error: { error: 'Malformed member record — businessId missing', status: 500 },
      }
    }

    return {
      success: true,
      context: { uid, businessId, email },
    }
  } catch (err) {
    console.error('[verifyAuthAndGetContext] Unexpected error:', err)
    return {
      success: false,
      error: { error: 'Internal server error during auth verification', status: 500 },
    }
  }
}

// ─────────────────────────────────────────────
// Lighter version for onboarding routes —
// verifies auth token but does NOT require a teamMembers record
// Used by the onboarding completion endpoint that creates the record
// ─────────────────────────────────────────────

export async function verifyAuthOnly(
  req: NextRequest
): Promise<{ success: true; uid: string; email: string | undefined } | { success: false; error: AuthError }> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: { error: 'Missing or invalid Authorization header', status: 401 },
      }
    }

    const idToken = authHeader.split('Bearer ')[1]

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken)
      return { success: true, uid: decodedToken.uid, email: decodedToken.email }
    } catch {
      return {
        success: false,
        error: { error: 'Invalid or expired token', status: 401 },
      }
    }
  } catch (err) {
    console.error('[verifyAuthOnly] Unexpected error:', err)
    return {
      success: false,
      error: { error: 'Internal server error during auth verification', status: 500 },
    }
  }
}
