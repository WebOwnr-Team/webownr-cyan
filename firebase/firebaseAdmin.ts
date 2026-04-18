import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// ─────────────────────────────────────────────
// Firebase Admin SDK
// SERVER-SIDE ONLY — never import this in client components
// Used for:
//   - Verifying Firebase Auth ID tokens in API routes
//   - Writing to tokenUsage (client write is blocked in security rules)
//   - Any privileged Firestore operations
// ─────────────────────────────────────────────

let adminApp: App

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // In production: use a service account JSON via env var
  // FIREBASE_SERVICE_ACCOUNT_KEY = base64-encoded service account JSON
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
    )
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  } else {
    // Development fallback — uses Application Default Credentials
    // Run: gcloud auth application-default login
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }

  return adminApp
}

export const adminAuth = getAuth(getAdminApp())
export const adminDb = getFirestore(getAdminApp())
