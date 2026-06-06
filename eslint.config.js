import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', '.vercel/**', 'dist/**', 'build/**', 'BACKEND_HANDOFF.pdf']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        OneSignal: 'readonly',
        Html5Qrcode: 'readonly',
        QRCode: 'readonly',
        html2canvas: 'readonly',
        jspdf: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  }
];
