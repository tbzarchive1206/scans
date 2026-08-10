(() => {
  "use strict";
  const DATA = window.SCANS_DATA;
  if (!DATA) return;

  const state = { query: "" };
  const $ = (selector) => document.querySelector(selector);
  const driveFolder = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
  const number = (value) => new Intl.NumberFormat("en-US").format(value || 0);
  const date = (value) => value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)).toUpperCase()
    : "—";

  function folderCard(collection, index) {
    const link = document.createElement("a");
    link.className = "folder";
    link.href = `${collection.slug}/index.html`;

    const position = document.createElement("span");
    position.className = "folder-number";
    position.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("strong");
    title.textContent = collection.nameEn;

    const meta = document.createElement("small");
    meta.textContent = `${number(collection.galleryCount)} GALLERIES · ${number(collection.imageCount)} SCANS →`;

    link.append(position, title, meta);
    return link;
  }

  function render() {
    const grid = $("#folderGrid");
    grid.replaceChildren();
    const visible = DATA.collections.filter((collection) =>
      `${collection.name} ${collection.nameEn} ${collection.nameKo}`.toLocaleLowerCase().includes(state.query),
    );
    visible.forEach((collection, index) => grid.append(folderCard(collection, index)));
    $("#visibleCollections").textContent = number(visible.length);
    $("#empty").hidden = visible.length !== 0;
  }

  $("#rootDrive").href = driveFolder(DATA.sourceFolderId);
  $("#collectionCount").textContent = number(DATA.collectionCount);
  $("#scanCount").textContent = number(DATA.imageCount);
  $("#updatedDate").textContent = date(DATA.updatedAt);
  $("#collectionSearch").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    render();
  });
  render();
})();
