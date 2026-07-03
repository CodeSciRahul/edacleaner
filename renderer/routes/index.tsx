import type { RouteObject } from 'react-router-dom'
import { HomePage } from '@/features/home/pages/HomePage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { SmartScanPage } from '@/features/smart-scan/pages/SmartScanPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { FeatureSectionPage } from '@/features/sections/pages/FeatureSectionPage'

export const routes: Pick<RouteObject, 'path' | 'element'>[] = [
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: '/smart-scan',
    element: <SmartScanPage />
  },
  {
    path: '/cleanup',
    element: <FeatureSectionPage sectionId="cleanup" />
  },
  {
    path: '/storage',
    element: <FeatureSectionPage sectionId="storage" />
  },
  {
    path: '/performance',
    element: <FeatureSectionPage sectionId="performance" />
  },
  {
    path: '/reports',
    element: <ReportsPage />
  },
  {
    path: '/settings',
    element: <SettingsPage />
  }
]
