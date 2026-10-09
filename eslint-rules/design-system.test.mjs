// node --test eslint-rules/ (run by `npm run lint`)
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from './design-system.mjs';

const tester = new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});
const {
  'no-off-system-classes': classes,
  'no-raw-colors': colors,
  'prefer-ui-button': button,
} = plugin.rules;

tester.run('no-off-system-classes', classes, {
  valid: [
    '<div className="bg-surface text-muted border border-border rounded-lg p-4" />',
    '<p className="text-neutral-700 dark:text-neutral-200 font-bold text-xs" />',
    '<div className={`rounded-md ${open ? "bg-primary-muted" : "bg-danger-50"}`} />',
    '<div className="absolute shadow-overlay rounded-full" />',
    'const msg = "Texte en majuscules : uppercase";', // prose, not a class list
    'const css = "text-transform: uppercase;";',
  ],
  invalid: [
    { code: '<div className="bg-slate-50 p-4" />', errors: 1 },
    { code: '<div className="dark:hover:text-indigo-400" />', errors: 1 },
    { code: '<div className={`p-2 ${a ? "bg-violet-600/20" : ""}`} />', errors: 1 },
    { code: '<h2 className="font-black text-xl" />', errors: 1 },
    { code: '<span className="text-xs uppercase tracking-widest" />', errors: 2 },
    { code: '<div className="rounded-3xl border" />', errors: 1 },
    { code: '<div className="rounded-[2rem] border" />', errors: 1 },
    { code: '<div className="shadow-xl border" />', errors: 1 },
    { code: '<div className="backdrop-blur-md bg-white/80" />', errors: 1 },
    { code: '<div className="bg-gradient-to-r from-primary" />', errors: 1 },
    { code: '<span className="text-[10px] font-bold" />', errors: 1 },
    { code: '<div className="text-[#4f46e5] p-1" />', errors: 1 },
    { code: '<button className="p-2 hover:scale-105" />', errors: 1 },
  ],
});

tester.run('no-raw-colors', colors, {
  valid: ['<div style={{ color: "var(--primary)" }} />', '<div style={{ width: 12 }} />'],
  invalid: [
    { code: '<div style={{ color: "#4f46e5" }} />', errors: 1 },
    { code: '<div style={{ background: "rgba(0,0,0,.2)" }} />', errors: 1 },
  ],
});

tester.run('prefer-ui-button', button, {
  valid: ['<Button variant="primary">OK</Button>', '<button className="p-2 text-muted">x</button>'],
  invalid: [
    {
      code: '<button className="bg-primary text-white px-4 py-2 rounded-md">OK</button>',
      errors: 1,
    },
    {
      code: '<Link href="/" className="bg-primary hover:bg-primary-hover text-white px-6">Go</Link>',
      errors: 1,
    },
  ],
});
