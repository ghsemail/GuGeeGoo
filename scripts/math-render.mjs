/**
 * Server-side KaTeX rendering for PDF generator ($...$ / $$...$$).
 * Bundles KaTeX CSS with local font file:// URLs for offline Puppeteer.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KATEX_DIST = path.resolve(__dirname, "../node_modules/katex/dist");

let cachedKatexCss = null;

export function getKatexCss() {
  if (cachedKatexCss) return cachedKatexCss;
  let css = readFileSync(path.join(KATEX_DIST, "katex.min.css"), "utf8");
  const fontDir = path.join(KATEX_DIST, "fonts").replace(/\\/g, "/");
  css = css.replace(/url\((fonts\/[^)]+)\)/g, (_match, rel) => {
    const file = rel.replace(/^fonts\//, "");
    return `url(file://${fontDir}/${file})`;
  });
  cachedKatexCss = css;
  return css;
}

const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

function renderLatex(latex, displayMode) {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: "ignore",
    trust: false,
    output: "html",
  });
}

/**
 * @param {string} raw plain text (not HTML-escaped)
 * @param {(s: string) => string} formatPlain escape + underline + bold for non-math segments
 */
export function renderMathInPlainText(raw, formatPlain) {
  if (!raw.includes("$")) {
    return formatPlain(raw);
  }

  const rendered = [];
  const tokenized = raw.replace(MATH_PATTERN, (match, displayPart, inlinePart) => {
    const latex = (displayPart !== undefined ? displayPart : inlinePart).trim();
    const displayMode = displayPart !== undefined;
    const idx = rendered.length;
    try {
      rendered.push(renderLatex(latex, displayMode));
    } catch {
      rendered.push(formatPlain(match));
    }
    return `\uE000MATH${idx}\uE001`;
  });

  let out = formatPlain(tokenized);
  for (let i = 0; i < rendered.length; i++) {
    out = out.replace(`\uE000MATH${i}\uE001`, rendered[i]);
  }
  return out;
}
