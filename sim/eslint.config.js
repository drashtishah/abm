import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'e2e/**', '*.config.*'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['*/canvas-renderer*', '*/controls*', '*/slider*', '*/stats-overlay*', '*/csv-export*'], message: 'Engine/model code must not import DOM modules.' }
        ]
      }]
    },
  }
);
