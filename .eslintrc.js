module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'simple-import-sort', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:import/errors',
    'plugin:import/typescript',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'prisma/**/*.ts', 'replacement-config.js'],
  rules: {
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-expressions': [
      'error',
      {
        allowTernary: true,
      },
    ],
    'no-else-return': 'warn',
    'no-return-assign': ['error', 'except-parens'],
    'prefer-arrow-callback': [
      'error',
      {
        allowNamedFunctions: true,
      },
    ],
    'no-param-reassign': [
      'error',
      {
        props: false,
      },
    ],
    'import/no-extraneous-dependencies': 'error',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'sort-imports': 'off',
    'import/order': 'off',

    'import/no-deprecated': 'warn',
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'off',
  },
};
