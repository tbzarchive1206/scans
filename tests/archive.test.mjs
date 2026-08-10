import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFile(new URL(file, root), "utf8");

test("interface is English-only", async () => {
  const files = await Promise.all([
    read("index.html"),
    read("landing.js"),
    read("gallery.js"),
    read("scripts/collection-template.html"),
  ]);
  assert.doesNotMatch(files.join("\n"), /langToggle|tbzScansLang|\bko\s*:/u);
});

test("collection picker uses the INSTA layout", async () => {
  const landing = await read("landing.js");
  const styles = await read("styles.css");
  assert.match(landing, /link\.append\(position, title, meta\)/);
  assert.match(styles, /Collection picker follows the INSTA STORIES \/ INSTA POSTS selector/);
  assert.match(styles, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("archive data contains seven collections", async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await read("data.js"), context);
  assert.equal(context.window.SCANS_DATA.collections.length, 7);
  assert.ok(context.window.SCANS_DATA.imageCount > 4_000);
});
