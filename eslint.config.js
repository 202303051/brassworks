export default [
  {
    files: [
      'src/lib/factory-time.js',
      'src/config/app.config.js',
      'src/content/phase-plan.js',
      'src/components/FactoryClock.jsx',
      'src/components/DepartmentBrief.jsx',
      'src/layouts/PublicLayout.jsx',
      'src/layouts/OwnerLayout.jsx',
      'src/pages/Home.jsx',
      'src/pages/Furnace.jsx',
      'src/pages/Production.jsx',
      'src/pages/PhaseGuide.jsx',
      'src/pages/Privacy.jsx',
      'src/services/userPermissions.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
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
