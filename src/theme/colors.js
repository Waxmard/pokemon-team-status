export const colors = {
  // Base - Deeper, more refined
  background: '#0d0d1a',
  surface: '#12121f',
  surfaceLight: '#1a1a2e',
  card: '#16162a',

  // Text hierarchy
  textPrimary: '#f0f0f5',
  textSecondary: '#9898b0',
  textMuted: '#5a5a70',

  // Accents - Softer, more refined
  primary: '#4a9eff',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',

  // Score colors
  positive: '#34d399',
  negative: '#f87171',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
}

// Naive UI theme overrides
export const themeOverrides = {
  common: {
    primaryColor: colors.primary,
    primaryColorHover: '#6bb3ff',
    primaryColorPressed: '#3a8ae6',
    successColor: colors.success,
    errorColor: colors.danger,
    warningColor: colors.warning,
    bodyColor: colors.background,
    cardColor: colors.card,
    modalColor: colors.surfaceLight,
    popoverColor: colors.card,
    tableColor: colors.surface,
    inputColor: colors.card,
    actionColor: colors.surface,
    textColorBase: colors.textPrimary,
    textColor1: colors.textPrimary,
    textColor2: colors.textSecondary,
    textColor3: colors.textMuted,
    borderColor: colors.border,
    dividerColor: colors.border,
    borderRadius: '12px',
    borderRadiusSmall: '8px',
  },
  Button: {
    textColorPrimary: '#ffffff',
    textColorSuccess: '#ffffff',
    textColorError: '#ffffff',
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px',
  },
  Card: {
    color: colors.surface,
    borderColor: colors.border,
    borderRadius: '16px',
  },
  Input: {
    color: colors.card,
    borderColor: colors.border,
    borderColorFocus: colors.primary,
    borderRadius: '10px',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: colors.card,
        borderColor: colors.border,
        borderColorFocus: colors.primary,
        borderRadius: '10px',
      },
    },
  },
  AutoComplete: {
    peers: {
      InternalSelectMenu: {
        color: colors.card,
        borderRadius: '12px',
      },
      Input: {
        color: colors.card,
        borderColor: colors.border,
        borderColorFocus: colors.primary,
        borderRadius: '10px',
      },
    },
  },
  Tag: {
    borderRadius: '6px',
  },
}
