#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENTRY = process.argv[2] || "Index.html";
const includePattern = /<\?!=\s*include\((['"])(.+?)\1\)\s*\?>/g;

function readFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function expandIncludes(relativePath, stack = []) {
  if (stack.includes(relativePath)) {
    throw new Error(`Circular include: ${[...stack, relativePath].join(" -> ")}`);
  }
  const nextStack = [...stack, relativePath];
  const source = readFile(relativePath);
  return source.replace(includePattern, (_, __, nestedPath) => expandIncludes(nestedPath, nextStack));
}

function extractScripts(html) {
  const scripts = [];
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    scripts.push(match[1] || "");
  }
  return scripts;
}

function parseScriptBlocks(scripts) {
  for (let index = 0; index < scripts.length; index += 1) {
    const code = scripts[index].trim();
    if (!code) continue;
    try {
      // eslint-disable-next-line no-new-func
      new Function(code);
    } catch (error) {
      throw new Error(`Script block ${index + 1} parse failed: ${error.message}`);
    }
  }
}

function main() {
  const expanded = expandIncludes(ENTRY);
  if (expanded.includes("<?")) {
    throw new Error("Unresolved template tag detected after include expansion.");
  }
  const scripts = extractScripts(expanded);
  parseScriptBlocks(scripts);
  console.log(`OK: ${ENTRY} includes expanded and ${scripts.length} script block(s) parsed.`);
}

try {
  main();
} catch (error) {
  console.error(`VALIDATION FAILED: ${error.message}`);
  process.exit(1);
}

