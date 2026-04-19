import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import OpenAI from 'openai'

// ─────────────────────────────────────────────
// AI Client — server-side only
//
// Never import this in client components.
// All calls go through Next.js API routes.
//
// PRIMARY:  Anthropic Claude API
// FALLBACK: OpenAI ChatGPT API
//
// Fallback triggers automatically when Anthropic fails with:
//   - 401 invalid_api_key
//   - 400 credit_balance_too_low (insufficient_quota)
//   - 529 overloaded
//   - Any 5xx server error
//
// Model mapping (Anthropic → OpenAI fallback):
//   claude-haiku  → gpt-4o-mini   (fast, cheap)
//   claude-sonnet → gpt-4o        (capable, equivalent quality)
//
// Set these in Vercel environment variables:
//   ANTHROPIC_API_KEY  — primary
//   OPENAI_API_KEY     — fallback (get from platform.openai.com)
// ─────────────────────────────────────────────

export const MODELS = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5',
} as const

// OpenAI equivalent models
const OPENAI_MODEL_MAP: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'gpt-4o-mini',
  'claude-sonnet-4-5':         'gpt-4o',
}

export type CyanModel = typeof MODELS[keyof typeof MODELS]

// ── Client singletons ─────────────────────────────────────────────────────────

let _anthropicClient: Anthropic | null = null
let _openaiClient: OpenAI | null = null

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey })
  }
  return _anthropicClient
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey })
  }
  return _openaiClient
}

// ── Fallback detection ────────────────────────────────────────────────────────

function shouldFallback(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as Record<string, unknown>

  // Anthropic SDK error shape
  const status = e.status as number | undefined
  const errorType = (e.error as Record<string, unknown> | undefined)
    ?.error as Record<string, unknown> | undefined
  const errorTypeName = errorType?.type as string | undefined

  if (
    status === 401 ||                                        // invalid key
    status === 400 && errorTypeName === 'invalid_request_error' || // low credits
    status === 529 ||                                        // overloaded
    (status !== undefined && status >= 500)                  // server error
  ) {
    return true
  }

  // Also catch the credit error by message text
  const message = (e.message as string | undefined) ?? ''
  if (
    message.includes('credit balance is too low') ||
    message.includes('insufficient_quota') ||
    message.includes('invalid x-api-key')
  ) {
    return true
  }

  return false
}

// ── Shared result type ────────────────────────────────────────────────────────

export interface CyanCompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: CyanModel
  provider: 'anthropic' | 'openai'
}

// ── Standard (non-streaming) completion ──────────────────────────────────────

export interface CyanCompletionOptions {
  model: CyanModel
  systemPrompt: string
  messages: MessageParam[]
  maxTokens?: number
  temperature?: number
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

  // ── Try Anthropic first ───────────────────────────────────────────────────
  const anthropic = getAnthropicClient()

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
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
        provider: 'anthropic',
      }
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn('[anthropic-client] Anthropic unavailable — falling back to OpenAI:', (err as Error).message)
      } else {
        // Non-recoverable error (bad request, etc.) — rethrow immediately
        throw err
      }
    }
  } else {
    console.warn('[anthropic-client] ANTHROPIC_API_KEY not set — using OpenAI fallback')
  }

  // ── OpenAI fallback ───────────────────────────────────────────────────────
  const openai = getOpenAIClient()

  if (!openai) {
    throw new Error(
      'Both Anthropic and OpenAI are unavailable. ' +
      'Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment variables.'
    )
  }

  const openaiModel = OPENAI_MODEL_MAP[model] ?? 'gpt-4o-mini'

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string'
        ? m.content
        : (m.content as Array<{ type: string; text?: string }>)
            .filter(b => b.type === 'text')
            .map(b => b.text ?? '')
            .join(''),
    })),
  ]

  const response = await openai.chat.completions.create({
    model: openaiModel,
    max_tokens: maxTokens,
    temperature,
    messages: openaiMessages,
  })

  const content = response.choices[0]?.message?.content ?? ''
  const usage = response.usage

  return {
    content,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    model,
    provider: 'openai',
  }
}

// ── Streaming completion ──────────────────────────────────────────────────────
// Streams from Anthropic when available, falls back to OpenAI streaming.

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

  const encoder = new TextEncoder()

  // ── Try Anthropic streaming first ─────────────────────────────────────────
  const anthropic = getAnthropicClient()

  if (anthropic) {
    try {
      const stream = await anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
      })

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (
                chunk.type === 'content_block_delta' &&
                chunk.delta.type === 'text_delta'
              ) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
                )
              }
            }

            const finalMessage = await stream.finalMessage()
            if (onComplete) {
              onComplete({
                inputTokens: finalMessage.usage.input_tokens,
                outputTokens: finalMessage.usage.output_tokens,
              })
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        },
      })
    } catch (err) {
      if (shouldFallback(err)) {
        console.warn('[anthropic-client] Anthropic stream unavailable — falling back to OpenAI:', (err as Error).message)
      } else {
        throw err
      }
    }
  } else {
    console.warn('[anthropic-client] ANTHROPIC_API_KEY not set — using OpenAI stream fallback')
  }

  // ── OpenAI streaming fallback ─────────────────────────────────────────────
  const openai = getOpenAIClient()

  if (!openai) {
    throw new Error(
      'Both Anthropic and OpenAI are unavailable. ' +
      'Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment variables.'
    )
  }

  const openaiModel = OPENAI_MODEL_MAP[model] ?? 'gpt-4o-mini'

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string'
        ? m.content
        : (m.content as Array<{ type: string; text?: string }>)
            .filter(b => b.type === 'text')
            .map(b => b.text ?? '')
            .join(''),
    })),
  ]

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let inputTokens = 0
        let outputTokens = 0

        const stream = await openai.chat.completions.create({
          model: openaiModel,
          max_tokens: maxTokens,
          temperature,
          messages: openaiMessages,
          stream: true,
          stream_options: { include_usage: true },
        })

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            )
          }
          // OpenAI sends usage in the final chunk
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
        }

        if (onComplete) {
          onComplete({ inputTokens, outputTokens })
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
// These are called directly by briefing-generator.ts, chat routes, etc.
// No changes needed in those files.

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
