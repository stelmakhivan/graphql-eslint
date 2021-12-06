/* eslint sort-keys: ['error', 'asc', { minKeys: 5 }] */
const CODE_FILE_EXTENSIONS = '{js,jsx,cjs,mjs,ts,tsx,cts,mts}';

module.exports = {
  reportUnusedDisableDirectives: true,
  ignorePatterns: ['examples/**/*'],
  overrides: [
    {
      files: `*.${CODE_FILE_EXTENSIONS}`,
      extends: ['eslint:recommended', 'standard', 'plugin:@typescript-eslint/recommended', 'prettier'],
      plugins: ['unicorn'],
      rules: {
        '@typescript-eslint/array-type': ['error', { readonly: 'generic' }],
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/prefer-optional-chain': 'error',
        'import/no-useless-path-segments': ['error', { noUselessIndex: true, commonjs: true }],
        'import/order': ['error', { groups: ['builtin', 'external', 'internal'] }],
        'no-console': 'error',
        'no-else-return': ['error', { allowElseIf: false }],
        'no-lonely-if': 'error',
        'no-restricted-globals': ['error', { name: 'isNaN', message: 'Use Number.isNaN instead' }],
        'object-shorthand': ['error', 'always'],
        'unicorn/better-regex': 'error',
        'unicorn/no-lonely-if': 'error',
        'unicorn/no-useless-fallback-in-spread': 'error',
        'unicorn/prefer-array-some': 'error',
        'unicorn/prefer-includes': 'error',
        'unicorn/prefer-object-from-entries': 'error',
        'unicorn/prefer-string-trim-start-end': 'error',
      },
    },
    {
      files: '**/rules/*.ts',
      extends: 'plugin:eslint-plugin/rules-recommended',
      rules: {
        'eslint-plugin/require-meta-docs-url': [
          'error',
          { pattern: 'https://github.com/dotansimha/graphql-eslint/blob/master/docs/rules/{{name}}.md' },
        ],
      },
    },
    {
      files: `*.{spec,test}.${CODE_FILE_EXTENSIONS}`,
      extends: 'plugin:eslint-plugin/tests-recommended',
      env: {
        jest: true,
      },
      rules: {
        'eslint-plugin/test-case-shorthand-strings': 'error',
      },
    },
    {
      files: `**/tests/mocks/*.${CODE_FILE_EXTENSIONS}`,
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: `scripts/**/*.${CODE_FILE_EXTENSIONS}`,
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
