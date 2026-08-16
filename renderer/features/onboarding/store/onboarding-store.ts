import { create } from 'zustand'

export type OnboardingStep =
  | 'welcome'
  | 'value'
  | 'features'
  | 'license'
  | 'account'
  | 'ready'

export type AuthIntent = 'activate' | 'purchase'

export const INTRO_STEPS: OnboardingStep[] = ['welcome', 'value', 'features', 'license']

const STORAGE_KEY = 'eda-cleaner-onboarding'

const VALID_STEPS = new Set<OnboardingStep>([
  'welcome',
  'value',
  'features',
  'license',
  'account',
  'ready'
])

interface PersistedOnboarding {
  completed: boolean
  step: OnboardingStep
}

function readPersisted(): PersistedOnboarding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: false, step: 'welcome' }
    const parsed = JSON.parse(raw) as Partial<PersistedOnboarding>
    const step = VALID_STEPS.has(parsed.step as OnboardingStep)
      ? (parsed.step as OnboardingStep)
      : 'welcome'
    return {
      completed: parsed.completed === true,
      step: parsed.completed ? 'welcome' : step
    }
  } catch {
    return { completed: false, step: 'welcome' }
  }
}

function writePersisted(completed: boolean, step: OnboardingStep): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, step }))
  } catch {
    // ignore quota / private mode
  }
}

interface OnboardingState {
  completed: boolean
  step: OnboardingStep
  authIntent: AuthIntent
  plansOpen: boolean
  /** True while this launch is inside the first-run / re-auth flow. */
  flowActive: boolean
  setStep: (step: OnboardingStep) => void
  nextIntro: () => void
  back: () => void
  startActivate: () => void
  startPurchase: () => void
  beginAccount: (intent: AuthIntent) => void
  openPlans: () => void
  closePlans: () => void
  complete: () => void
  markFlowActive: () => void
  skipForExistingSession: () => void
}

const persisted = readPersisted()

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  completed: persisted.completed,
  step: persisted.completed ? 'welcome' : persisted.step,
  authIntent: 'activate',
  plansOpen: false,
  flowActive: false,

  setStep: (step) => {
    const completed = get().completed
    writePersisted(completed, step)
    set({ step })
  },

  nextIntro: () => {
    const { step } = get()
    const index = INTRO_STEPS.indexOf(step)
    const next = INTRO_STEPS[Math.min(index + 1, INTRO_STEPS.length - 1)] ?? 'license'
    writePersisted(get().completed, next)
    set({ step: next })
  },

  back: () => {
    const { step } = get()
    if (step === 'account' || step === 'ready') {
      writePersisted(get().completed, 'license')
      set({ step: 'license', plansOpen: false })
      return
    }
    const index = INTRO_STEPS.indexOf(step)
    if (index <= 0) return
    const prev = INTRO_STEPS[index - 1] ?? 'welcome'
    writePersisted(get().completed, prev)
    set({ step: prev })
  },

  beginAccount: (intent) => {
    writePersisted(get().completed, 'account')
    set({ step: 'account', authIntent: intent, plansOpen: false })
  },

  startActivate: () => {
    get().beginAccount('activate')
  },

  startPurchase: () => {
    set({ authIntent: 'purchase', plansOpen: true })
  },

  openPlans: () => set({ plansOpen: true, authIntent: 'purchase' }),
  closePlans: () => set({ plansOpen: false }),

  complete: () => {
    writePersisted(true, 'welcome')
    set({ completed: true, flowActive: false, plansOpen: false, step: 'welcome' })
  },

  markFlowActive: () => {
    if (get().flowActive) return
    const completed = get().completed
    if (completed) {
      writePersisted(true, 'license')
      set({ flowActive: true, step: 'license' })
      return
    }
    set({ flowActive: true })
  },

  skipForExistingSession: () => {
    writePersisted(true, 'welcome')
    set({ completed: true, flowActive: false, plansOpen: false })
  }
}))
