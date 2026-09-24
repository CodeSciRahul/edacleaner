/** 8px spacing system */

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px'
} as const

export const layout = {
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '68px',
  /**
   * Collapsed sidebar width when brand shares a row with traffic lights
   * (legacy horizontal-inset layouts). App chrome on macOS stacks brand below
   * the lights, so the normal collapsed width is used there.
   */
  sidebarCollapsedWidthMac: '120px',
  /** Left inset so single-row headers clear native traffic lights. */
  macTrafficLightInset: '76px',
  /** Reserved top row for native macOS traffic lights in the app titlebar. */
  macTrafficLightRow: '36px',
  toolbarHeight: '64px',
  titlebarHeight: '44px',
  contentPadding: '24px',
  gridGap: '20px',
  cardPadding: '24px'
} as const
