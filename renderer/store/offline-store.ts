import { create } from 'zustand'
import type {
  NetworkStatus,
  OfflineQueueStats,
  SyncPhase
} from '@shared/interfaces'

const EMPTY_QUEUE: OfflineQueueStats = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  abandoned: 0,
  total: 0
}

export interface OfflineEngineState {
  ready: boolean
  networkStatus: NetworkStatus
  online: boolean
  syncing: boolean
  syncPhase: SyncPhase
  syncMessage: string
  queue: OfflineQueueStats
  /** Epoch ms of last successful sync / auth sync; null if never. */
  lastSyncAt: number | null
  setNetwork: (online: boolean, status: NetworkStatus) => void
  setSyncProgress: (input: {
    running: boolean
    phase: SyncPhase
    message: string
  }) => void
  setQueue: (queue: OfflineQueueStats) => void
  setLastSyncAt: (at: number | null) => void
  markReady: () => void
}

export const useOfflineStore = create<OfflineEngineState>((set) => ({
  ready: false,
  networkStatus: 'unknown',
  online: true,
  syncing: false,
  syncPhase: 'idle',
  syncMessage: '',
  queue: EMPTY_QUEUE,
  lastSyncAt: null,

  setNetwork: (online, status) => set({ online, networkStatus: status }),

  setSyncProgress: ({ running, phase, message }) =>
    set({
      syncing: running,
      syncPhase: phase,
      syncMessage: message
    }),

  setQueue: (queue) => set({ queue }),

  setLastSyncAt: (at) => set({ lastSyncAt: at }),

  markReady: () => set({ ready: true })
}))

export function selectPendingCount(state: OfflineEngineState): number {
  return state.queue.pending + state.queue.processing
}

export function selectQueuedCount(state: OfflineEngineState): number {
  return state.queue.pending + state.queue.processing + state.queue.failed
}
