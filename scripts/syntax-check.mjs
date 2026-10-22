// Static syntax check: parses every source file with @babel/parser (JSX +
// modern syntax) so a typo in a screen, context or navigation file fails
// loudly instead of at runtime.
// Run with: node scripts/syntax-check.mjs
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "assets" || entry === "node_modules") continue;
      walk(full, out);
    } else if (extname(full) === ".js") {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
let failures = 0;
for (const file of files) {
  const code = readFileSync(file, "utf8");
  try {
    parse(code, {
      sourceType: "module",
      plugins: ["jsx", "classProperties", "objectRestSpread", "optionalChaining", "nullishCoalescingOperator"],
    });
  } catch (e) {
    failures += 1;
    console.log(`FAIL - ${file.replace(join(ROOT, "..") + "/", "")} :: ${e.message}`);
  }
}

if (failures > 0) {
  console.log(`${failures} file(s) failed to parse`);
  process.exit(1);
}
console.log(`all ${files.length} source files parse cleanly`);
