const assets = {
  bedroom: "assets/my-digital-room/bedroom/base/bedroom-master.png?v=20260812-crisp-local-props-v3",
  bedroomProfile:
    "assets/my-digital-room/bedroom/base/bedroom-profile-wall.png?v=20260812-crisp-local-props-v3",
  bedroomComputerOn:
    "assets/my-digital-room/bedroom/base/bedroom-computer-on.png?v=20260812-crisp-local-props-v3",
  bedroomProfileComputerOn:
    "assets/my-digital-room/bedroom/base/bedroom-profile-computer-on.png?v=20260812-crisp-local-props-v3",
  bridge: "assets/my-digital-room/bridge/base/bridge-master.png",
  collection:
    "assets/my-digital-room/collection-vault/base/collection-vault-empty.png",
};

const content = window.RoomData;
const publicSupabase =
  window.SUPABASE_CONFIG?.url &&
  window.SUPABASE_CONFIG?.publishableKey &&
  window.supabase
    ? window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.publishableKey,
      )
    : null;

const sceneImage = document.querySelector("#scene-image");
const sceneHotspots = document.querySelector("#scene-hotspots");
const sceneLabel = document.querySelector("#scene-label");
const toast = document.querySelector("#toast");
const hotspotTooltip = document.querySelector("#hotspot-tooltip");
const ambient = document.querySelector("#ambient-audio");
const volumeSlider = document.querySelector("#volume-slider");
const volumeValue = document.querySelector("#volume-value");
let currentScene = "bedroom";
let toastTimer;
let entryTimer;
let countdownTimer;
let isWallProfileOpen = true;
let isComputerOn = false;
let leoClicks = 0;
let leoClickTimer;
const hudControls = [
  document.querySelector("#map-button"),
  document.querySelector("#mute-button"),
  document.querySelector("#scene-label"),
];
const initialDeviceScale = window.devicePixelRatio || 1;
const collectionShelfSlots = [
  "left:20.4%;top:10.2%;width:13.8%;height:12.3%;",
  "left:20.4%;top:28.4%;width:13.8%;height:12.3%;",
  "left:20.4%;top:46.7%;width:13.8%;height:12.3%;",
  "left:20.4%;top:65.1%;width:13.8%;height:12.3%;",
  "left:67.7%;top:10.2%;width:13.8%;height:12.3%;",
  "left:67.7%;top:28.4%;width:13.8%;height:12.3%;",
  "left:67.7%;top:46.7%;width:13.8%;height:12.3%;",
  "left:67.7%;top:65.1%;width:13.8%;height:12.3%;",
];

function setVolume(percent, persist = false) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  ambient.volume = safePercent / 100;
  volumeSlider.value = String(safePercent);
  volumeValue.textContent = `${safePercent}%`;
  if (persist) localStorage.setItem("digital-room-volume", String(safePercent));
}

function syncHudScale() {
  const compensation =
    initialDeviceScale / (window.devicePixelRatio || initialDeviceScale);
  hudControls.forEach((control) => {
    control.style.zoom = String(compensation);
  });
}

syncHudScale();
window.addEventListener("resize", syncHudScale);

setVolume(localStorage.getItem("digital-room-volume") ?? 22);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

function visitLeo() {
  const lines = [
    "Leo noticed you. He is deciding whether you are familiar.",
    "Tail wag detected. Trust level: improving.",
    "Leo is on nap duty, but he looked up for you.",
  ];
  leoClicks += 1;
  showToast(lines[(leoClicks - 1) % lines.length]);
  clearTimeout(leoClickTimer);
  leoClickTimer = setTimeout(() => { leoClicks = 0; }, 2400);
  if (leoClicks >= 3) {
    clearTimeout(leoClickTimer);
    leoClicks = 0;
    document.querySelector("#leo-trust-level").textContent = "FAMILIAR HUMAN";
    setTimeout(() => openDialog("leo-dialog"), 180);
  }
}

function renderLeoCorner() {
  const intro = content.profile.leoIntro;
  if (intro) document.querySelector(".leo-intro").textContent = intro;
  const grid = document.querySelector("#leo-photo-grid");
  grid.replaceChildren(...(content.profile.leoPhotos ?? []).map((src) => {
    const image = document.createElement("img"); image.src = src; image.alt = "Leo, Eric's Toy Poodle"; return image;
  }));
}

function openDialog(id) {
  document.querySelector(`#${id}`).showModal();
}
function closeDialog(id) {
  document.querySelector(`#${id}`).close();
}
function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function renderProfile() {
  const { profile } = content;
  setText("#profile-name", profile.name);
  setText("#profile-degree", profile.degree);
  setText("#profile-intro", profile.intro);
  setText("#profile-note", profile.note);
  setText("#profile-focus", profile.focus);
  setText("#profile-status", profile.status);
  setText("#profile-location", profile.location);
  setText("#profile-school", profile.school || "McMaster University");
  setText("#profile-gpa", profile.gpa || "Add GPA");
  setText("#profile-timeline", profile.timeline || "Add study period");
  const email = profile.email || "";
  const emailLink = document.querySelector("#profile-email");
  emailLink.textContent = email || "Add email";
  emailLink.href = email ? `mailto:${email}` : "#";
  emailLink.toggleAttribute("data-placeholder-link", !email);
  const profilePhoto = document.querySelector("#profile-photo");
  if (profile.photoUrl) {
    profilePhoto.replaceChildren();
    const image = document.createElement("img");
    image.src = profile.photoUrl;
    image.alt = `${profile.name} profile photo`;
    profilePhoto.append(image);
    profilePhoto.classList.add("has-photo");
  } else {
    profilePhoto.innerHTML = profile.photoLabel.replace("\n", "<br />");
    profilePhoto.classList.remove("has-photo");
  }
  Object.entries(profile.links).forEach(([name, href]) => {
    const link = document.querySelector(`#profile-${name}`);
    if (!link) return;
    link.href = href || "#";
    link.toggleAttribute("data-placeholder-link", !href || href === "#");
    if (href && href !== "#") {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
  });
}
function bedroomSceneSource() {
  if (isComputerOn && isWallProfileOpen) {
    return assets.bedroomProfileComputerOn;
  }
  if (isComputerOn) return assets.bedroomComputerOn;
  return isWallProfileOpen ? assets.bedroomProfile : assets.bedroom;
}

function turnOnComputer() {
  isComputerOn = true;
  sceneImage.src = bedroomSceneSource();
  sceneLabel.textContent = "ERIC_OS · DESKTOP READY";
  renderHotspots();
}

function moveHotspotTooltip(event) {
  if (!hotspotTooltip || !event) return;
  hotspotTooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 235)}px`;
  hotspotTooltip.style.top = `${Math.max(event.clientY - 12, 34)}px`;
}

function showHotspotTooltip(label, event) {
  if (!hotspotTooltip) return;
  hotspotTooltip.textContent = label;
  moveHotspotTooltip(event);
  hotspotTooltip.classList.add("is-visible");
}

function hideHotspotTooltip() {
  hotspotTooltip?.classList.remove("is-visible");
}

function hotspot(label, action, style, options = {}) {
  const button = document.createElement("button");
  button.className = "hotspot";
  button.dataset.label = label;
  button.style.cssText = style;
  button.setAttribute("aria-label", label);
  button.addEventListener("pointerenter", (event) =>
    showHotspotTooltip(label, event),
  );
  button.addEventListener("pointermove", moveHotspotTooltip);
  button.addEventListener("pointerleave", hideHotspotTooltip);
  button.addEventListener("focus", () => {
    const rect = button.getBoundingClientRect();
    showHotspotTooltip(label, {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top,
    });
  });
  button.addEventListener("blur", hideHotspotTooltip);
  button.addEventListener(options.doubleClick ? "dblclick" : "click", action);
  if (options.persistentLabel) button.classList.add("persistent-label");
  return button;
}

function renderHotspots() {
  sceneHotspots.replaceChildren();
  if (currentScene === "bedroom") {
    const profileSwitchPosition = isWallProfileOpen
      ? "left:23%; top:36.1%; width:1.8%; height:3.8%;"
      : "left:25.35%; top:32.3%; width:1.45%; height:3.25%;";
    const profileButton = hotspot(
      isWallProfileOpen ? "SWITCH TO PHOTO WALL" : "SHOW CREW MANIFEST",
      () => {
        isWallProfileOpen = !isWallProfileOpen;
        sceneImage.src = bedroomSceneSource();
        renderHotspots();
      },
      profileSwitchPosition,
      { persistentLabel: true },
    );
    if (isWallProfileOpen) {
      // HITBOX CALIBRATION: left/top move this bounding box; width/height resize it.
      // The four angled corners are defined by .manifest-hotspot in styles.css.
      const manifest = hotspot(
        "VIEW FULL MANIFEST",
        () => openDialog("profile-dialog"),
        "left:10.8%; top:16.8%; width:14.8%; height:24.4%;",
      );
      manifest.classList.add("manifest-hotspot");
      sceneHotspots.append(manifest);
    } else {
      sceneHotspots.append(
        hotspot(
          "PHOTO WALL",
          () => openDialog("photos-dialog"),
          "left:9.5%; top:16.5%; width:16.8%; height:27%;",
        ),
      );
    }
    sceneHotspots.append(profileButton);
    if (isComputerOn) {
      // HITBOX CALIBRATION: screen bounding box; its trapezoid is .computer-hotspot in styles.css.
      const desktopHotspot = hotspot(
        "OPEN DESKTOP",
        () => openDialog("computer-dialog"),
        "left:68.6%; top:42.4%; width:14.3%; height:11.5%;",
      );
      desktopHotspot.classList.add("computer-hotspot");
      sceneHotspots.append(desktopHotspot);
    } else {
      const computerHotspot = hotspot(
        "TURN ON COMPUTER",
        turnOnComputer,
        "left:68.6%; top:42.4%; width:14.3%; height:11.5%;",
      );
      computerHotspot.classList.add("computer-hotspot");
      sceneHotspots.append(computerHotspot);
    }
    sceneHotspots.append(
      hotspot(
        "PICK UP CONTROLLER",
        () => {
          showToast("Picking up the controller…");
          setTimeout(() => openDialog("games-dialog"), 360);
        },
        "left:81.2%; top:53.5%; width:4.8%; height:8.6%;",
      ),
      hotspot(
        "CHANGE MUSIC",
        () => openDialog("music-dialog"),
        "left:85.4%; top:56%; width:14.2%; height:10.5%;",
      ),
      hotspot(
        "LEO",
        visitLeo,
        "left:72.7%; top:81.5%; width:15%; height:14%; clip-path: ellipse(48% 47% at 50% 50%);",
      ),
      // HITBOX CALIBRATION: golden cube bounding box; its polygon is .cube-hotspot in styles.css.
      (() => {
        const cube = hotspot(
          "ENTER COLLECTION VAULT",
          () => setScene("collection"),
          "left:37%; top:27%; width:4%; height:7%;",
          { doubleClick: true },
        );
        cube.classList.add("cube-hotspot");
        return cube;
      })(),
    );
  }
  if (currentScene === "bridge") {
    const communications = hotspot(
      "OPEN COMMUNICATIONS",
      () => openDialog("terminal-dialog"),
      "left:22%; top:30%; width:57%; height:46%;",
    );
    communications.classList.add("bridge-screen-hotspot");
    sceneHotspots.append(communications);
  }
  if (currentScene === "collection") {
    sceneHotspots.append(
      hotspot(
        "RETURN TO ERIC'S ROOM",
        () => setScene("bedroom"),
        "left:1.5%; top:27%; width:11%; height:27%;",
      ),
    );
    (content.collection ?? []).forEach((item) => {
      if (!item.image || !collectionShelfSlots[item.slot - 1]) return;
      const shelfItem = document.createElement("button");
      shelfItem.className = "collection-shelf-item";
      shelfItem.style.cssText = collectionShelfSlots[item.slot - 1];
      shelfItem.setAttribute("aria-label", item.title);
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = "";
      shelfItem.append(image);
      shelfItem.addEventListener("click", () => openCollectionItem(item));
      sceneHotspots.append(shelfItem);
    });
    sceneHotspots.append(
      hotspot(
        "VIEW ALL COLLECTIONS",
        openCollectionAll,
        "left:43%; top:47%; width:15%; height:24%;",
      ),
    );
  }
}

function setScene(scene) {
  currentScene = scene;
  sceneImage.src = scene === "bedroom" ? bedroomSceneSource() : assets[scene];
  sceneImage.alt =
    scene === "bedroom"
      ? "Eric's warm spaceship bedroom"
      : scene === "bridge"
        ? "A spaceship communication bridge"
        : "An empty collection vault";
  sceneLabel.textContent =
    scene === "bedroom"
      ? isComputerOn
        ? "ERIC_OS · DESKTOP READY"
        : "ERIC'S ROOM · CLICK AROUND"
      : scene === "bridge"
        ? "FLIGHT DECK · COMMUNICATIONS ONLINE"
        : "COLLECTION VAULT · DOUBLE-CLICK THE CUBE TO ARRIVE";
  document
    .querySelector("#map-button")
    .classList.toggle("is-hidden", scene === "collection");
  renderHotspots();
}

function enterRoom() {
  if (document.querySelector("#entry").classList.contains("is-hidden")) return;
  clearTimeout(entryTimer);
  clearInterval(countdownTimer);
  const entry = document.querySelector("#entry");
  const room = document.querySelector("#room");
  document.querySelector("#enter-room").disabled = true;
  entry.classList.add("is-launching");
  setTimeout(() => {
    entry.classList.add("is-hidden");
    room.classList.remove("is-hidden");
    room.classList.add("is-arriving");
    setScene("bedroom");
    ambient
      .play()
      .catch(() =>
        showToast("Add your ambient MP3 later — the sound control is ready."),
      );
    setTimeout(() => room.classList.remove("is-arriving"), 650);
  }, 1800);
}

function startAutoEntry() {
  const note = document.querySelector(".entry-note");
  let remaining = 5;
  const updateNote = () => {
    note.textContent = `Auto-entering in ${remaining}s · sound begins after entry.`;
  };
  updateNote();
  countdownTimer = setInterval(() => {
    remaining -= 1;
    updateNote();
  }, 1000);
  entryTimer = setTimeout(enterRoom, 5000);
}

document.querySelector("#enter-room").addEventListener("click", enterRoom);
volumeSlider.addEventListener("input", () =>
  setVolume(volumeSlider.value, true),
);

document
  .querySelector("#map-button")
  .addEventListener("click", () => openDialog("map-dialog"));
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      closeDialog(button.dataset.closeDialog),
    ),
  );
document.querySelectorAll("[data-route]").forEach((button) =>
  button.addEventListener("click", () => {
    closeDialog("map-dialog");
    setScene(button.dataset.route);
  }),
);

document.querySelector("#mute-button").addEventListener("click", () => {
  const button = document.querySelector("#mute-button");
  ambient.muted = !ambient.muted;
  button.textContent = ambient.muted ? "♫ SOUND OFF" : "♫ SOUND ON";
  button.setAttribute("aria-pressed", String(ambient.muted));
  if (!ambient.muted)
    ambient
      .play()
      .catch(() => showToast("Add an MP3 in the future audio settings."));
});

function renderFolders() {
  const grid = document.querySelector("#folder-grid");
  grid.replaceChildren(
    ...content.folders.map((folder) => {
      const button = document.createElement("button");
      button.className = "folder";
      const icon = document.createElement("span");
      icon.textContent = "▰";
      button.append(icon, document.createTextNode(folder.name));
      button.addEventListener("click", () => {
        const detail = document.querySelector("#project-detail");
        detail.replaceChildren();
        const title = document.createElement("h3");
        title.textContent = folder.name;
        const copy = document.createElement("p");
        copy.textContent = folder.summary || folder.detail;
        detail.append(title, copy);
        if (folder.stack?.length) {
          const stack = document.createElement("p");
          stack.className = "project-stack";
          stack.textContent = `STACK · ${folder.stack.join(" · ")}`;
          detail.append(stack);
        }
        if (folder.published) {
          const date = document.createElement("p");
          date.className = "published-date";
          date.textContent = `PUBLISHED · ${folder.published}`;
          detail.append(date);
        }
        const links = document.createElement("div");
        links.className = "project-links";
        [["VIEW LIVE", folder.liveUrl], ["VIEW SOURCE", folder.sourceUrl]].forEach(([label, href]) => {
          if (!href) return;
          const link = document.createElement("a");
          link.href = href; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = `${label} ↗`;
          links.append(link);
        });
        if (links.childElementCount) detail.append(links);
        detail.classList.remove("is-hidden");
      });
      return button;
    }),
  );
}

function renderPhotoGrid() {
  const grid = document.querySelector("#photo-grid");
  grid.innerHTML = "";
  grid.append(
    ...content.photos.map((entry, index) => {
      const card = document.createElement("button");
      card.className = "photo-card";
      card.style.setProperty("--tilt", `${[-6, 4, -3, 7, -5][index % 5]}deg`);
      card.setAttribute("aria-label", entry.alt);
      if (entry.src) card.style.backgroundImage = `url("${entry.src}")`;
      card.addEventListener("click", () => {
        if (!entry.src)
          return showToast("This photo slot is waiting for a snapshot.");
        const detail = document.querySelector("#photo-detail");
        detail.innerHTML = `<img src="${entry.src}" alt="${entry.alt}" />`;
        detail.classList.remove("is-hidden");
      });
      return card;
    }),
  );
}

async function hydratePublicPhotos() {
  if (!publicSupabase) return;
  const { data, error } = await publicSupabase
    .from("photos")
    .select("storage_path, alt_text, sort_order")
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data?.length) return;
  const remotePhotos = data.map((photo) => ({
    src: publicSupabase.storage
      .from("portfolio-assets")
      .getPublicUrl(photo.storage_path).data.publicUrl,
    alt: photo.alt_text,
  }));
  const emptySlots = Array.from(
    { length: Math.max(0, 8 - remotePhotos.length) },
    (_, index) => ({
      src: "",
      alt: `Photo slot ${remotePhotos.length + index + 1}`,
    }),
  );
  content.photos = [...remotePhotos, ...emptySlots];
  renderPhotoGrid();
  renderMobilePortfolio();
}

renderPhotoGrid();
hydratePublicPhotos();

function renderGames() {
  const grid = document.querySelector("#game-grid");
  grid.replaceChildren(
    ...content.games.map((game, index) => {
      const card = document.createElement("button");
      card.className = "game-card";
      if (game.cover)
        card.style.backgroundImage = `linear-gradient(rgba(8,15,23,.28),rgba(8,15,23,.73)), url("${game.cover}")`;
      const label = document.createElement("span");
      label.textContent = `GAME ${String(index + 1).padStart(2, "0")}`;
      card.append(label, document.createTextNode(game.title));
      card.addEventListener("click", () => {
        const detail = document.querySelector("#game-detail");
        detail.replaceChildren();
        const title = document.createElement("h3");
        title.textContent = game.title;
        detail.append(title);
        if (!game.diaryEntries?.length) {
          const empty = document.createElement("p");
          empty.textContent =
            "No diary entry has been published for this game yet.";
          detail.append(empty);
        }
        (game.diaryEntries ?? []).forEach((entry) => {
          const diary = document.createElement("p");
          diary.textContent = entry.body;
          const date = document.createElement("p");
          date.className = "published-date";
          date.textContent = `PUBLISHED · ${entry.published}`;
          detail.append(diary, date);
          entry.media.forEach((src) => {
            const image = document.createElement("img");
            image.src = src;
            image.alt = `${game.title} diary attachment`;
            detail.append(image);
          });
        });
        detail.classList.remove("is-hidden");
      });
      return card;
    }),
  );
}

function trackData(track) {
  return typeof track === "string" ? { title: track, src: "" } : track;
}
function renderTracks() {
  const list = document.querySelector("#track-list");
  list.replaceChildren(
    ...content.tracks.map((rawTrack, index) => {
      const track = trackData(rawTrack);
      const button = document.createElement("button");
      const title = document.createElement("span");
      title.textContent = track.title;
      const number = document.createElement("small");
      number.textContent = `TRACK ${String(index + 1).padStart(2, "0")}`;
      button.append(title, number);
      button.addEventListener("click", () => {
        document
          .querySelectorAll("#track-list button")
          .forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        document.querySelector("#now-playing").textContent =
          `NOW PLAYING · ${track.title}`;
        if (!track.src)
          return showToast(
            "This sample track can be replaced from Mission Control.",
          );
        ambient.src = track.src;
        ambient
          .play()
          .catch(() =>
            showToast("Press play again after interacting with the page."),
          );
      });
      return button;
    }),
  );
}

function renderSignals() {
  const stream = document.querySelector("#signal-stream");
  stream.replaceChildren(
    ...content.signals.map((signal) => {
      const message = document.createElement("span");
      message.className = "signal";
      message.textContent = signal;
      return message;
    }),
  );
}

function renderCollection() {
  const area = document.querySelector("#collection-content");
  if (!content.collection?.length) {
    area.replaceChildren();
    return;
  }
  area.replaceChildren(
    ...content.collection.map((item) => {
      const entry = document.createElement("article");
      const title = document.createElement("strong");
      title.textContent = `SLOT ${item.slot} · ${item.title}`;
      const copy = document.createElement("p");
      copy.textContent = item.description;
      entry.append(title, copy);
      entry.addEventListener("click", () => openCollectionItem(item));
      return entry;
    }),
  );
}

function openCollectionAll() {
  const area = document.querySelector("#collection-content");
  area.replaceChildren();
  if (!content.collection?.length) {
    const empty = document.createElement("p");
    empty.textContent =
      "The shelves are still waiting for their first collectible.";
    area.append(empty);
  } else {
    content.collection.forEach((item) => {
      const entry = document.createElement("article");
      entry.className = "collection-list-item";
      const title = document.createElement("strong");
      title.textContent = `SLOT ${item.slot} · ${item.title}`;
      const copy = document.createElement("p");
      copy.textContent = item.description;
      entry.append(title, copy);
      if (item.image) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.title;
        entry.append(image);
      }
      entry.addEventListener("click", () => openCollectionItem(item));
      area.append(entry);
    });
  }
  openDialog("collection-dialog");
}

function openCollectionItem(item) {
  const area = document.querySelector("#collection-content");
  area.replaceChildren();
  const entry = document.createElement("article");
  entry.className = "collection-item-detail";
  const title = document.createElement("strong");
  title.textContent = `SLOT ${item.slot} · ${item.title}`;
  const copy = document.createElement("p");
  copy.textContent = item.description;
  entry.append(title, copy);
  if (item.image) {
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.title;
    entry.append(image);
  }
  if (item.external_url) {
    const link = document.createElement("a");
    link.href = item.external_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "OPEN LINK ↗";
    entry.append(link);
  }
  area.append(entry);
  openDialog("collection-dialog");
}

function renderMobilePortfolio() {
  const profile = content.profile;
  const set = (id, value) => { const el = document.querySelector(id); if (el) el.textContent = value || ""; };
  const link = (id, href, label) => { const el = document.querySelector(id); if (!el) return; const active = href && href !== "#"; el.hidden = !active; el.href = active ? href : "#"; el.textContent = label; if (active && !href.startsWith("mailto:")) { el.target = "_blank"; el.rel = "noreferrer"; } };
  set("#mobile-name", profile.name); set("#mobile-degree", profile.degree); set("#mobile-focus", profile.focus); set("#mobile-intro", profile.intro); set("#mobile-note", profile.note); set("#mobile-school", profile.school); set("#mobile-gpa", profile.gpa); set("#mobile-timeline", profile.timeline); set("#mobile-location", profile.location); set("#mobile-status", profile.status); set("#mobile-leo-intro", profile.leoIntro);
  link("#mobile-resume", profile.links?.resume, "RESUME"); link("#mobile-github", profile.links?.github, "GITHUB"); link("#mobile-linkedin", profile.links?.linkedin, "LINKEDIN"); link("#mobile-email", profile.email ? `mailto:${profile.email}` : "", profile.email || "");
  const portrait = document.querySelector("#mobile-profile-photo"); portrait.replaceChildren(); if (profile.photoUrl) { const image=document.createElement("img"); image.src=profile.photoUrl; image.alt=`${profile.name} profile photo`; portrait.append(image); } else portrait.textContent="YOUR PHOTO";
  const projects=document.querySelector("#mobile-projects"); projects.replaceChildren(...content.folders.map((folder)=>{ const card=document.createElement("details"); card.className="mobile-project"; const summary=document.createElement("summary"); const parts=String(folder.name).split(" - "); const category=document.createElement("span"); category.className="mobile-category"; category.textContent=parts.length>1?parts.shift():"PROJECT"; summary.append(category,document.createTextNode(parts.join(" - ")||folder.name)); const copy=document.createElement("p"); copy.textContent=folder.summary||folder.detail||"Project details coming soon."; card.append(summary,copy); if(folder.stack?.length){const stack=document.createElement("p"); stack.textContent=`Stack: ${folder.stack.join(", ")}`; card.append(stack);} const links=document.createElement("div"); links.className="mobile-project-links"; [["VIEW LIVE",folder.liveUrl],["VIEW SOURCE",folder.sourceUrl]].forEach(([label,href])=>{if(!href)return;const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noreferrer";a.textContent=label;links.append(a);}); if(links.childElementCount)card.append(links); return card;}));
  const photos=document.querySelector("#mobile-photos"); const publicPhotos=content.photos.filter((photo)=>photo.src); photos.replaceChildren(...publicPhotos.map((photo)=>{const image=document.createElement("img");image.src=photo.src;image.alt=photo.alt||"Portfolio photo";image.loading="lazy";return image;})); if(!publicPhotos.length) photos.innerHTML='<p class="mobile-empty">Photo wall is being developed.</p>';
  const games=document.querySelector("#mobile-games"); games.replaceChildren(...content.games.map((game)=>{const card=document.createElement("details");card.className="mobile-game";const summary=document.createElement("summary");summary.textContent=game.title;card.append(summary);if(game.cover){const image=document.createElement("img");image.className="mobile-game-cover";image.src=game.cover;image.alt=`${game.title} cover`;card.append(image);}const entries=game.diaryEntries??(game.diary?[{body:game.diary,published:game.published,media:[]}]:[]);entries.forEach((entry)=>{const body=document.createElement("p");body.textContent=entry.body;const date=document.createElement("p");date.className="mobile-muted";date.textContent=entry.published||"Undated";card.append(body,date);if(entry.media?.length){const media=document.createElement("div");media.className="mobile-game-media";entry.media.forEach((src)=>{const image=document.createElement("img");image.src=src;image.alt=`${game.title} diary image`;image.loading="lazy";media.append(image);});card.append(media);}});return card;}));
  const signals=document.querySelector("#mobile-signals");signals.replaceChildren(...content.signals.map((signal)=>{const p=document.createElement("p");p.textContent=signal;return p;}));
  const leo=document.querySelector("#mobile-leo-photos");leo.replaceChildren(...(profile.leoPhotos??[]).map((src)=>{const image=document.createElement("img");image.src=src;image.alt="Leo, Eric's Toy Poodle";image.loading="lazy";return image;}));
}
async function hydratePublicContent() {
  if (!publicSupabase) return;
  const [
    settingsResult,
    projectsResult,
    musicResult,
    gamesResult,
    messagesResult,
    collectionResult,
  ] = await Promise.all([
    publicSupabase
      .from("site_settings")
      .select("profile")
      .order("updated_at", { ascending: false })
      .limit(1),
    publicSupabase
      .from("projects")
      .select(
        "category, title, summary, stack, live_url, source_url, published_at",
      )
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("music_tracks")
      .select("title, storage_path")
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("game_entries")
      .select("id, title, cover_path")
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    publicSupabase
      .from("terminal_messages")
      .select("body")
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
    publicSupabase
      .from("collection_items")
      .select("slot, title, description, storage_path, item_date, external_url")
      .eq("is_public", true)
      .order("slot", { ascending: true }),
  ]);
  if (settingsResult.data?.[0]?.profile) {
    Object.assign(content.profile, settingsResult.data[0].profile);
    renderProfile();
    renderLeoCorner();
  }
  if (projectsResult.data?.length)
    content.folders = projectsResult.data.map((project) => ({
      name: `${project.category} · ${project.title}`,
      summary: project.summary,
      stack: project.stack ?? [],
      liveUrl: project.live_url,
      sourceUrl: project.source_url,
      published: project.published_at ? new Date(project.published_at).toLocaleDateString("en-CA") : "",
    }));
  if (musicResult.data?.length) {
    content.tracks = musicResult.data.map((track) => ({
      title: track.title,
      src: publicSupabase.storage
        .from("portfolio-assets")
        .getPublicUrl(track.storage_path).data.publicUrl,
    }));
    ambient.src = trackData(content.tracks[0]).src;
  }
  if (gamesResult.data?.length) {
    const gameIds = gamesResult.data.map((game) => game.id);
    const [{ data: diaryData }, { data: mediaData }] = await Promise.all([
      publicSupabase
        .from("game_diary_entries")
        .select("id, game_entry_id, body, published_at")
        .in("game_entry_id", gameIds)
        .order("published_at", { ascending: false }),
      publicSupabase
        .from("game_entry_media")
        .select("game_entry_id, diary_entry_id, storage_path")
        .in("game_entry_id", gameIds)
        .order("sort_order", { ascending: true }),
    ]);
    const mediaByDiary = new Map();
    (mediaData ?? []).forEach((item) => {
      if (!item.diary_entry_id) return;
      const items = mediaByDiary.get(item.diary_entry_id) ?? [];
      items.push(
        publicSupabase.storage
          .from("portfolio-assets")
          .getPublicUrl(item.storage_path).data.publicUrl,
      );
      mediaByDiary.set(item.diary_entry_id, items);
    });
    const diaryByGame = new Map();
    (diaryData ?? []).forEach((entry) => {
      const entries = diaryByGame.get(entry.game_entry_id) ?? [];
      entries.push({
        body: entry.body,
        published: entry.published_at
          ? new Date(entry.published_at).toLocaleDateString("en-CA")
          : "Undated",
        media: mediaByDiary.get(entry.id) ?? [],
      });
      diaryByGame.set(entry.game_entry_id, entries);
    });
    content.games = gamesResult.data.map((game) => ({
      title: game.title,
      cover: game.cover_path
        ? publicSupabase.storage
            .from("portfolio-assets")
            .getPublicUrl(game.cover_path).data.publicUrl
        : "",
      diaryEntries: diaryByGame.get(game.id) ?? [],
    }));
  }
  if (messagesResult.data?.length)
    content.signals = messagesResult.data.map((message) => message.body);
  if (collectionResult.data?.length)
    content.collection = collectionResult.data.map((item) => ({
      ...item,
      image: item.storage_path
        ? publicSupabase.storage
            .from("portfolio-assets")
            .getPublicUrl(item.storage_path).data.publicUrl
        : "",
    }));
  renderFolders();
  renderTracks();
  renderGames();
  renderSignals();
  renderCollection();
  if (currentScene === "collection") renderHotspots();
  renderMobilePortfolio();
}


function recordVisit() {
  if (!publicSupabase) return;

  // Count one anonymous visit per browser each calendar day. This prevents a
  // refresh from inflating the metric and does not use fingerprinting.
  const dateKey = new Date().toISOString().slice(0, 10);
  const storageKey = "digital-room-last-visit";
  try {
    if (localStorage.getItem(storageKey) === dateKey) return;
  } catch {
    // Privacy-restricted browsers may still record a visit for this session.
  }

  publicSupabase
    .from("page_visits")
    .insert({ scene: "bedroom", referrer: document.referrer || null })
    .then(({ error }) => {
      if (error) {
        console.warn("Visit tracking unavailable", error.message);
        return;
      }
      try {
        localStorage.setItem(storageKey, dateKey);
      } catch {
        // The database insert succeeded; local persistence is optional.
      }
    });
}

function warmSceneAssets() {
  [
    assets.bedroomProfile,
    assets.bedroomComputerOn,
    assets.bedroomProfileComputerOn,
    assets.bridge,
    assets.collection,
  ].forEach((url) => {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  });
}

function scheduleSceneWarmup() {
  const warmup = () => warmSceneAssets();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmup, { timeout: 5000 });
  } else {
    window.setTimeout(warmup, 1800);
  }
}
renderFolders();
renderTracks();
renderGames();
renderSignals();
renderCollection();
renderLeoCorner();
renderMobilePortfolio();
hydratePublicContent();
recordVisit();
scheduleSceneWarmup();

document.querySelectorAll(".profile-links a").forEach((link) =>
  link.addEventListener("click", (event) => {
    if (link.getAttribute("href") && link.getAttribute("href") !== "#") return;
    event.preventDefault();
    showToast("This link has not been added yet.");
  }),
);

setScene("bedroom");
renderProfile();
startAutoEntry();
