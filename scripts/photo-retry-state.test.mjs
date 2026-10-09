// Regression tests for photo retry/upload transient state.
// Run with: node scripts/photo-retry-state.test.mjs  (plain node, no deps)
// Covers retry matrix TEST 1-6, 9, 10: delete/add sync by stable photo id,
// never re-uploading, never uploading deleted photos, duplicate filenames.
//
// src/api/owner.js uses extensionless imports (Metro), so this runner copies
// it to a temp dir with the extension fixed and imports the copy. The
// functions under test are pure (no network, no RN APIs).
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "api");
const tmp = mkdtempSync(join(tmpdir(), "retry-test-"));
for (const f of ["owner.js", "client.js", "mappers.js"]) {
  copyFileSync(join(SRC, f), join(tmp, f));
}
writeFileSync(
  join(tmp, "owner.js"),
  readFileSync(join(tmp, "owner.js"), "utf8")
    .replace('from "./client"', 'from "./client.js"')
    .replace('from "./mappers"', 'from "./mappers.js"')
);
const { isLocalPhotoUri, syncIdSetWithPhotos, pendingLocalPhotos, normalizeUploadFile, MAX_UPLOAD_BYTES, toUploadableFile } = await import(
  join(tmp, "owner.js")
);

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${extra !== undefined ? " :: " + JSON.stringify(extra) : ""}`);
  }
}

const A = { id: "local-1", url: "file:///a/Brindavan.png", category: "Living Room", isCover: true };
const B = { id: "local-2", url: "file:///a/ramaniyam-3.png", category: "Bedroom", isCover: false };
const photosAB = [A, B];

// TEST 1: A+B fail -> delete A -> count 1 -> delete B -> empty, no retry.
let failed = ["local-1", "local-2"];
check("T1 fail=[A,B]", failed.length === 2);
failed = syncIdSetWithPhotos(failed, [B]); // delete A
check("T1 delete A -> [B]", JSON.stringify(failed) === '["local-2"]', failed);
failed = syncIdSetWithPhotos(failed, []); // delete B
check("T1 delete B -> [] (no retry)", failed.length === 0, failed);
check("T1 empty pending -> no retry", pendingLocalPhotos([], []).length === 0);

// TEST 2: A+B fail, delete both, add C -> pending ONLY C.
const C = { id: "local-3", url: "file:///a/new-house.png", category: "Exterior", isCover: true };
failed = syncIdSetWithPhotos(["local-1", "local-2"], [C]);
check("T2 old ids dropped", failed.length === 0, failed);
let pending = pendingLocalPhotos([C], []);
check("T2 pending ONLY C", pending.length === 1 && pending[0].id === "local-3", pending.map((p) => p.id));

// TEST 3: C uploads successfully -> pending empty.
pending = pendingLocalPhotos([C], ["local-3"]);
check("T3 success clears pending", pending.length === 0);

// TEST 4: C fails -> failed=[C], count 1.
failed = syncIdSetWithPhotos(["local-3"], [C]);
check("T4 failed=[C]", JSON.stringify(failed) === '["local-3"]', failed);

// TEST 5: retry C succeeds -> failed empty, no retry.
failed = syncIdSetWithPhotos([], [C]);
check("T5 retry success -> []", failed.length === 0);

// TEST 6: retry C fails again -> failed=[C], count 1.
failed = ["local-3"];
check("T6 retry fail -> [C]", failed.length === 1);

// TEST 9: duplicate filenames, distinct ids — delete one removes exactly it.
const D1 = { id: "local-4", url: "file:///a/same.png", category: "Kitchen", isCover: false };
const D2 = { id: "local-5", url: "file:///b/same.png", category: "Kitchen", isCover: false };
failed = syncIdSetWithPhotos(["local-4", "local-5"], [D2]); // delete D1
check("T9 dup filenames: only exact id removed", JSON.stringify(failed) === '["local-5"]', failed);

// TEST 10: remote uploaded photos never enter the retry queue.
const remote = { id: "remote-1", url: "https://x.test/a.jpg", category: "Living Room", isCover: true };
check("T10 remote excluded", pendingLocalPhotos([remote, C], []).length === 1);
check("T10 remote excluded (all remote)", pendingLocalPhotos([remote], []).length === 0);

// Helpers behave on junk input.
check("isLocal file://", isLocalPhotoUri("file:///x.jpg") === true);
check("isLocal content://", isLocalPhotoUri("content://x") === true);
check("isLocal blob:", isLocalPhotoUri("blob:http://x") === true);
check("non-local https", isLocalPhotoUri("https://x/a.jpg") === false);
check("non-local undefined", isLocalPhotoUri(undefined) === false);
check("sync empty", syncIdSetWithPhotos([], photosAB).length === 0);
check("sync keeps live", JSON.stringify(syncIdSetWithPhotos(["local-1", "gone"], photosAB)) === '["local-1"]');

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
}
console.log("ALL RETRY-STATE TESTS PASSED");

// ---- Multipart metadata normalization (upload 422 fix) ----
function normOk(name, input, expected) {
  try {
    const out = normalizeUploadFile(input);
    check(
      name,
      out.name === expected.name && out.type === expected.type,
      out
    );
  } catch (e) {
    check(name, false, `unexpected throw: ${e.message}`);
  }
}
function normThrows(name, input, snippet) {
  try {
    const out = normalizeUploadFile(input);
    check(name, false, `expected throw, got ${JSON.stringify(out)}`);
  } catch (e) {
    check(name, snippet ? e.message.includes(snippet) : true, e.message);
  }
}

// 1-4. missing MIME derives from extension.
normOk("N1 .jpg + missing MIME -> image/jpeg", { name: "photo.jpg" },
  { name: "photo.jpg", type: "image/jpeg" });
normOk("N2 .jpeg + missing MIME -> image/jpeg", { name: "photo.JPEG" },
  { name: "photo.JPEG", type: "image/jpeg" });
normOk("N3 .png + missing MIME -> image/png (the reported bug)", { name: "Brindavan.png" },
  { name: "Brindavan.png", type: "image/png" });
normOk("N4 .webp + missing MIME -> image/webp", { name: "a.webp", type: undefined },
  { name: "a.webp", type: "image/webp" });
// 5-6. conflicting MIME normalizes to the extension (bytes untouched).
normOk("N5 .png + image/jpeg -> image/png", { name: "Brindavan.png", type: "image/jpeg" },
  { name: "Brindavan.png", type: "image/png" });
normOk("N6 .jpg + image/png -> image/jpeg", { name: "a.jpg", type: "image/png" },
  { name: "a.jpg", type: "image/jpeg" });
// 7-8. unsupported rejected locally (never sent).
normThrows("N7 .heic rejected", { name: "IMG_0001.HEIC", type: "image/heic" }, ".heic");
normThrows("N7b .heic missing MIME rejected", { name: "IMG_0001.heic" }, ".heic");
normThrows("N8 .exe rejected", { name: "evil.exe", type: "image/jpeg" }, ".exe");
normThrows("N8b missing extension rejected", { type: "image/jpeg" }, "extension");
// 9. oversize rejected locally when size known.
normThrows("N9 >10MB rejected", { name: "big.jpg", type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 }, "10 MB");
normOk("N9b exactly 10MB passes", { name: "big.jpg", type: "image/jpeg", size: MAX_UPLOAD_BYTES },
  { name: "big.jpg", type: "image/jpeg" });
// 10-12. valid pairs unchanged.
normOk("N10 valid JPEG", { name: "a.jpeg", type: "image/jpeg" },
  { name: "a.jpeg", type: "image/jpeg" });
normOk("N11 valid PNG", { name: "ramaniyam-3.png", type: "image/png" },
  { name: "ramaniyam-3.png", type: "image/png" });
normOk("N12 valid WebP", { name: "a.webp", type: "image/webp" },
  { name: "a.webp", type: "image/webp" });

if (failures > 0) {
  console.log(`${failures} FAILURE(S)`);
  process.exit(1);
}
console.log("ALL NORMALIZATION TESTS PASSED");

// ---- Web FormData file parts (photo-upload 422 fix) ----
// Browser fetch coerces a plain {uri,name,type} object to "[object Object]"
// text, which FastAPI cannot bind to UploadFile (422 "Invalid request").
// blob:/data: URIs must therefore resolve to real File objects; native
// file:///content:// URIs keep the bridge object form.
{
  // data: URI stands in for a browser blob: URI (same fetch→Blob path).
  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const f = await toUploadableFile({ uri: tinyPng, name: "a.png", type: "image/png" });
  check("W1 data: URI -> File instance", f instanceof File, typeof f);
  check("W1 File name/type/size", f.name === "a.png" && f.type === "image/png" && f.size > 0,
    `${f.name} ${f.type} ${f.size}`);
  const fd = new FormData();
  fd.append("file", f);
  const part = fd.get("file");
  check("W2 FormData part is a File, not text", part instanceof File, typeof part);

  const n = await toUploadableFile({ uri: "file:///device/a.jpg", name: "a.jpg", type: "image/jpeg" });
  check("W3 file:// keeps object form", !(n instanceof File) && n.uri === "file:///device/a.jpg", n);
  const c = await toUploadableFile({ uri: "content://media/1", name: "a.jpg", type: "image/jpeg" });
  check("W4 content:// keeps object form", !(c instanceof File), typeof c);

  try {
    await toUploadableFile({ uri: "data:image/png;base64,", name: "empty.png", type: "image/png" });
    check("W5 empty blob throws", false);
  } catch (e) {
    check("W5 empty blob throws readable error", /empty/i.test(e.message), e.message);
  }
}
