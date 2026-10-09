import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import designSystem from './eslint-rules/design-system.mjs';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Design system guard, the same as DysAdapt's (eslint-rules/ is copied from
  // dysadapt/frontend/eslint-rules — keep in sync): the theme is closed, and
  // these rules say what to use instead before a stray class reaches main.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'design-system': designSystem },
    rules: {
      'design-system/no-off-system-classes': 'error',
      'design-system/no-raw-colors': 'error',
      'design-system/prefer-ui-button': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'confirm', message: 'Ask in <ConfirmDialog>, not the browser dialog.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              importNames: [
                'Sparkles',
                'Sparkle',
                'Bot',
                'BotMessageSquare',
                'Wand',
                'Wand2',
                'WandSparkles',
                'Zap',
                'BrainCircuit',
                'Stars',
              ],
              message:
                'The "AI" icons are out of the design: show the action instead (Camera, Upload, FileText…).',
            },
          ],
        },
      ],
    },
  },
  // The building blocks export their class helpers next to the components.
  {
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // The logo is a picture, not interface: it keeps its own colours.
  {
    files: ['src/components/DictadaptLogo.tsx'],
    rules: { 'design-system/no-raw-colors': 'off' },
  }
);
