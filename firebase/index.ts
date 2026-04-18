export { auth, db, default as app } from './firebaseConfig'
// Note: firebaseAdmin is intentionally NOT re-exported here
// Import it directly in API routes: import { adminAuth, adminDb } from '@/firebase/firebaseAdmin'
// This prevents accidental client-side imports of server-only code
