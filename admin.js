const adminData = window.RoomData;
const loginScreen = document.querySelector("#admin-login");
const dashboard = document.querySelector("#admin-dashboard");
const panelTitle = document.querySelector("#panel-title");
const supabaseConfig = window.SUPABASE_CONFIG;
const supabaseClient = supabaseConfig?.url && supabaseConfig?.publishableKey && window.supabase
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;

function updateConnectionUI() {
  if (!supabaseClient) return;
  document.querySelector("#login-mode-note").textContent = "Secure Supabase sign-in is active.";
  document.querySelector("#admin-mode-status").textContent = "SUPABASE CONNECTED";
  document.querySelector("#connection-eyebrow").textContent = "LIVE CONNECTION";
  document.querySelector("#connection-title").textContent = "Supabase is connected.";
  document.querySelector("#connection-copy").textContent = "Authenticated edits, uploads, and anonymous visit activity are now recorded in your Supabase project.";
  document.querySelectorAll(".upload-note").forEach((note) => note.textContent = "Files are uploaded to Supabase Storage and saved to the database.");
  document.querySelector("#photo-upload-label").textContent = "UPLOAD PHOTO TO SUPABASE";
  document.querySelector("#music-upload-label").textContent = "UPLOAD MP3 TO SUPABASE";
  document.querySelector("#resume-upload-label").textContent = "UPLOAD RÉSUMÉ TO SUPABASE";
  document.querySelector("#resume-upload-note").textContent = "Upload a PDF to update the public résumé download button.";
  document.querySelector("#profile-photo-upload-label").textContent = "UPLOAD PROFILE PHOTO TO SUPABASE";
  document.querySelector("#profile-photo-upload-note").textContent = "Your portrait will replace the public profile placeholder.";
  const profileSaveButton = document.querySelector('#profile-form button[type="submit"]');
  if (profileSaveButton) profileSaveButton.textContent = "SAVE TO SUPABASE";
}

function row(title, meta) {
  const element = document.createElement("div");
  element.className = "content-row";
  element.innerHTML = `<span>${title}</span><small>${meta}</small>`;
  return element;
}

function refreshProfileForm() {
  document.querySelectorAll("[data-profile-key]").forEach((input) => {
    input.value = adminData.profile[input.dataset.profileKey] ?? "";
  });
  document.querySelectorAll("[data-profile-link]").forEach((input) => {
    input.value = adminData.profile.links?.[input.dataset.profileLink] ?? "";
  });
}

function publicAssetUrl(path) {
  return supabaseClient.storage.from("portfolio-assets").getPublicUrl(path).data.publicUrl;
}

function renderPhotoEditor() {
  const photoEditor = document.querySelector("#photo-editor");
  photoEditor.innerHTML = "";
  adminData.photos.forEach((item) => {
    const itemRow = row(item.alt, item.src ? "image linked" : "empty slot");
    if (item.id) {
      const remove = document.createElement("button");
      remove.className = "remove-action";
      remove.type = "button";
      remove.textContent = "REMOVE";
      remove.addEventListener("click", () => deletePhoto(item));
      itemRow.append(remove);
    }
    photoEditor.append(itemRow);
  });
  document.querySelector("#photo-count").textContent = String(adminData.photos.length).padStart(2, "0");
}

async function deletePhoto(photo) {
  if (!supabaseClient || !confirm(`Remove ${photo.alt}?`)) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) { alert("Please sign in again before removing a photo."); return; }
  const { error: databaseError } = await supabaseClient.from("photos").delete().eq("id", photo.id).eq("owner_id", authData.user.id);
  if (databaseError) { alert(`Could not remove photo: ${databaseError.message}`); return; }
  if (photo.storagePath) {
    const { error: storageError } = await supabaseClient.storage.from("portfolio-assets").remove([photo.storagePath]);
    if (storageError) console.warn("Photo record was removed, but Storage cleanup failed:", storageError.message);
  }
  await hydratePhotosFromSupabase();
}

async function hydratePhotosFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;
  const { data, error } = await supabaseClient
    .from("photos")
    .select("id, storage_path, alt_text, sort_order")
    .eq("owner_id", authData.user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) { console.warn("Could not load saved photos", error.message); return; }
  const uploaded = (data ?? []).map((photo) => ({ src: publicAssetUrl(photo.storage_path), alt: photo.alt_text, id: photo.id, storagePath: photo.storage_path }));
  const emptySlots = Array.from({ length: Math.max(0, 8 - uploaded.length) }, (_, index) => ({ src: "", alt: `Photo slot ${String(uploaded.length + index + 1).padStart(2, "0")}` }));
  adminData.photos = [...uploaded, ...emptySlots];
  renderPhotoEditor();
}

function renderMusicEditor(tracks = []) {
  const editor = document.querySelector("#music-editor");
  editor.innerHTML = "";
  if (!tracks.length) editor.append(row("No uploaded tracks yet", "Upload an MP3 to build the turntable playlist."));
  tracks.forEach((track, index) => {
    const trackRow = row(track.title, `track ${String(index + 1).padStart(2, "0")}`);
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE";
    remove.addEventListener("click", () => deleteMusicTrack(track));
    trackRow.append(remove); editor.append(trackRow);
  });
}

async function hydrateMusicFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;
  const { data, error } = await supabaseClient.from("music_tracks").select("id, title, storage_path, sort_order").eq("owner_id", authData.user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) { console.warn("Could not load saved tracks", error.message); return; }
  renderMusicEditor(data ?? []);
}

async function deleteMusicTrack(track) {
  if (!confirm(`Remove ${track.title}?`)) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return alert("Please sign in again before removing a track.");
  const { error: databaseError } = await supabaseClient.from("music_tracks").delete().eq("id", track.id).eq("owner_id", authData.user.id);
  if (databaseError) return alert(`Could not remove track: ${databaseError.message}`);
  const { error: storageError } = await supabaseClient.storage.from("portfolio-assets").remove([track.storage_path]);
  if (storageError) console.warn("Track record was removed, but Storage cleanup failed:", storageError.message);
  await hydrateMusicFromSupabase();
}

let selectedGameFolder = null;
function renderGameEditor(games = []) {
  const editor = document.querySelector("#game-editor"); editor.innerHTML = "";
  if (!games.length) editor.append(row("No game folders yet", "Create a game folder, then add diary entries inside it."));
  games.forEach((game) => {
    const gameRow = row(game.title, game.cover_path ? "cover saved" : "no cover");
    const open = document.createElement("button"); open.type = "button"; open.className = "remove-action"; open.textContent = "OPEN"; open.addEventListener("click", () => openGameFolder(game));
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "remove-action"; edit.textContent = "EDIT"; edit.addEventListener("click", () => editGame(game));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE"; remove.addEventListener("click", () => deleteGame(game));
    gameRow.append(open, edit, remove); editor.append(gameRow);
  });
}

function resetGameForm() {
  document.querySelector("#game-form").reset(); document.querySelector("#game-id").value = "";
  document.querySelector("#game-cover-note").textContent = "Optional: a cover image for the game shelf.";
  document.querySelector("#game-save").textContent = "CREATE GAME FOLDER"; document.querySelector("#game-cancel").classList.add("is-hidden");
}

function editGame(game) {
  document.querySelector("#game-id").value = game.id;
  document.querySelector("#game-title").value = game.title;
  document.querySelector("#game-cover-note").textContent = game.cover_path ? "Current cover saved. Choose another file only to replace it." : "Optional: a cover image for the game shelf.";
  document.querySelector("#game-save").textContent = "SAVE GAME FOLDER"; document.querySelector("#game-cancel").classList.remove("is-hidden");
  document.querySelector("#game-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function hydrateGamesFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
  const { data, error } = await supabaseClient.from("game_entries").select("id, title, cover_path").eq("owner_id", authData.user.id).order("created_at", { ascending: false });
  if (error) return console.warn("Could not load game diary", error.message);
  renderGameEditor(data ?? []);
}

async function uploadGameImage(file, user) {
  const path = `${user.id}/game-covers/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabaseClient.storage.from("portfolio-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function deleteGame(game) {
  if (!confirm(`Remove ${game.title}?`)) return;
  const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
  const { data: media } = await supabaseClient.from("game_entry_media").select("storage_path").eq("game_entry_id", game.id).eq("owner_id", authData.user.id);
  const { error } = await supabaseClient.from("game_entries").delete().eq("id", game.id).eq("owner_id", authData.user.id);
  if (error) return alert(`Could not remove game entry: ${error.message}`);
  const paths = [game.cover_path, ...(media ?? []).map((item) => item.storage_path)].filter(Boolean);
  if (paths.length) await supabaseClient.storage.from("portfolio-assets").remove(paths);
  await hydrateGamesFromSupabase();
}

async function openGameFolder(game) {
  selectedGameFolder = game;
  document.querySelector("#diary-editor-card").classList.remove("is-hidden");
  document.querySelector("#diary-game-title").textContent = game.title;
  await hydrateDiaryEntries();
  document.querySelector("#diary-editor-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDiaryEditor(entries = []) {
  const editor = document.querySelector("#diary-editor"); editor.innerHTML = "";
  if (!entries.length) editor.append(row("No diary entries yet", "Write the first note for this game."));
  entries.forEach((entry) => {
    const item = row(entry.body.slice(0, 70) || "Untitled note", entry.published_at ?? "Undated");
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE"; remove.addEventListener("click", () => deleteDiaryEntry(entry));
    item.append(remove); editor.append(item);
  });
}

async function hydrateDiaryEntries() {
  if (!selectedGameFolder) return;
  const { data, error } = await supabaseClient.from("game_diary_entries").select("id, body, published_at").eq("game_entry_id", selectedGameFolder.id).order("published_at", { ascending: false });
  if (error) return console.warn("Could not load diary entries", error.message);
  renderDiaryEditor(data ?? []);
}

function resetDiaryForm() { document.querySelector("#diary-form").reset(); document.querySelector("#diary-id").value = ""; document.querySelector("#diary-save").textContent = "ADD DIARY ENTRY"; document.querySelector("#diary-cancel").classList.add("is-hidden"); }

async function deleteDiaryEntry(entry) {
  if (!confirm("Remove this diary entry?")) return;
  const { error } = await supabaseClient.from("game_diary_entries").delete().eq("id", entry.id);
  if (error) return alert(`Could not remove diary entry: ${error.message}`);
  await hydrateDiaryEntries();
}

let collectionItems = [];
function renderCollectionSlots() {
  const slots = document.querySelector("#vault-slots"); slots.innerHTML = "";
  for (let slot = 1; slot <= 8; slot += 1) {
    const item = collectionItems.find((entry) => entry.slot === slot);
    const button = document.createElement("button"); button.type = "button";
    button.textContent = item ? `SLOT ${slot}\n${item.title}` : `SLOT ${slot}\nEMPTY`;
    button.classList.toggle("is-filled", Boolean(item));
    button.addEventListener("click", () => openCollectionSlot(slot)); slots.append(button);
  }
}

function openCollectionSlot(slot) {
  const item = collectionItems.find((entry) => entry.slot === slot);
  document.querySelector("#collection-editor-card").classList.remove("is-hidden");
  document.querySelector("#collection-slot-title").textContent = `Slot ${slot}`;
  document.querySelector("#collection-slot").value = slot;
  document.querySelector("#collection-title").value = item?.title ?? "";
  document.querySelector("#collection-description").value = item?.description ?? "";
  document.querySelector("#collection-date").value = item?.item_date ?? "";
  document.querySelector("#collection-url").value = item?.external_url ?? "";
  document.querySelector("#collection-image").value = "";
  document.querySelector("#collection-image-note").textContent = item?.storage_path ? "Current image saved. Choose another file only to replace it." : "Optional: image for this display item.";
  document.querySelector("#collection-remove").classList.toggle("is-hidden", !item);
  document.querySelector("#collection-editor-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function hydrateCollectionFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
  const { data, error } = await supabaseClient.from("collection_items").select("id, slot, title, description, storage_path, item_date, external_url").eq("owner_id", authData.user.id).order("slot", { ascending: true });
  if (error) return console.warn("Could not load collection items", error.message);
  collectionItems = data ?? []; renderCollectionSlots();
}

let messageItems = (adminData.signals ?? []).map((body, index) => ({ id: `preview-${index}`, body, sort_order: index }));
function renderMessageEditor(messages = messageItems) {
  const editor = document.querySelector("#message-editor");
  editor.innerHTML = "";
  if (!messages.length) editor.append(row("No saved signals yet", "Add the first broadcast above."));
  messages.forEach((message, index) => {
    const item = row(message.body, `signal ${String(index + 1).padStart(2, "0")} · order ${message.sort_order}`);
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "remove-action"; edit.textContent = "EDIT";
    edit.addEventListener("click", () => editMessage(message));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE";
    remove.addEventListener("click", () => deleteMessage(message));
    item.append(edit, remove); editor.append(item);
  });
}

function resetMessageForm() {
  document.querySelector("#message-form").reset();
  document.querySelector("#message-id").value = "";
  document.querySelector("#message-sort").value = String(messageItems.length);
  document.querySelector("#message-save").textContent = "ADD SIGNAL";
  document.querySelector("#message-cancel").classList.add("is-hidden");
}

function editMessage(message) {
  document.querySelector("#message-id").value = message.id;
  document.querySelector("#message-body").value = message.body;
  document.querySelector("#message-sort").value = message.sort_order;
  document.querySelector("#message-save").textContent = "SAVE SIGNAL";
  document.querySelector("#message-cancel").classList.remove("is-hidden");
  document.querySelector("#message-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function hydrateMessagesFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
  const { data, error } = await supabaseClient.from("terminal_messages").select("id, body, sort_order").eq("owner_id", authData.user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) return console.warn("Could not load communications", error.message);
  messageItems = data ?? [];
  renderMessageEditor();
  resetMessageForm();
}

async function deleteMessage(message) {
  if (!confirm("Remove this signal from the public terminal?")) return;
  const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
  const { error } = await supabaseClient.from("terminal_messages").delete().eq("id", message.id).eq("owner_id", authData.user.id);
  if (error) return alert(`Could not remove signal: ${error.message}`);
  await hydrateMessagesFromSupabase();
}

function bindMessageForm() {
  document.querySelector("#message-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) return alert("Connect Supabase before saving communications.");
    const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
    const id = document.querySelector("#message-id").value;
    if (!id && messageItems.length >= 6) return alert("The public terminal is limited to 6 signals. Edit or remove an existing signal first.");
    const save = document.querySelector("#message-save"); save.disabled = true; save.textContent = "SAVING…";
    const payload = { owner_id: authData.user.id, body: document.querySelector("#message-body").value.trim(), sort_order: Number(document.querySelector("#message-sort").value) || 0, is_public: true };
    const request = id ? supabaseClient.from("terminal_messages").update(payload).eq("id", id).eq("owner_id", authData.user.id) : supabaseClient.from("terminal_messages").insert(payload);
    const { error } = await request;
    save.disabled = false;
    if (error) { save.textContent = id ? "SAVE SIGNAL" : "ADD SIGNAL"; return alert(`Could not save signal: ${error.message}`); }
    await hydrateMessagesFromSupabase();
  });
  document.querySelector("#message-cancel").addEventListener("click", resetMessageForm);
}

function bindCollectionForm() {
  document.querySelector("#collection-form").addEventListener("submit", async (event) => {
    event.preventDefault(); if (!supabaseClient) return alert("Connect Supabase before saving this slot.");
    const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
    const slot = Number(document.querySelector("#collection-slot").value); const current = collectionItems.find((item) => item.slot === slot);
    const save = document.querySelector("#collection-save"); save.disabled = true; save.textContent = "SAVING…";
    try {
      const payload = { owner_id: authData.user.id, slot, title: document.querySelector("#collection-title").value.trim(), description: document.querySelector("#collection-description").value.trim(), item_date: document.querySelector("#collection-date").value || null, external_url: document.querySelector("#collection-url").value.trim() || null, is_public: true };
      const image = document.querySelector("#collection-image").files?.[0];
      if (image) payload.storage_path = await uploadGameImage(image, authData.user);
      const { error } = await supabaseClient.from("collection_items").upsert(payload, { onConflict: "owner_id,slot" });
      if (error) throw error;
      await hydrateCollectionFromSupabase(); openCollectionSlot(slot);
    } catch (error) { alert(`Could not save collection slot: ${error.message}`); } finally { save.disabled = false; save.textContent = "SAVE SLOT"; }
  });
  document.querySelector("#collection-remove").addEventListener("click", async () => {
    const slot = Number(document.querySelector("#collection-slot").value); const current = collectionItems.find((item) => item.slot === slot);
    if (!current || !confirm(`Clear Slot ${slot}?`)) return;
    const { error } = await supabaseClient.from("collection_items").delete().eq("id", current.id);
    if (error) return alert(`Could not clear slot: ${error.message}`);
    if (current.storage_path) await supabaseClient.storage.from("portfolio-assets").remove([current.storage_path]);
    await hydrateCollectionFromSupabase(); document.querySelector("#collection-editor-card").classList.add("is-hidden");
  });
}

function bindGameForm() {
  const form = document.querySelector("#game-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); if (!supabaseClient) return alert("Connect Supabase before saving a game folder.");
    const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return alert("Please sign in again before saving.");
    const id = document.querySelector("#game-id").value; const coverFile = document.querySelector("#game-cover").files?.[0];
    const save = document.querySelector("#game-save"); save.disabled = true; save.textContent = "SAVING…";
    try {
      const payload = { owner_id: authData.user.id, title: document.querySelector("#game-title").value.trim(), diary: "", is_public: true, updated_at: new Date().toISOString() };
      if (coverFile) payload.cover_path = await uploadGameImage(coverFile, authData.user);
      const query = id ? supabaseClient.from("game_entries").update(payload).eq("id", id).eq("owner_id", authData.user.id) : supabaseClient.from("game_entries").insert(payload);
      const { error } = await query; if (error) throw error;
      resetGameForm(); await hydrateGamesFromSupabase();
    } catch (error) { alert(`Could not save game folder: ${error.message}`); save.textContent = id ? "SAVE GAME FOLDER" : "CREATE GAME FOLDER"; }
    finally { save.disabled = false; }
  });
  document.querySelector("#game-cancel").addEventListener("click", resetGameForm);
  document.querySelector("#diary-form").addEventListener("submit", async (event) => {
    event.preventDefault(); if (!selectedGameFolder) return;
    const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) return;
    const save = document.querySelector("#diary-save"); save.disabled = true; save.textContent = "SAVING…";
    try {
      const { data: entry, error } = await supabaseClient.from("game_diary_entries").insert({ owner_id: authData.user.id, game_entry_id: selectedGameFolder.id, body: document.querySelector("#diary-body").value.trim(), published_at: document.querySelector("#diary-date").value || null }).select("id").single();
      if (error) throw error;
      for (const [index, file] of [...document.querySelector("#diary-media").files].entries()) {
        const storagePath = await uploadGameImage(file, authData.user);
        const { error: mediaError } = await supabaseClient.from("game_entry_media").insert({ owner_id: authData.user.id, game_entry_id: selectedGameFolder.id, diary_entry_id: entry.id, storage_path: storagePath, sort_order: index });
        if (mediaError) throw mediaError;
      }
      resetDiaryForm(); await hydrateDiaryEntries();
    } catch (error) { alert(`Could not save diary entry: ${error.message}`); } finally { save.disabled = false; }
  });
  document.querySelector("#diary-cancel").addEventListener("click", resetDiaryForm);
}

function renderProjectEditor(projects = []) {
  const editor = document.querySelector("#project-editor");
  editor.innerHTML = "";
  if (!projects.length) { editor.append(row("No saved projects yet", "Use the form above to add your first one.")); }
  projects.forEach((project) => {
    const projectRow = row(`${project.category} · ${project.title}`, project.summary || "No summary");
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "remove-action"; edit.textContent = "EDIT";
    edit.addEventListener("click", () => editProject(project));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE";
    remove.addEventListener("click", () => deleteProject(project));
    projectRow.append(edit, remove); editor.append(projectRow);
  });
  document.querySelector("#project-count").textContent = String(projects.length).padStart(2, "0");
}

function resetProjectForm() {
  document.querySelector("#project-form").reset();
  document.querySelector("#project-id").value = "";
  document.querySelector("#project-save").textContent = "ADD PROJECT";
  document.querySelector("#project-cancel").classList.add("is-hidden");
}

function editProject(project) {
  document.querySelector("#project-id").value = project.id;
  document.querySelector("#project-category").value = project.category;
  document.querySelector("#project-title").value = project.title;
  document.querySelector("#project-summary").value = project.summary;
  document.querySelector("#project-stack").value = (project.stack ?? []).join(", ");
  document.querySelector("#project-live-url").value = project.live_url ?? "";
  document.querySelector("#project-source-url").value = project.source_url ?? "";
  document.querySelector("#project-save").textContent = "SAVE PROJECT";
  document.querySelector("#project-cancel").classList.remove("is-hidden");
  document.querySelector("#project-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function hydrateProjectsFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;
  const { data, error } = await supabaseClient.from("projects").select("id, category, title, summary, stack, live_url, source_url, sort_order").eq("owner_id", authData.user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) { console.warn("Could not load saved projects", error.message); return; }
  renderProjectEditor(data ?? []);
}

async function deleteProject(project) {
  if (!confirm(`Remove ${project.title}?`)) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return alert("Please sign in again before removing a project.");
  const { error } = await supabaseClient.from("projects").delete().eq("id", project.id).eq("owner_id", authData.user.id);
  if (error) return alert(`Could not remove project: ${error.message}`);
  await hydrateProjectsFromSupabase();
}

function bindProjectForm() {
  const form = document.querySelector("#project-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) return alert("Connect Supabase before saving a project.");
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData.user) return alert("Please sign in again before saving.");
    const id = document.querySelector("#project-id").value;
    const payload = {
      owner_id: authData.user.id,
      category: document.querySelector("#project-category").value,
      title: document.querySelector("#project-title").value.trim(),
      summary: document.querySelector("#project-summary").value.trim(),
      stack: document.querySelector("#project-stack").value.split(",").map((item) => item.trim()).filter(Boolean),
      live_url: document.querySelector("#project-live-url").value.trim() || null,
      source_url: document.querySelector("#project-source-url").value.trim() || null,
      is_public: true,
    };
    const save = document.querySelector("#project-save"); save.disabled = true; save.textContent = "SAVING…";
    const request = id ? supabaseClient.from("projects").update(payload).eq("id", id).eq("owner_id", authData.user.id) : supabaseClient.from("projects").insert(payload);
    const { error } = await request;
    save.disabled = false;
    if (error) { save.textContent = id ? "SAVE PROJECT" : "ADD PROJECT"; return alert(`Could not save project: ${error.message}`); }
    resetProjectForm(); await hydrateProjectsFromSupabase();
  });
  document.querySelector("#project-cancel").addEventListener("click", resetProjectForm);
}

async function hydrateProfileFromSupabase() {
  if (!supabaseClient) return;
  const { data: authData } = await supabaseClient.auth.getUser();
  if (!authData.user) return;
  const { data, error } = await supabaseClient.from("site_settings").select("profile").eq("owner_id", authData.user.id).maybeSingle();
  if (error) { console.warn("Could not load saved profile", error.message); return; }
  if (data?.profile && Object.keys(data.profile).length) {
    Object.assign(adminData.profile, data.profile);
    refreshProfileForm();
    document.querySelector("#leo-intro-input").value = adminData.profile.leoIntro ?? "";
    renderLeoEditor();
  }
}

async function hydrateVisitStats() {
  if (!supabaseClient) return;
  const metric = document.querySelector(".metrics article:last-child");
  const countElement = metric.querySelector("strong");
  const detailElement = metric.querySelector("small");
  const [{ count, error: countError }, { data: recent, error: recentError }] = await Promise.all([
    supabaseClient.from("page_visits").select("id", { count: "exact", head: true }),
    supabaseClient.from("page_visits").select("visited_at").order("visited_at", { ascending: false }).limit(1000),
  ]);
  if (countError || recentError) {
    console.warn("Could not load visit statistics", countError?.message || recentError?.message);
    detailElement.textContent = "Visit data unavailable";
    return;
  }
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyCount = (recent ?? []).filter((visit) => new Date(visit.visited_at).getTime() >= oneWeekAgo).length;
  countElement.textContent = String(count ?? 0).padStart(2, "0");
  detailElement.textContent = `${weeklyCount} in the last 7 days`;
}

async function showDashboard() {
  loginScreen.classList.add("is-hidden");
  dashboard.classList.remove("is-hidden");
  await hydrateProfileFromSupabase();
  await hydratePhotosFromSupabase();
  await hydrateProjectsFromSupabase();
  await hydrateMusicFromSupabase();
  await hydrateGamesFromSupabase();
  await hydrateCollectionFromSupabase();
  await hydrateMessagesFromSupabase();
  await hydrateVisitStats();
}

function populateDashboard() {
  document.querySelector("#project-count").textContent = String(adminData.folders.length).padStart(2, "0");
  document.querySelector("#photo-count").textContent = String(adminData.photos.length).padStart(2, "0");
  const checklist = document.querySelector("#checklist");
  checklist.append(
    row("Profile", "ready to edit"), row("Projects", `${adminData.folders.length} folders`),
    row("Photos", `${adminData.photos.filter((photo) => photo.src).length}/${adminData.photos.length} uploaded`),
    row("Game diary", `${adminData.games.length} entries`), row("Communications", "6 seeded signals")
  );

  const fields = [["Name", "name"], ["Degree", "degree"], ["School", "school"], ["GPA", "gpa"], ["Study period", "timeline"], ["Email", "email"], ["Focus", "focus"], ["Status", "status"], ["Location", "location"], ["Intro", "intro"], ["Note", "note"]];
  const profileForm = document.querySelector("#profile-form");
  fields.forEach(([label, key]) => {
    const field = document.createElement("label");
    field.textContent = label;
    const input = key === "intro" || key === "note" ? document.createElement("textarea") : document.createElement("input");
    if (key === "email") input.type = "email";
    input.value = adminData.profile[key]; input.dataset.profileKey = key;
    field.append(input); profileForm.append(field);
  });
  [["LinkedIn URL", "linkedin"], ["GitHub URL", "github"]].forEach(([label, key]) => {
    const field = document.createElement("label");
    field.textContent = label;
    const input = document.createElement("input");
    input.type = "url"; input.placeholder = "https://…"; input.value = adminData.profile.links?.[key] ?? ""; input.dataset.profileLink = key;
    field.append(input); profileForm.append(field);
  });
  const save = document.createElement("button"); save.type = "submit"; save.textContent = "SAVE LOCAL PREVIEW"; profileForm.append(save);
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileForm.querySelectorAll("[data-profile-key]").forEach((input) => { adminData.profile[input.dataset.profileKey] = input.value; });
    adminData.profile.links ||= {};
    profileForm.querySelectorAll("[data-profile-link]").forEach((input) => { adminData.profile.links[input.dataset.profileLink] = input.value; });
    if (!supabaseClient) { save.textContent = "SAVED FOR THIS PREVIEW"; return; }
    save.disabled = true; save.textContent = "SAVING…";
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) { save.disabled = false; save.textContent = "SAVE PROFILE"; alert("Please sign in again before saving."); return; }
    const { error } = await supabaseClient.from("site_settings").upsert({ owner_id: authData.user.id, profile: adminData.profile, updated_at: new Date().toISOString() });
    save.disabled = false; save.textContent = error ? "SAVE PROFILE" : "SAVED TO SUPABASE";
    if (error) alert(`Could not save profile: ${error.message}`);
  });

  renderProjectEditor();
  renderPhotoEditor();
  renderMusicEditor();
  renderGameEditor();
  renderMessageEditor();
  renderCollectionSlots();
}

async function saveProfileToSupabase() {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in again before saving.");
  const { error } = await supabaseClient.from("site_settings").upsert({ owner_id: authData.user.id, profile: adminData.profile, updated_at: new Date().toISOString() });
  if (error) throw error;
}

function bindResumeUpload() {
  document.querySelector("#resume-upload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!supabaseClient) { alert("Connect Supabase before uploading a résumé."); return; }
    event.target.disabled = true;
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData.user) throw new Error("Please sign in before uploading.");
      const path = `${authData.user.id}/resumes/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeFileName(file.name)}`;
      const { error: storageError } = await supabaseClient.storage.from("portfolio-assets").upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (storageError) throw storageError;
      adminData.profile.links ||= {};
      adminData.profile.links.resume = publicAssetUrl(path);
      await saveProfileToSupabase();
      alert("Résumé uploaded and linked to your public profile.");
    } catch (error) {
      alert(`Could not upload résumé: ${error.message}`);
    } finally {
      event.target.value = "";
      event.target.disabled = false;
    }
  });
}

function bindProfilePhotoUpload() {
  document.querySelector("#profile-photo-upload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!supabaseClient) return alert("Connect Supabase before uploading a profile photo.");
    event.target.disabled = true;
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData.user) throw new Error("Please sign in before uploading.");
      const path = `${authData.user.id}/profile/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeFileName(file.name)}`;
      const { error: storageError } = await supabaseClient.storage.from("portfolio-assets").upload(path, file, { upsert: false });
      if (storageError) throw storageError;
      adminData.profile.photoUrl = publicAssetUrl(path);
      await saveProfileToSupabase();
      alert("Profile photo uploaded and linked to your public manifest.");
    } catch (error) {
      alert(`Could not upload profile photo: ${error.message}`);
    } finally {
      event.target.value = "";
      event.target.disabled = false;
    }
  });
}

function renderLeoEditor() {
  const editor = document.querySelector("#leo-editor"); editor.innerHTML = "";
  const photos = adminData.profile.leoPhotos ?? [];
  if (!photos.length) editor.append(row("No Leo snapshots yet", "Upload up to five photos."));
  photos.forEach((src, index) => {
    const item = row(`Leo snapshot ${String(index + 1).padStart(2, "0")}`, "public in Leo’s Corner");
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-action"; remove.textContent = "REMOVE";
    remove.addEventListener("click", async () => {
      if (!confirm("Remove this Leo snapshot?")) return;
      adminData.profile.leoPhotos.splice(index, 1);
      try { await saveProfileToSupabase(); renderLeoEditor(); } catch (error) { alert(`Could not remove snapshot: ${error.message}`); }
    });
    item.append(remove); editor.append(item);
  });
}

function bindLeoAdmin() {
  document.querySelector("#leo-intro-input").value = adminData.profile.leoIntro ?? "";
  document.querySelector("#leo-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    adminData.profile.leoIntro = document.querySelector("#leo-intro-input").value.trim();
    try { await saveProfileToSupabase(); alert("Leo’s corner details saved."); } catch (error) { alert(`Could not save Leo details: ${error.message}`); }
  });
  document.querySelector("#leo-photo-upload").addEventListener("change", async (event) => {
    const files = [...event.target.files]; if (!files.length) return;
    if (!supabaseClient) return alert("Connect Supabase before uploading Leo snapshots.");
    const remaining = 5 - (adminData.profile.leoPhotos?.length ?? 0);
    if (remaining <= 0) return alert("Leo’s Corner holds up to five photos. Remove one first.");
    event.target.disabled = true;
    try {
      const { data: authData } = await supabaseClient.auth.getUser(); if (!authData.user) throw new Error("Please sign in before uploading.");
      adminData.profile.leoPhotos ||= [];
      for (const file of files.slice(0, remaining)) {
        const path = `${authData.user.id}/leo/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeFileName(file.name)}`;
        const { error } = await supabaseClient.storage.from("portfolio-assets").upload(path, file, { upsert: false }); if (error) throw error;
        adminData.profile.leoPhotos.push(publicAssetUrl(path));
      }
      await saveProfileToSupabase(); renderLeoEditor();
    } catch (error) { alert(`Could not upload Leo snapshot: ${error.message}`); }
    finally { event.target.value = ""; event.target.disabled = false; }
  });
  renderLeoEditor();
}

function showPanel(panel) {
  document.querySelectorAll(".admin-panel").forEach((item) => item.classList.add("is-hidden"));
  document.querySelector(`#panel-${panel}`).classList.remove("is-hidden");
  panelTitle.textContent = document.querySelector(`[data-panel="${panel}"]`).textContent;
  document.querySelectorAll("#admin-nav button").forEach((button) => button.classList.toggle("is-active", button.dataset.panel === panel));
}

function safeFileName(name) { return name.replace(/[^a-zA-Z0-9._-]/g, "-"); }

async function uploadAsset(file, kind) {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in before uploading.");
  const user = authData.user;
  const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  const path = `${user.id}/${kind}/${id}-${safeFileName(file.name)}`;
  const { error: storageError } = await supabaseClient.storage.from("portfolio-assets").upload(path, file, { upsert: false });
  if (storageError) throw storageError;
  const record = kind === "photos"
    ? { owner_id: user.id, storage_path: path, alt_text: file.name, sort_order: 0 }
    : { owner_id: user.id, title: file.name.replace(/\.[^.]+$/, ""), storage_path: path, sort_order: 0 };
  const table = kind === "photos" ? "photos" : "music_tracks";
  const { data: inserted, error: insertError } = await supabaseClient.from(table).insert(record).select().single();
  if (insertError) {
    await supabaseClient.storage.from("portfolio-assets").remove([path]);
    throw insertError;
  }
  return inserted;
}

function bindUpload(inputSelector, listSelector, kind) {
  document.querySelector(inputSelector).addEventListener("change", async (event) => {
    const list = document.querySelector(listSelector);
    const files = [...event.target.files];
    event.target.disabled = true;
    for (const file of files) {
      try {
        if (supabaseClient) {
          await uploadAsset(file, kind === "image" ? "photos" : "music");
          list.append(row(file.name, `${kind} uploaded · ${(file.size / 1024 / 1024).toFixed(1)} MB`));
          if (kind === "image") await hydratePhotosFromSupabase();
          if (kind === "MP3") await hydrateMusicFromSupabase();
          alert(`${file.name} was saved to Supabase.`);
        } else {
          list.append(row(file.name, `${kind} preview · ${(file.size / 1024 / 1024).toFixed(1)} MB`));
        }
      } catch (error) {
        alert(`Could not upload ${file.name}: ${error.message}`);
      }
    }
    event.target.value = "";
    event.target.disabled = false;
  });
}

document.querySelector("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button[type='submit']");
  if (!supabaseClient) {
    sessionStorage.setItem("digital-room-admin-preview", "true");
    showDashboard();
    return;
  }
  submit.disabled = true; submit.textContent = "AUTHENTICATING…";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.querySelector("#admin-email").value,
    password: document.querySelector("#admin-password").value,
  });
  if (error) { submit.disabled = false; submit.textContent = "OPEN MISSION CONTROL ↗"; alert(error.message); return; }
  showDashboard();
});
document.querySelectorAll("#admin-nav button").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
document.querySelector("#admin-logout").addEventListener("click", async () => { if (supabaseClient) await supabaseClient.auth.signOut(); sessionStorage.removeItem("digital-room-admin-preview"); dashboard.classList.add("is-hidden"); loginScreen.classList.remove("is-hidden"); });

populateDashboard();
updateConnectionUI();
bindUpload("#photo-upload", "#photo-editor", "image");
bindUpload("#music-upload", "#music-editor", "MP3");
bindResumeUpload();
bindProfilePhotoUpload();
bindLeoAdmin();
bindProjectForm();
bindGameForm();
bindCollectionForm();
bindMessageForm();
if (!supabaseClient && sessionStorage.getItem("digital-room-admin-preview")) showDashboard();
if (supabaseClient) supabaseClient.auth.getSession().then(({ data }) => { if (data.session) showDashboard(); });
