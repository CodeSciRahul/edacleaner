import { colors } from './colors'
import { typography } from './typography'
import { spacing, layout } from './spacing'
import { radius } from './radius'
import { shadow } from './shadow'
import { animation } from './animation'

export const theme = {
  colors,
  typography,
  spacing,
  layout,
  radius,
  shadow,
  animation
} as const

export type Theme = typeof theme
