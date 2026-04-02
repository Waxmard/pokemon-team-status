import sonarjs from 'eslint-plugin-sonarjs'

export default [
  sonarjs.configs.recommended,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='crypto'][property.name='randomUUID']",
          message: 'Use generateUUID() from src/utils/uuid.js — crypto.randomUUID() is unavailable in non-secure contexts (HTTP on mobile).',
        },
      ],
    },
  },
  {
    files: ['src/utils/uuid.js', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]
