import type { RouteObject } from 'react-router-dom'
import { HomePage } from '@/features/home/pages/HomePage'

export const routes: Pick<RouteObject, 'path' | 'element'>[] = [
  {
    path: '/',
    element: <HomePage />
  }
]
