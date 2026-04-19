import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are Cyan, WebOwnr's AI business agent. Generate a brief, specific 1-2 sentence office summary for the morning. Be proactive and specific — mention team presence, any key priorities. Do not say "How can I help?". Start with something like "Good morning. 3 team members are online..." or similar. Keep it under 40 words.`
      }]
    })
    const summary = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ summary })
  } catch (e) {
    return NextResponse.json({ summary: '' })
  }
}