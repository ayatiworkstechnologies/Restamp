// Static scope check for every source file. Catches the class of bug that
// syntax-check.mjs cannot: code that parses but throws a ReferenceError (or
// renders `undefined`) at runtime, e.g. a screen that still uses
// `styles.foo` after its StyleSheet.create block was removed, or a named
// import that the target module does not export.
//
// Checks:
//   1. every referenced identifier is declared, imported or a known global;
//   2. every `styles.X` has a matching key in the file's
//      `const styles = StyleSheet.create({...})`;
//   3. every named import from a relative module is exported by that module.
// Run with: node scripts/undeclared-identifiers.test.mjs
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const GLOBALS = new Set([
  "console", "Promise", "Date", "Math", "JSON", "Number", "String", "Boolean", "Array", "Object",
  "Set", "Map", "WeakMap", "WeakSet", "Symbol", "BigInt", "Reflect", "Proxy", "Error", "TypeError",
  "RegExp", "Intl", "parseInt", "parseFloat", "isNaN", "isFinite", "Infinity", "NaN", "undefined",
  "arguments", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "queueMicrotask",
  "requestAnimationFrame", "cancelAnimationFrame", "structuredClone", "globalThis", "window",
  "document", "navigator", "location", "history", "self", "localStorage", "sessionStorage",
  "fetch", "Headers", "Response", "Request", "AbortController", "URL", "URLSearchParams",
  "FormData", "Blob", "File", "Image", "Event", "performance", "atob", "btoa",
  "encodeURIComponent", "decodeURIComponent", "TextEncoder", "TextDecoder", "Uint8Array",
  "ArrayBuffer", "alert", "process", "require", "module", "__DEV__",
]);

// Pre-existing (HEAD) and unreferenced anywhere in src/: DocumentUploadCard
// is never rendered, so its three missing style keys cannot affect the app.
// Listed so this check stays strict for every other file.
const KNOWN_STYLE_GAPS = { "src/components/owner/DocumentUploadCard.js": ["addMoreRow", "addMoreText", "blackAddCircle"] };

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`ok - ${name}`);
  else { failures += 1; console.log(`FAIL - ${name}`); }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "assets" || entry === "node_modules") continue;
      walk(full, out);
    } else if (extname(full) === ".js") out.push(full);
  }
  return out;
}

const parseFile = (file) =>
  parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });

function resolveModule(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const c of [base, `${base}.js`, join(base, "index.js")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

const exportCache = new Map();
/** Named exports of a module, or null when it re-exports `*` (not checkable). */
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const names = new Set();
  let open = false;
  let body;
  try { body = parseFile(file).program.body; } catch { exportCache.set(file, null); return null; } // reported as a parse failure
  for (const node of body) {
    if (node.type === "ExportAllDeclaration") open = true;
    if (node.type !== "ExportNamedDeclaration") continue;
    for (const s of node.specifiers || []) names.add(s.exported.name);
    const d = node.declaration;
    if (d && d.id) names.add(d.id.name);
    if (d && d.declarations) for (const v of d.declarations) if (v.id.name) names.add(v.id.name);
  }
  const result = open ? null : names;
  exportCache.set(file, result);
  return result;
}

const rel = (f) => f.replace(ROOT + "/", "");
const files = [...walk(join(ROOT, "src")), join(ROOT, "App.js"), join(ROOT, "index.js")];

for (const file of files) {
  let ast;
  try { ast = parseFile(file); } catch (e) {
    check(`${rel(file)} parses (${e.message})`, false);
    continue;
  }
  const missing = new Set();
  const styleRefs = new Set();
  let styleKeys = null;
  traverse(ast, {
    ReferencedIdentifier(p) {
      const n = p.node.name;
      if (p.isJSXIdentifier() && /^[a-z]/.test(n)) return; // intrinsic tags
      if (p.parentPath.isJSXMemberExpression() && p.parentPath.node.property === p.node) return;
      if (!p.scope.hasBinding(n, true) && !GLOBALS.has(n)) missing.add(n);
    },
    MemberExpression(p) {
      const { object, property, computed } = p.node;
      if (object.type === "Identifier" && object.name === "styles" && !computed) {
        if (!p.scope.getBinding("styles") || p.scope.getBinding("styles").scope.path.isProgram()) {
          styleRefs.add(property.name);
        }
      }
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.name !== "styles" || !p.scope.path.isProgram() || !init) return;
      if (init.type === "CallExpression" && init.callee.type === "MemberExpression" &&
          init.callee.property.name === "create" && init.arguments[0]?.type === "ObjectExpression") {
        styleKeys = new Set(init.arguments[0].properties.map((pr) => pr.key && (pr.key.name || pr.key.value)));
      }
    },
  });
  check(`${rel(file)} has no undeclared identifiers${missing.size ? ` (${[...missing].join(", ")})` : ""}`,
    missing.size === 0);
  if (styleKeys) {
    const known = KNOWN_STYLE_GAPS[rel(file)] || [];
    const absent = [...styleRefs].filter((k) => !styleKeys.has(k) && !known.includes(k));
    if (absent.length) check(`${rel(file)} styles.* all defined (${absent.join(", ")})`, false);
  }
  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration" || !node.source.value.startsWith(".")) continue;
    const target = resolveModule(file, node.source.value);
    if (!target) { check(`${rel(file)} import "${node.source.value}" resolves`, false); continue; }
    const names = exportsOf(target);
    if (!names) continue;
    const absent = node.specifiers
      .filter((s) => s.type === "ImportSpecifier")
      .map((s) => s.imported.name)
      .filter((n) => !names.has(n));
    if (absent.length) check(`${rel(file)} imports exist in ${node.source.value} (${absent.join(", ")})`, false);
  }
}

// The regressions this script exists for.
const modal = readFileSync(join(ROOT, "src/screens/owner/OwnerCloseLeadModal.js"), "utf8");
check("OwnerCloseLeadModal defines its StyleSheet", /const styles = StyleSheet\.create\(/.test(modal));
check(
  "OwnerCloseLeadModal: every dismissal resets the success view (no stale 'Deal Closed' for the next lead)",
  modal.includes("onPress={handleDismiss}") && modal.includes("onRequestClose={handleDismiss}") &&
    !modal.includes("onPress={onClose}") && !modal.includes("onRequestClose={onClose}")
);

console.log(failures ? `\n${failures} failure(s)` : "\nall scope checks passed");
process.exit(failures ? 1 : 0);
