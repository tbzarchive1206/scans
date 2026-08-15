import fs from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataPath = new URL("data.js", root);
const source = await fs.readFile(dataPath, "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const archive = context.window.SCANS_DATA;
const collection = archive.collections.find((item) => item.slug === "magazines");
if (!collection) throw new Error("Magazines collection was not found.");

const monthNames = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4], ["may", 5], ["june", 6],
  ["july", 7], ["august", 8], ["september", 9], ["october", 10], ["november", 11], ["december", 12],
]);

function releaseData(name, fallbackYear) {
  const year = Number(name.match(/\b(20\d{2})\b/)?.[1] || fallbackYear);
  let month = Number(name.match(/(?:^|\D)(1[0-2]|0?[1-9])\s*월/)?.[1] || 0);
  if (!month) {
    const lowered = name.toLocaleLowerCase();
    for (const [monthName, monthNumber] of monthNames) {
      if (new RegExp(`\\b${monthName}\\b`).test(lowered)) {
        month = monthNumber;
        break;
      }
    }
  }
  return { releaseYear: year, releaseSort: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01` };
}

if (!collection.galleries.some((gallery) => gallery.releaseYear)) {
  const magazines = [];
  for (const yearGallery of collection.galleries) {
    const fallbackYear = Number(yearGallery.name.match(/\b(20\d{2})\b/)?.[1] || 0);
    const grouped = new Map();
    for (const group of yearGallery.groups) {
      const [magazineName, ...sectionParts] = group.name.split(" / ");
      if (!grouped.has(magazineName)) grouped.set(magazineName, []);
      grouped.get(magazineName).push({ ...group, name: sectionParts.join(" / ") || "MAIN" });
    }
    let position = 0;
    for (const [name, groups] of grouped) {
      position += 1;
      const images = groups.flatMap((group) => group.images);
      const dates = images.map((image) => image.modifiedTime).filter(Boolean).sort();
      magazines.push({
        id: `${yearGallery.id}-magazine-${position}`,
        folderId: yearGallery.folderId,
        name,
        imageCount: images.length,
        coverId: images[0]?.id || "",
        updatedAt: dates.at(-1) || yearGallery.updatedAt || "",
        groups,
        pdfs: [],
        otherFiles: [],
        ...releaseData(name, fallbackYear),
      });
    }
  }
  collection.galleries = magazines;
  collection.galleryCount = magazines.length;
  collection.imageCount = magazines.reduce((sum, gallery) => sum + gallery.imageCount, 0);
}

await fs.writeFile(dataPath, `window.SCANS_DATA=${JSON.stringify(archive)};\n`, "utf8");
console.log(`Magazines now contains ${collection.galleryCount} individual galleries.`);
