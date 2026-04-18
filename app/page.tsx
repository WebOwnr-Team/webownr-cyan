import { redirect } from 'next/navigation'

// Root route — redirect to login
// The auth guard in (dashboard)/layout.tsx handles redirect to /dashboard if already logged in
export default function RootPage() {
  redirect('/login')
}
