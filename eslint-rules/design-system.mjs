// Local ESLint plugin: keeps the interface on the design system
// (docs/frontend-design-system.md). Each rule names the fix in its message.

// ── Classes that do not exist in the closed theme, or that the design forbids ──
const PALETTE =
  'slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const VARIANTS = String.raw`(?:[a-z0-9-]+:|\[[^\]\s]+\]:)*`;
const BANNED = [
  {
    re: new RegExp(String.raw`^${VARIANTS}-?[a-z-]+-(?:${PALETTE})-\d{2,3}(?:/\S+)?$`),
    why: 'Tailwind palette colours are removed from the theme: use a token (text-muted, bg-surface, border-border, text-primary…) or a role scale (neutral, brand, danger, success, warning).',
  },
  {
    re: new RegExp(String.raw`^${VARIANTS}[a-z-]+-\[(?:#|rgb|hsl|oklch)[^\]]*\]$`),
    why: 'No raw colour in a class: add a token to globals.css if one is missing.',
  },
  {
    re: new RegExp(
      String.raw`^${VARIANTS}font-(?:black|extrabold|semibold|medium|light|thin|extralight)$`
    ),
    why: 'Luciole has two weights: font-normal and font-bold.',
  },
  {
    re: new RegExp(String.raw`^${VARIANTS}(?:uppercase|tracking-\S+)$`),
    why: 'No spaced capitals: they are hard to read for dyslexic readers.',
  },
  {
    re: new RegExp(
      String.raw`^${VARIANTS}rounded(?:-[trblse]{1,2})?-(?:xs|xl|2xl|3xl|4xl|\[[^\]]+\])$`
    ),
    why: 'Radii are rounded-sm (chips), rounded-md (buttons, fields), rounded-lg (cards) or rounded-full.',
  },
  {
    re: new RegExp(
      String.raw`^${VARIANTS}shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner|\[[^\]]+\]|[a-z]+-\d+.*))?$`
    ),
    why: 'Cards sit flat with a border; only what floats over the page takes shadow-overlay.',
  },
  {
    re: new RegExp(
      String.raw`^${VARIANTS}(?:backdrop-blur\S*|blur-\S+|bg-gradient-\S+|bg-linear-\S+|bg-radial\S*|bg-clip-text)$`
    ),
    why: 'No blur, halo or gradient: flat surfaces.',
  },
  {
    re: new RegExp(String.raw`^${VARIANTS}text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]$`),
    why: 'Text is never below 12 px (text-xs).',
  },
  {
    re: new RegExp(
      String.raw`^(?:[a-z-]*hover:|active:|group-hover:|focus:)+-?(?:scale|translate-[xy]|rotate)-\S+$`
    ),
    why: 'No zoom or jump on hover: a colour change is enough.',
  },
];

function classTokens(text) {
  return text.split(/\s+/).filter(Boolean);
}

function looksLikeClassList(text) {
  // a class list: several tokens, at least one with a Tailwind shape
  return (
    /(?:^|\s)(?:[a-z0-9-]+:)*-?[a-z]+-[\w[\]/.#%-]+(?:\s|$)/.test(text) ||
    /^(?:uppercase|shadow|truncate)$/.test(text.trim())
  );
}

const noOffSystemClasses = {
  meta: {
    type: 'problem',
    docs: { description: 'Tailwind classes must stay inside the design system' },
    schema: [],
  },
  create(context) {
    function check(node, text) {
      if (!text || !looksLikeClassList(text)) return;
      for (const token of classTokens(text)) {
        for (const { re, why } of BANNED) {
          if (re.test(token)) {
            context.report({ node, message: `"${token}" — ${why}` });
            break;
          }
        }
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

// ── Raw colours in style={{…}} ──
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/i;
const noRawColors = {
  meta: {
    type: 'problem',
    docs: { description: 'No hard-coded colour in an inline style' },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style' || !node.value) return;
        const source = context.sourceCode.getText(node.value);
        if (COLOR_LITERAL.test(source)) {
          context.report({
            node,
            message:
              'Hard-coded colour in style: use var(--token) or a class. Pictures that are not interface (logo, share images, documents) are listed in eslint.config.mjs.',
          });
        }
      },
    };
  },
};

// ── <button>/<a>/<Link> painted as a button by hand ──
const FILLED = /(?:^|\s)(?:[a-z-]+:)*bg-primary(?:-solid|-hover)?(?:\s|$)/;
const preferUiButton = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Buttons come from components/ui' },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.name;
        if (!['button', 'a', 'Link'].includes(name)) return;
        const cls = node.attributes.find(
          (a) => a.type === 'JSXAttribute' && a.name.name === 'className'
        );
        if (!cls?.value) return;
        const text = context.sourceCode.getText(cls.value);
        if (
          FILLED.test(text.replace(/[`'"{}]/g, ' ')) &&
          /\bpx-\d/.test(text) &&
          /\btext-white\b/.test(text)
        ) {
          context.report({
            node,
            message: `A filled <${name}> styled by hand: use <Button>, <ButtonLink> or <IconButton> from @/components/ui.`,
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'design-system' },
  rules: {
    'no-off-system-classes': noOffSystemClasses,
    'no-raw-colors': noRawColors,
    'prefer-ui-button': preferUiButton,
  },
};

export default plugin;
