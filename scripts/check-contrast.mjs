#!/usr/bin/env node
/**
 * Checks the contrast of every text/background token pair (WCAG 2.1).
 * Fails (exit 1) when a pair is below 4.5:1, or below 3:1 for text ≥ 24px.
 *
 * Usage: node scripts/check-contrast.mjs
 *
 * Today it reads the mobile tokens (`mobile/src/theme/colors.ts`).
 * The web tokens (`fe/src/styles/tokens.css`) join in M4 F4.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobileColorsPath = join(repositoryRoot, "mobile/src/theme/colors.ts");

const NORMAL_TEXT_MINIMUM = 4.5;
const LARGE_TEXT_MINIMUM = 3;

/**
 * Pairs that appear on screen. `large: true` only when that text is
 * always ≥ 24px (WCAG large text), so 3:1 is enough.
 */
const MOBILE_PAIRS = [
  { text: "textHeading", background: "bg" },
  { text: "textHeading", background: "surface" },
  { text: "textHeading", background: "surfaceElevated" },
  { text: "textHeading", background: "accentBg" },
  { text: "textHeading", background: "dataBg" },
  { text: "text", background: "bg" },
  { text: "text", background: "surface" },
  { text: "text", background: "surfaceElevated" },
  { text: "text", background: "accentBg" },
  { text: "onAccent", background: "accent" },
  { text: "accentText", background: "bg" },
  { text: "accentText", background: "surface" },
  { text: "accentText", background: "accentBg" },
  { text: "onInk", background: "ink" },
  { text: "data", background: "bg" },
  { text: "data", background: "surface" },
  { text: "data", background: "dataBg" },
  { text: "onData", background: "data" },
  { text: "dataBg", background: "data" },
  { text: "danger", background: "bg" },
  { text: "danger", background: "surface" },
  { text: "danger", background: "dangerBg" },
  { text: "onDanger", background: "danger" },
  { text: "warning", background: "warningBg" },
];

/** `name: "#RRGGBB"` lines inside `export const colors = { … }`. */
function readHexTokens(source) {
  const colorsBlock = source.match(/export const colors = \{([\s\S]*?)\}/);
  if (!colorsBlock) {
    throw new Error("`export const colors = { … }` not found");
  }
  const entries = [...colorsBlock[1].matchAll(/(\w+):\s*"(#[0-9a-fA-F]{6})"/g)];
  return Object.fromEntries(entries.map((entry) => [entry[1], entry[2]]));
}

function channelLuminance(channel) {
  const value = channel / 255;
  if (value <= 0.03928) {
    return value / 12.92;
  }
  return ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

function contrastRatio(firstHex, secondHex) {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkPair(tokens, pair) {
  const textHex = tokens[pair.text];
  const backgroundHex = tokens[pair.background];
  if (!textHex || !backgroundHex) {
    return { ...pair, ratio: 0, minimum: 0, error: "token missing" };
  }
  const minimum = pair.large ? LARGE_TEXT_MINIMUM : NORMAL_TEXT_MINIMUM;
  const ratio = contrastRatio(textHex, backgroundHex);
  return { ...pair, ratio, minimum, error: null };
}

function isFailing(result) {
  return result.error !== null || result.ratio < result.minimum;
}

function formatResult(result) {
  const status = isFailing(result) ? "FAIL" : "ok  ";
  const detail = result.error ?? `${result.ratio.toFixed(2)}:1 (min ${result.minimum}:1)`;
  return `${status} ${result.text} on ${result.background} — ${detail}`;
}

const tokens = readHexTokens(readFileSync(mobileColorsPath, "utf8"));
const results = MOBILE_PAIRS.map((pair) => checkPair(tokens, pair));
const failures = results.filter((result) => isFailing(result));

console.log("Mobile (mobile/src/theme/colors.ts)");
console.log(results.map((result) => `  ${formatResult(result)}`).join("\n"));

if (failures.length > 0) {
  console.error(`\n${failures.length} pair(s) below the minimum contrast.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} pairs pass.`);
