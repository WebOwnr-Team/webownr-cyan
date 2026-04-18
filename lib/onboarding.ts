import type { OnboardingStep, OnboardingState, ProductType } from '@/types'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

// ─────────────────────────────────────────────
// Onboarding Conversation Engine
//
// Cyan's first interaction with a new founder.
// 5 questions, conversational — not a form.
// Each step has: Cyan's message, input type, validation.
//
// After step 5, the full businessContext is written to Firestore.
// ─────────────────────────────────────────────

export interface OnboardingQuestion {
  step: OnboardingStep
  cyanMessage: string          // What Cyan says — shown as a briefing card
  cyanSubtext?: string         // Optional clarifying line below the main message
  inputType: 'text' | 'select' | 'textarea' | 'schedule'
  inputLabel: string
  inputPlaceholder?: string
  options?: { value: string; label: string; subtext?: string }[]
  fieldKey: keyof OnboardingState
  validation: (value: string) => string | null  // returns error string or null
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    step: 1,
    cyanMessage: "Let's set up your business. What's it called?",
    cyanSubtext: "This is how I'll refer to your business in every briefing and report.",
    inputType: 'text',
    inputLabel: 'Business name',
    inputPlaceholder: 'e.g. Adé Luxe Collections',
    fieldKey: 'businessName',
    validation: (v) => {
      if (!v.trim()) return 'Enter your business name to continue.'
      if (v.trim().length < 2) return 'Business name must be at least 2 characters.'
      return null
    },
  },
  {
    step: 2,
    cyanMessage: "What do you sell?",
    cyanSubtext: "Choose the option that best describes your business. This shapes everything I help you with.",
    inputType: 'select',
    inputLabel: 'What your business sells',
    fieldKey: 'productType',
    options: [
      {
        value: 'physical',
        label: 'Physical products',
        subtext: 'Fashion, electronics, food, beauty, homewares — things you ship or hand over',
      },
      {
        value: 'digital',
        label: 'Digital products',
        subtext: 'Courses, templates, software, downloads — things delivered online',
      },
      {
        value: 'service',
        label: 'Services',
        subtext: 'Consulting, design, photography, logistics, repairs — things you do for clients',
      },
      {
        value: 'hybrid',
        label: 'Both products and services',
        subtext: 'A mix — e.g. a salon that also sells haircare products',
      },
    ],
    validation: (v) => {
      const valid: ProductType[] = ['physical', 'digital', 'service', 'hybrid']
      if (!valid.includes(v as ProductType)) return 'Select what your business sells.'
      return null
    },
  },
  {
    step: 3,
    cyanMessage: "Who is your customer?",
    cyanSubtext: "Be specific. The more you tell me, the better I can tailor every insight to your market.",
    inputType: 'textarea',
    inputLabel: 'Your target customer',
    inputPlaceholder: 'e.g. Young Nigerian women aged 20–35 who buy fashion online and follow style influencers on Instagram',
    fieldKey: 'targetCustomer',
    validation: (v) => {
      if (!v.trim()) return 'Describe your target customer to continue.'
      if (v.trim().length < 20) return 'Give me a bit more detail — who exactly buys from you?'
      return null
    },
  },
  {
    step: 4,
    cyanMessage: "What's your biggest focus for the next 90 days?",
    cyanSubtext: "I'll track your progress against this goal in every daily briefing. Be specific — a number helps.",
    inputType: 'textarea',
    inputLabel: '90-day goal',
    inputPlaceholder: 'e.g. Hit ₦500,000 in monthly revenue by growing Instagram sales and launching WhatsApp ordering',
    fieldKey: 'primary90Day',
    validation: (v) => {
      if (!v.trim()) return 'Tell me your 90-day goal to continue.'
      if (v.trim().length < 15) return "Give me more detail — what does success look like in 90 days?"
      return null
    },
  },
  {
    step: 5,
    cyanMessage: "Last one — set your team's working hours.",
    cyanSubtext: "I'll use this to track attendance, send morning briefings at the right time, and schedule break reminders. You can change this later.",
    inputType: 'schedule',
    inputLabel: 'Work schedule',
    fieldKey: 'workSchedule',
    validation: (v) => {
      // Schedule is validated by the schedule component itself — always passes here
      if (!v) return 'Set your work schedule to continue.'
      return null
    },
  },
]

// ─────────────────────────────────────────────
// Cyan's completion message — shown after step 5
// ─────────────────────────────────────────────

export function buildCompletionMessage(businessName: string): string {
  return `${businessName} is ready. I've set up your workspace and I'm already learning your business. Your first briefing will be waiting for you tomorrow morning.`
}

// ─────────────────────────────────────────────
// Build the initial goals object from onboarding state
// ─────────────────────────────────────────────

export function buildGoalsFromOnboarding(state: OnboardingState) {
  return {
    primary90Day: state.primary90Day ?? '',
    sixMonthRevenue: 0,           // set in settings after onboarding
    yearMilestone: '',            // set in settings after onboarding
    currentChallenges: [],        // populated by Cyan over time
  }
}

// ─────────────────────────────────────────────
// Infer industry from productType — used to pre-populate
// businessContext.identity.industry before settings refinement
// ─────────────────────────────────────────────

export function inferIndustry(productType: ProductType): string {
  switch (productType) {
    case 'physical': return 'Retail / E-commerce'
    case 'digital':  return 'Digital Products / Creator Economy'
    case 'service':  return 'Professional Services'
    case 'hybrid':   return 'Retail & Services'
  }
}

// ─────────────────────────────────────────────
// Build businessDescription from onboarding answers
// Used as Cyan's initial context until the founder refines it
// ─────────────────────────────────────────────

export function buildBusinessDescription(state: OnboardingState): string {
  const name = state.businessName ?? 'This business'
  const type = state.productType ?? 'hybrid'
  const customer = state.targetCustomer ?? ''
  const goal = state.primary90Day ?? ''

  const typeLabel: Record<ProductType, string> = {
    physical: 'sells physical products',
    digital: 'sells digital products',
    service: 'provides services',
    hybrid: 'sells products and provides services',
  }

  return `${name} ${typeLabel[type]}. Target customer: ${customer}. Current 90-day focus: ${goal}.`
}

// ─────────────────────────────────────────────
// Initial onboarding state
// ─────────────────────────────────────────────

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  workSchedule: DEFAULT_WORK_SCHEDULE,
}
