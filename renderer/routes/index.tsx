import type { RouteObject } from 'react-router-dom'
import { HomePage } from '@/features/home/pages/HomePage'
import { SmartScanPage } from '@/features/smart-scan/pages/SmartScanPage'
import { CleanupPage } from '@/features/cleanup/pages/CleanupPage'
import { StoragePage } from '@/features/storage/pages/StoragePage'
import { PerformancePage } from '@/features/performance/pages/PerformancePage'
import { BackgroundAppsPage } from '@/features/background-apps/pages/BackgroundAppsPage'
import { StartupAppsPage } from '@/features/startup-apps/pages/StartupAppsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export const routes: Pick<RouteObject, 'path' | 'element'>[] = [
  { path: '/', element: <HomePage /> },
  { path: '/smart-scan', element: <SmartScanPage /> },
  { path: '/cleanup', element: <CleanupPage /> },
  { path: '/storage', element: <StoragePage /> },
  { path: '/performance', element: <PerformancePage /> },
  { path: '/background-apps', element: <BackgroundAppsPage /> },
  { path: '/startup-apps', element: <StartupAppsPage /> },
  { path: '/reports', element: <ReportsPage /> },
  { path: '/settings', element: <SettingsPage /> }
]
