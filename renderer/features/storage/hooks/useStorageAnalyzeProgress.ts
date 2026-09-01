import { useEffect, useState } from 'react'
import type { TranslationKey } from '@/i18n/locales/en'
import type { StorageAnalyzeStepId } from '@/features/storage/components/StorageLoaderModal'

export interface StorageAnalyzeProgress {
  percent: number
  messageKey: TranslationKey
  stepId: StorageAnalyzeStepId
  currentItem?: string
}

const STEPS: Array<{ stepId: StorageAnalyzeStepId; messageKey: TranslationKey; weight: number }> = [
  { stepId: 'drives', messageKey: 'storage.analyzing.step.drives', weight: 0.12 },
  { stepId: 'usage', messageKey: 'storage.analyzing.step.usage', weight: 0.38 },
  { stepId: 'largeFiles', messageKey: 'storage.analyzing.step.largeFiles', weight: 0.28 },
  { stepId: 'duplicates', messageKey: 'storage.analyzing.step.duplicates', weight: 0.22 }
]

const SAMPLE_PATHS = [
  'Users/Documents',
  'Users/Downloads',
  'Program Files',
  'AppData/Local',
  'Windows/System32',
  'Users/Pictures'
]

/**
 * Simulated progress while storage analyze runs — backend has no IPC progress events yet.
 * Advances through drives → usage → large files → duplicates with gentle easing.
 */
export function useStorageAnalyzeProgress(active: boolean): StorageAnalyzeProgress | null {
  const [progress, setProgress] = useState<StorageAnalyzeProgress | null>(null)

  useEffect(() => {
    if (!active) {
      setProgress(null)
      return
    }

    let frame = 0
    let pathIndex = 0
    const started = performance.now()
    const durationMs = 9000

    const tick = (): void => {
      const elapsed = performance.now() - started
      const raw = Math.min(0.94, elapsed / durationMs)
      const eased = 1 - (1 - raw) ** 1.6
      const percent = Math.round(eased * 100)

      let cumulative = 0
      let step = STEPS[0]
      for (const candidate of STEPS) {
        cumulative += candidate.weight
        if (eased <= cumulative || candidate === STEPS[STEPS.length - 1]) {
          step = candidate
          break
        }
      }

      if (frame % 24 === 0) {
        pathIndex = (pathIndex + 1) % SAMPLE_PATHS.length
      }
      frame += 1

      setProgress({
        percent,
        messageKey: step.messageKey,
        stepId: step.stepId,
        currentItem: SAMPLE_PATHS[pathIndex]
      })
    }

    tick()
    const id = window.setInterval(tick, 120)
    return () => window.clearInterval(id)
  }, [active])

  return progress
}
