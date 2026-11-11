export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        document: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        indexedDB: 'readonly',
        BroadcastChannel: 'readonly',
        structuredClone: 'readonly',
        crypto: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
    },
  },
];
