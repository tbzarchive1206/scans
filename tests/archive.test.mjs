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

test("Magazines contains individual galleries with year metadata", async () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await read("data.js"), context);
  const magazines = context.window.SCANS_DATA.collections.find((collection) => collection.slug === "magazines");
  assert.equal(magazines.galleryCount, magazines.galleries.length);
  assert.ok(magazines.galleryCount > 9);
  assert.equal(magazines.imageCount, magazines.galleries.reduce((sum, gallery) => sum + gallery.imageCount, 0));
  assert.ok(magazines.galleries.every((gallery) => Number.isInteger(gallery.releaseYear)));
  assert.ok(magazines.galleries.every((gallery) => !/^20\d{2}$/.test(gallery.name)));
  assert.ok(magazines.galleries.some((gallery) => gallery.groups.length > 1));
});

test("Magazines exposes year filtering and defaults to newest order", async () => {
  const page = await read("magazines/index.html");
  const gallery = await read("gallery.js");
  assert.match(page, /id="yearFilter"/);
  assert.match(gallery, /sort: isMagazines \? "newest" : "source"/);
  assert.match(gallery, /gallery\.releaseSort/);
  assert.match(gallery, /String\(gallery\.releaseYear\) === state\.year/);
});

test("every page and the Pages artifact include the favicon", async () => {
  const slugs = JSON.parse(await read("scripts/generated-pages.json"));
  const pages = await Promise.all([read("index.html"), ...slugs.map((slug) => read(`${slug}/index.html`))]);
  pages.forEach((page, index) => assert.match(page, new RegExp(`<link rel="icon" type="image/png" href="${index === 0 ? "" : "\\.\\./"}icon\\.png">`)));
  assert.match(await read("scripts/collection-template.html"), /href="\.\.\/icon\.png"/);
  assert.match(await read("scripts/prepare_site.py"), /"icon\.png"/);
});
