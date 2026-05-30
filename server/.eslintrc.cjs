module.exports = {
  root: true,
  env: { node: true, es2024: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules', 'coverage', 'dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
}