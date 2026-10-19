/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'public', '**/*.css'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Base JS
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]', caughtErrorsIgnorePattern: '^[A-Z_]' }],

      // React / Hooks
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // BAN GENERIC LIBRARIES (Enforce Platform Standards)
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-hot-toast',
              message: 'react-hot-toast is forbidden. Use our native dark toast: import { toast } from "sonner" to match platform design.'
            },
            {
              name: 'lucide-react',
              importNames: ['Loader', 'Loader2', 'Loader3', 'Spinner'],
              message: 'Generic spinners are forbidden. Use our custom spinner: import { Spinner } from "@/components/marketing_ui/spinner"'
            }
          ]
        }
      ],

      // 100% COMPLIANCE ENFORCEMENT
      'no-restricted-syntax': [
        'error',
        {
          // BLOCK: raw HTML elements (Force system components)
          selector: "JSXOpeningElement[name.name=/^(input|button|select|a|img|form|label|table|thead|tbody|tr|td|th)$/]",
          message: "Raw HTML elements are forbidden. Use system components for 100% design system compliance."
        },
        {
          // BLOCK: Inline CSS toggles (e.g. peer-checked:after:translate-x-full on divs or input type="checkbox" role="switch")
          selector: "JSXAttribute[name.name='className'] > Literal[value=/peer-checked:.*translate-x-full/]",
          message: "Custom inline toggles are forbidden. You MUST import and use the <Switch /> component from @/components/marketing_ui/switch for all toggles/switches."
        },
        {
          // BLOCK: style={{ width: '100px' }} (ALLOW: CSS variables --*)
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.type='Identifier'][key.name!=/^--/]",
          message: "Inline styles are forbidden except for CSS variables (--*). Use Tailwind utility classes or system tokens instead."
        },
        {
          // BLOCK: style={{ 'width': '100px' }} (ALLOW: CSS variables '--*')
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.type='Literal'][key.value!=/^--/]",
          message: "Inline styles are forbidden except for CSS variables (--*). Use Tailwind utility classes or system tokens instead."
        },
        {
          // BLOCK: Arbitrary color/shadow bracket hacks (shadow-[...], bg-[#...])
          selector: "JSXAttribute[name.name='className'] > Literal[value=/shadow-\\[|bg-\\[#|border-\\[#/]",
          message: "Arbitrary Tailwind color/shadow values (shadow-[...], bg-[#...]) are forbidden. Use theme tokens or TONE_BG_CLASSES."
        }
      ]
    },
  },
  {
    files: ['src/components/marketing_ui/**/*.{js,jsx,ts,tsx}', 'src/features/auth/pages/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
)
