/** Knip configuration — detect unused exports, files, and dependencies. */
export default {
  project: ['src/**/*.ts'],
  ignore: ['src/models/_template/**'],
  ignoreDependencies: [
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    '@vitest/coverage-v8',
  ],
  ignoreBinaries: [],
  // Public API types and utilities exported for consumers (CLI, future models, plugins)
  entry: [
    'src/cli/args.ts',
    'src/framework/logger.ts',
    'src/framework/types.ts',
    'src/utils/vec2.ts',
  ],
};
