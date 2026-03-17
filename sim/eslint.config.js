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
    },
  },
  // Engine/model code must not import DOM modules — framework DOM modules and test files may
  {
    files: ['src/models/**/*.ts', 'src/utils/**/*.ts', 'src/cli/**/*.ts', 'src/framework/base-world.ts', 'src/framework/types.ts', 'src/framework/model-registry.ts', 'src/framework/logger.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['*/canvas-renderer*', '*/controls*', '*/slider*', '*/stats-overlay*', '*/csv-export*', '*/theme*', '*/context-renderer*'], message: 'Engine/model code must not import DOM modules.' }
        ]
      }]
    },
  }
);
