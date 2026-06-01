module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-console': ['error', { allow: ['time', 'timeEnd'] }]
  }
};
