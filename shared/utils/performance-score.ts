/**
 * Composite system score for Performance / Boost (PC Manager–style).
 * Weights: memory 40%, junk 25%, disk 20%, background 15%.
 */

export interface PerformanceScoreInput {
  memoryUsedPercent: number
  /** System volume used %; null when unknown */
  diskUsedPercent: number | null
  isLowDisk: boolean
  /** Estimated reclaimable temp + cache bytes */
  junkBytes: number
  /** Memory held by safe-to-stop background suggestions */
  backgroundPressureBytes: number
  backgroundProcessCount: number
}

export interface BoostScoreBonusInput {
  diskFreedBytes: number
  memoryReclaimedBytes: number
  processesTerminated: number
  dnsFlushed: boolean
  trashEmptied: boolean
  /** True when boost finished without cancel and did meaningful work / completed steps */
  succeeded: boolean
  cancelled: boolean
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Live / pre-boost system score from telemetry (15–98). */
export function computePerformanceScore(input: PerformanceScoreInput): number {
  const memoryScore = 100 - clamp(Math.round(input.memoryUsedPercent), 0, 100)

  let diskScore = 82
  if (input.diskUsedPercent != null) {
    diskScore = 100 - clamp(Math.round(input.diskUsedPercent), 0, 100)
  }
  if (input.isLowDisk) {
    diskScore = Math.min(diskScore, 42)
  }

  const junkGb = Math.max(0, input.junkBytes) / 1024 ** 3
  const junkScore = clamp(100 - Math.round(junkGb * 42), 18, 100)

  const bgGb = Math.max(0, input.backgroundPressureBytes) / 1024 ** 3
  const bgCountPenalty = Math.min(36, Math.max(0, input.backgroundProcessCount) * 4)
  const bgMemPenalty = Math.min(48, Math.round(bgGb * 32))
  const backgroundScore = clamp(100 - bgCountPenalty - bgMemPenalty, 22, 100)

  const composite =
    memoryScore * 0.4 + diskScore * 0.2 + junkScore * 0.25 + backgroundScore * 0.15

  return clamp(Math.round(composite), 15, 98)
}

/**
 * Perceptible score bonus tied to boost outcomes (capped).
 * Guarantees a small bump when any successful work landed.
 */
export function computeBoostScoreBonus(input: BoostScoreBonusInput): number {
  if (input.cancelled || !input.succeeded) return 0

  let bonus = 0
  const diskMb = Math.max(0, input.diskFreedBytes) / 1024 ** 2
  const memMb = Math.max(0, input.memoryReclaimedBytes) / 1024 ** 2

  if (diskMb > 0) {
    bonus += 3 + Math.min(10, Math.floor(diskMb / 100) * 2)
  }
  if (memMb >= 20) {
    bonus += 3 + Math.min(8, Math.floor(memMb / 120) * 2)
  }
  if (input.processesTerminated > 0) {
    bonus += Math.min(8, input.processesTerminated * 2)
  }
  if (input.dnsFlushed) bonus += 1
  if (input.trashEmptied) bonus += 2

  // Successful run with little measurable reclaim still shows a small win
  if (bonus < 3) bonus = 3

  return Math.min(18, bonus)
}

/** Ensure displayed post-boost score never drops below before + bonus. */
export function applyBoostScoreFloor(
  scoreBefore: number,
  rawScoreAfter: number,
  bonus: number
): { scoreAfter: number; scoreDelta: number } {
  const before = clamp(Math.round(scoreBefore), 15, 98)
  const raw = clamp(Math.round(rawScoreAfter), 15, 98)
  const safeBonus = Math.max(0, Math.round(bonus))

  const floored = Math.max(raw, before + safeBonus, before)
  const scoreAfter = clamp(floored, 15, 99)
  const scoreDelta = Math.max(0, scoreAfter - before)

  return { scoreAfter, scoreDelta }
}
