export const colors = {
  // Base
  background: '#1a1a2e',
  surface: '#16213e',
  surfaceLight: '#1e3a5f',
  card: '#0f3460',

  // Text
  textPrimary: '#eeeeee',
  textSecondary: '#aaaaaa',
  textMuted: '#666666',

  // Accents
  primary: '#3498db',
  success: '#2ecc71',
  danger: '#e74c3c',
  warning: '#f39c12',

  // Score colors
  positive: '#2ecc71',
  negative: '#e74c3c',
}

// Naive UI theme overrides
export const themeOverrides = {
  common: {
    primaryColor: colors.primary,
    primaryColorHover: '#5dade2',
    primaryColorPressed: '#2980b9',
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
    borderColor: '#333',
    dividerColor: '#333',
  },
  Button: {
    textColorPrimary: '#ffffff',
    textColorSuccess: '#ffffff',
    textColorError: '#ffffff',
  },
  Card: {
    color: colors.surface,
    borderColor: 'transparent',
  },
  Input: {
    color: colors.card,
    borderColor: '#333',
    borderColorFocus: colors.primary,
  },
  Select: {
    peers: {
      InternalSelection: {
        color: colors.card,
        borderColor: '#333',
        borderColorFocus: colors.primary,
      },
    },
  },
  AutoComplete: {
    peers: {
      InternalSelectMenu: {
        color: colors.card,
      },
      Input: {
        color: colors.card,
        borderColor: '#333',
        borderColorFocus: colors.primary,
      },
    },
  },
  Tag: {
    borderRadius: '4px',
  },
}
