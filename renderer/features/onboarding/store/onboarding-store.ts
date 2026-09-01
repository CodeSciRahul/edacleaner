import { create } from 'zustand'

export type OnboardingStep = 'hero' | 'account' | 'ready'

export type AuthIntent = 'activate' | 'purchase'

const STORAGE_KEY = 'eda-cleaner-onboarding'

const VALID_STEPS = new Set<OnboardingStep>(['hero', 'account', 'ready'])

function normalizeStep(value: unknown): OnboardingStep {
  if (VALID_STEPS.has(value as OnboardingStep)) return value as OnboardingStep
  return 'hero'
}

interface PersistedOnboarding {
  completed: boolean
  step: OnboardingStep
}

function readPersisted(): PersistedOnboarding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: false, step: 'hero' }
    const parsed = JSON.parse(raw) as Partial<PersistedOnboarding>
    const step = parsed.completed ? 'hero' : normalizeStep(parsed.step)
    return {
      completed: parsed.completed === true,
      step: step === 'account' ? 'hero' : step
    }
  } catch {
    return { completed: false, step: 'hero' }
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
  flowActive: boolean
  setStep: (step: OnboardingStep) => void
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
  step: persisted.completed ? 'hero' : persisted.step,
  authIntent: 'activate',
  plansOpen: false,
  flowActive: false,

  setStep: (step) => {
    writePersisted(get().completed, step)
    set({ step })
  },

  back: () => {
    writePersisted(get().completed, 'hero')
    set({ step: 'hero', plansOpen: false })
  },

  beginAccount: (intent) => {
    set({ authIntent: intent, plansOpen: false })
  },

  startActivate: () => {
    set({ authIntent: 'activate', plansOpen: false })
  },

  startPurchase: () => {
    set({ authIntent: 'purchase', plansOpen: true })
  },

  openPlans: () => set({ plansOpen: true, authIntent: 'purchase' }),
  closePlans: () => set({ plansOpen: false }),

  complete: () => {
    writePersisted(true, 'hero')
    set({ completed: true, flowActive: false, plansOpen: false, step: 'hero' })
  },

  markFlowActive: () => {
    if (get().flowActive) return
    if (get().completed) {
      writePersisted(true, 'hero')
      set({ flowActive: true, step: 'hero' })
      return
    }
    set({ flowActive: true })
  },

  skipForExistingSession: () => {
    writePersisted(true, 'hero')
    set({ completed: true, flowActive: false, plansOpen: false })
  }
}))
