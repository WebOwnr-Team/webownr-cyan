import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

// ─────────────────────────────────────────────
// Anthropic Client — server-side only
//
// Never import this in client components.
// All calls go through Next.js API routes.
//
// Model routing:
//   Haiku  → high-frequency, low-complexity tasks
//   Sonnet → strategy, content, complex reasoning
//
// The client is initialised once per serverless instance.
// ─────────────────────────────────────────────

export const MODELS = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5',
} as const

export type CyanModel = typeof MODELS[keyof typeof MODELS]

// Lazy singleton — initialised on first use, not at module load
let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

// ── Standard (non-streaming) completion ──────────────────────────────────────

export interface CyanCompletionOptions {
  model: CyanModel
  systemPrompt: string
  messages: MessageParam[]
  maxTokens?: number
  temperature?: number
}

export interface CyanCompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: CyanModel
}

export async function createCompletion(
  options: CyanCompletionOptions
): Promise<CyanCompletionResult> {
  const {
    model,
    systemPrompt,
    messages,
    maxTokens = 1024,
    temperature = 0.7,
  } = options

  const client = getClient()

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  })

  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  }
}

// ── Streaming completion ──────────────────────────────────────────────────────
// Returns a ReadableStream for real-time response rendering in the chat UI (Phase 7)

export interface CyanStreamOptions {
  model: CyanModel
  systemPrompt: string
  messages: MessageParam[]
  maxTokens?: number
  temperature?: number
  onComplete?: (result: { inputTokens: number; outputTokens: number }) => void
}

export async function createStreamingCompletion(
  options: CyanStreamOptions
): Promise<ReadableStream<Uint8Array>> {
  const {
    model,
    systemPrompt,
    messages,
    maxTokens = 1024,
    temperature = 0.7,
    onComplete,
  } = options

  const client = getClient()

  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            // SSE format: data: <chunk>\n\n
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        // Final message with token usage
        const finalMessage = await stream.finalMessage()
        if (onComplete) {
          onComplete({
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
          })
        }

        // Send done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

// ── Haiku-only completion for lightweight tasks ───────────────────────────────
// Convenience wrapper — ensures Haiku is used and maxTokens is conservative

export async function haikuCompletion(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512
): Promise<CyanCompletionResult> {
  return createCompletion({
    model: MODELS.haiku,
    systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
    temperature: 0.5,
  })
}

// ── Sonnet completion for complex tasks ───────────────────────────────────────

export async function sonnetCompletion(
  systemPrompt: string,
  messages: MessageParam[],
  maxTokens = 1500
): Promise<CyanCompletionResult> {
  return createCompletion({
    model: MODELS.sonnet,
    systemPrompt,
    messages,
    maxTokens,
    temperature: 0.7,
  })
}
