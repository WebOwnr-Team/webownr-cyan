import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthAndGetContext } from '@/lib/auth-middleware'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const auth = await verifyAuthAndGetContext(req)
  if (!auth.success) return NextResponse.json({ error: auth.error.error }, { status: auth.error.status })

  const { businessGoal } = await req.json()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are Cyan, a proactive AI business agent. The founder's 90-day goal is: "${businessGoal ?? 'grow the business'}". 
Suggest exactly 5 specific, actionable tasks they should add to their board right now to make progress toward this goal.
Return ONLY a JSON array of 5 strings. No markdown, no explanation. Example: ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]`
    }]
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const clean = text.replace(/```json?|```/g, '').trim()
    const suggestions = JSON.parse(clean)
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}