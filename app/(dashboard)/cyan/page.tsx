import type { Metadata } from 'next'
import { CyanChatInterface } from '@/components/conversation/CyanChatInterface'

export const metadata: Metadata = { title: 'Cyan' }

// ─────────────────────────────────────────────
// /cyan — Full-screen Cyan conversation interface
// Three-panel: threads | chat | context
// ─────────────────────────────────────────────

export default function CyanPage() {
  return <CyanChatInterface />
}
