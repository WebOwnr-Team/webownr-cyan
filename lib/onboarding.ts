import type { OnboardingStep, OnboardingState, ProductType } from '@/types'
import { DEFAULT_WORK_SCHEDULE } from '@/lib/schema'

export interface OnboardingQuestion {
  step: OnboardingStep
  cyanMessage: string
  cyanSubtext?: string
  inputType: 'text' | 'select' | 'textarea' | 'schedule'
  inputLabel: string
  inputPlaceholder?: string
  options?: { value: string; label: string; subtext?: string }[]
  fieldKey: keyof OnboardingState
  validation: (value: string) => string | null
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    step: 1,
    cyanMessage: "What's the name of your business?",
    cyanSubtext: "This is how your workspace will be identified across every report, briefing, and team view I generate.",
    inputType: 'text',
    inputLabel: 'Business name',
    inputPlaceholder: 'e.g. Alp Luxe Studio',
    fieldKey: 'businessName',
    validation: (v) => {
      if (!v.trim()) return 'Enter your business name to continue.'
      if (v.trim().length < 2) return 'Business name must be at least 2 characters.'
      return null
    },
  },
  {
    step: 2,
    cyanMessage: "What does your business do?",
    cyanSubtext: "This tells me how to frame your analytics, briefings, and recommendations — and how to speak about your business to your team.",
    inputType: 'select',
    inputLabel: 'Business type',
    fieldKey: 'productType',
    options: [
      {
        value: 'service',
        label: 'Agency or service business',
        subtext: 'Design, development, consulting, logistics, legal, creative — you deliver work for clients',
      },
      {
        value: 'physical',
        label: 'Product business',
        subtext: 'Fashion, electronics, FMCG, beauty, hardware — you manufacture or resell physical goods',
      },
      {
        value: 'digital',
        label: 'Digital products or SaaS',
        subtext: 'Software, courses, templates, subscriptions — your products are delivered online',
      },
      {
        value: 'hybrid',
        label: 'Mixed model',
        subtext: 'A combination — e.g. a studio that sells products and takes on client projects',
      },
    ],
    validation: (v) => {
      const valid: ProductType[] = ['physical', 'digital', 'service', 'hybrid']
      if (!valid.includes(v as ProductType)) return 'Select your business type to continue.'
      return null
    },
  },
  {
    step: 3,
    cyanMessage: "Who does your business serve?",
    cyanSubtext: "Describe your primary customer or client. The more specific you are, the more precisely I can frame every insight, report, and recommendation I generate for your team.",
    inputType: 'textarea',
    inputLabel: 'Target customer or client',
    inputPlaceholder: 'e.g. Mid-size Nigerian brands and startups that need UI/UX design and brand identity work. Decision-makers are usually founders or CMOs with a budget of ₦500K–₦5M per project.',
    fieldKey: 'targetCustomer',
    validation: (v) => {
      if (!v.trim()) return 'Describe your target customer or client to continue.'
      if (v.trim().length < 20) return 'A bit more detail helps — who exactly do you work with or sell to?'
      return null
    },
  },
  {
    step: 4,
    cyanMessage: "What's the single most important thing your business needs to achieve in the next 90 days?",
    cyanSubtext: "I'll track this as your primary goal in every dashboard briefing and weekly report. Be specific — a number or outcome makes it measurable.",
    inputType: 'textarea',
    inputLabel: '90-day priority',
    inputPlaceholder: 'e.g. Close 8 new client projects and bring monthly revenue to ₦4M by building a consistent outbound pipeline and improving our proposal-to-close rate.',
    fieldKey: 'primary90Day',
    validation: (v) => {
      if (!v.trim()) return 'Define your 90-day priority to continue.'
      if (v.trim().length < 15) return 'Be more specific — what does success look like in 90 days?'
      return null
    },
  },
  {
    step: 5,
    cyanMessage: "Set your team's operating hours.",
    cyanSubtext: "I use this to time morning briefings, track attendance, schedule break reminders, and know when your team is live. You can update this at any time from settings.",
    inputType: 'schedule',
    inputLabel: 'Work schedule',
    fieldKey: 'workSchedule',
    validation: (v) => {
      if (!v) return 'Set your work schedule to continue.'
      return null
    },
  },
]

export function buildCompletionMessage(businessName: string): string {
  return `${businessName} is live on WebOwnr. Your workspace is ready, your team can now be invited, and I'll have your first briefing waiting tomorrow morning.`
}

export function buildGoalsFromOnboarding(state: OnboardingState) {
  return {
    primary90Day: state.primary90Day ?? '',
    sixMonthRevenue: 0,
    yearMilestone: '',
    currentChallenges: [],
  }
}

export function inferIndustry(productType: ProductType): string {
  switch (productType) {
    case 'physical': return 'Retail / E-commerce'
    case 'digital':  return 'Digital Products / SaaS'
    case 'service':  return 'Agency / Professional Services'
    case 'hybrid':   return 'Mixed — Products & Services'
  }
}

export function buildBusinessDescription(state: OnboardingState): string {
  const name = state.businessName ?? 'This business'
  const type = state.productType ?? 'hybrid'
  const customer = state.targetCustomer ?? ''
  const goal = state.primary90Day ?? ''

  const typeLabel: Record<ProductType, string> = {
    physical: 'sells physical products',
    digital: 'sells digital products and software',
    service: 'provides professional services to clients',
    hybrid: 'sells products and provides services',
  }

  return `${name} ${typeLabel[type]}. Primary customer/client: ${customer}. Current 90-day priority: ${goal}.`
}

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  workSchedule: DEFAULT_WORK_SCHEDULE,
}