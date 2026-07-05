/** Subtle desktop shadows — no large floating shadows */

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  md: '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
  cardHover: '0 4px 6px -2px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  dark: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
    md: '0 2px 4px -1px rgb(0 0 0 / 0.25)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.3)'
  }
} as const
