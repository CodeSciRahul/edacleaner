/** Design system color tokens — single source of truth */

export const colors = {
  primary: {
    500: '#2563EB',
    hover: '#1D4ED8',
    pressed: '#1E40AF',
    light: '#DBEAFE'
  },
  accent: {
    cyan: '#06B6D4'
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  chart: {
    cpu: '#2563EB',
    ram: '#06B6D4',
    disk: '#8B5CF6',
    battery: '#22C55E',
    network: '#F59E0B'
  },
  dark: {
    background: '#0F172A',
    sidebar: '#111827',
    surface: '#1E293B',
    elevated: '#263449',
    border: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    hover: 'rgba(255,255,255,0.04)',
    selected: 'rgba(37,99,235,0.15)'
  },
  light: {
    background: '#E8EEF7',
    surface: '#F6F8FC',
    elevated: '#FFFFFF',
    sidebar: '#DCE5F2',
    border: '#C5D4E8',
    textPrimary: '#0F172A',
    textSecondary: '#55657A',
    hover: '#EEF3FA',
    selected: '#DBEAFE'
  }
} as const
