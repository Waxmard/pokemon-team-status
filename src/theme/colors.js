export const colors = {
  // Base - Clean light palette
  background: '#f8f9fc',
  surface: '#ffffff',
  surfaceLight: '#f1f3f8',
  card: '#ffffff',

  // Text hierarchy
  textPrimary: '#1a1d2e',
  textSecondary: '#5a5f7a',
  textMuted: '#9298b0',

  // Accents - Adjusted for light bg readability
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',

  // Score colors
  positive: '#10b981',
  negative: '#ef4444',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
}

// Naive UI theme overrides for light mode
export const themeOverrides = {
  common: {
    primaryColor: colors.primary,
    primaryColorHover: '#60a5fa',
    primaryColorPressed: '#2563eb',
    successColor: colors.success,
    errorColor: colors.danger,
    warningColor: colors.warning,
    bodyColor: colors.background,
    cardColor: colors.card,
    modalColor: colors.surface,
    popoverColor: colors.surface,
    tableColor: colors.surface,
    inputColor: colors.surface,
    actionColor: colors.surfaceLight,
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
    color: colors.surface,
    borderColor: colors.border,
    borderColorFocus: colors.primary,
    borderRadius: '10px',
    fontSizeMedium: '16px',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: colors.surface,
        borderColor: colors.border,
        borderColorFocus: colors.primary,
        borderRadius: '10px',
      },
    },
  },
  AutoComplete: {
    peers: {
      InternalSelectMenu: {
        color: colors.surface,
        borderRadius: '12px',
      },
      Input: {
        color: colors.surface,
        borderColor: colors.border,
        borderColorFocus: colors.primary,
        borderRadius: '10px',
        fontSizeMedium: '16px',
      },
    },
  },
  Tag: {
    borderRadius: '6px',
  },
  Popconfirm: {
    fontSize: '16px',
    peers: {
      Popover: {
        padding: '14px 18px',
        fontSize: '16px',
      },
    },
  },
}
