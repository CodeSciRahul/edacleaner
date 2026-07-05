import type { RouteObject } from 'react-router-dom'
import { HomePage } from '@/features/home/pages/HomePage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { SmartScanPage } from '@/features/smart-scan/pages/SmartScanPage'
import { ModulePlaceholder } from '@/pages/ModulePlaceholder'

const placeholderPaths = [
  '/junk-cleaner',
  '/startup-manager',
  '/performance',
  '/memory-optimizer',
  '/privacy',
  '/drivers',
  '/network',
  '/disk-analyzer',
  '/duplicate-files',
  '/scheduled-tasks'
]

export const routes: Pick<RouteObject, 'path' | 'element'>[] = [
  { path: '/', element: <HomePage /> },
  { path: '/smart-scan', element: <SmartScanPage /> },
  { path: '/settings', element: <SettingsPage /> },
  ...placeholderPaths.map((path) => ({
    path,
    element: <ModulePlaceholder />
  }))
]
