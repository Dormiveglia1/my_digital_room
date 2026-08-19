const data = structuredClone(window.RoomData);
const localMode = ["127.0.0.1", "localhost"].includes(location.hostname);
const $ = (selector) => document.querySelector(selector);
const uid = () => globalThis.crypto?.randomUUID?.() ?? (Date.now() + "-" + Math.random());
const list = (value) => Array.isArray(value) ? value : [];
data.photos = list(data.photos).filter((item) => item?.src);
data.tracks = list(data.tracks).map((track) => typeof track === "string" ? { id: uid(), title: track, src: "" } : ({ id: track.id || uid(), ...track }));
data.folders = list(data.folders).map((folder) => ({ id: folder.id || uid(), ...folder }));
data.games = list(data.games).map((game) => ({ id: game.id || uid(), diaryEntries: list(game.diaryEntries), ...game }));
data.collection = list(data.collection);
data.signals = list(data.signals).map((signal) => typeof signal === "string" ? { id: uid(), body: signal } : ({ id: signal.id || uid(), ...signal }));

function note(message) { $("#connection-copy").textContent = message; }
async function save() {
  if (!localMode) throw new Error("Open this page through npm run admin. GitHub Pages is read-only.");
  const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not write site-data.js.");
  $("#admin-mode-status").textContent = "SAVED LOCALLY";
  note("Saved to site-data.js. Run git add, commit, and push when you are ready to publish.");
}
async function compress(file) {
  if (!file.type.startsWith("image/")) return file;
  const image = await createImageBitmap(file);
  const ratio = Math.min(1, 2200 / Math.max(image.width, image.height));
  if (ratio === 1) { image.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .86));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }) : file;
}
async function upload(file, folder, progressSelector) {
  const progress = progressSelector ? $(progressSelector) : null;
  if (progress) { progress.classList.remove("is-hidden"); progress.querySelector("span").textContent = "Preparing file…"; progress.querySelector("progress").value = 15; }
  const prepared = await compress(file);
  if (progress) { progress.querySelector("span").textContent = prepared !== file ? "Image compressed. Saving locally…" : "Saving locally…"; progress.querySelector("progress").value = 55; }
  const bytes = new Uint8Array(await prepared.arrayBuffer());
  let binary = ""; bytes.forEach((byte) => binary += String.fromCharCode(byte));
  const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder, name: prepared.name, base64: btoa(binary) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Upload failed.");
  if (progress) { progress.querySelector("span").textContent = "Saved."; progress.querySelector("progress").value = 100; setTimeout(() => progress.classList.add("is-hidden"), 1200); }
  return result.path;
}
function row(title, meta, actions = []) {
  const element = document.createElement("div"); element.className = "content-row";
  const text = document.createElement("span"); text.textContent = title;
  const small = document.createElement("small"); small.textContent = meta;
  const actionBox = document.createElement("div"); actionBox.className = "row-actions";
  actions.forEach(([label, callback]) => { const button = document.createElement("button"); button.type = "button"; button.className = "remove-action"; button.textContent = label; button.addEventListener("click", callback); actionBox.append(button); });
  element.append(text, small, actionBox); return element;
}
function sortable(container, values, rerender) {
  let dragged;
  [...container.children].forEach((item, index) => {
    item.draggable = true;
    item.addEventListener("dragstart", () => { dragged = index; item.classList.add("is-dragging"); });
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", async (event) => {
      event.preventDefault(); const target = [...container.children].indexOf(item);
      if (dragged === undefined || target === dragged) return;
      const moved = values.splice(dragged, 1)[0]; values.splice(target, 0, moved);
      try { await save(); rerender(); } catch (error) { alert(error.message); }
    });
    item.addEventListener("dragend", () => item.classList.remove("is-dragging"));
  });
}
function refreshOverview() {
  $("#project-count").textContent = String(data.folders.length).padStart(2, "0");
  $("#photo-count").textContent = String(data.photos.length).padStart(2, "0");
  $("#checklist").replaceChildren(row("Profile", "editable locally"), row("Projects", data.folders.length + " folders"), row("Photos", data.photos.length + " uploaded"), row("Game diary", data.games.length + " game folders"), row("Communications", data.signals.length + " signals"));
}
function renderProfile() {
  const form = $("#profile-form"); form.replaceChildren();
  const fields = ["name","degree","intro","note","focus","status","location","school","gpa","timeline","email"];
  fields.forEach((key) => { const label = document.createElement("label"); label.textContent = key.replace(/([A-Z])/g, " $1").toUpperCase(); const input = ["intro","note"].includes(key) ? document.createElement("textarea") : document.createElement("input"); input.value = data.profile[key] || ""; input.dataset.key = key; label.append(input); form.append(label); });
  ["github","linkedin","resume"].forEach((key) => { const label=document.createElement("label"); label.textContent=key.toUpperCase()+" URL"; const input=document.createElement("input"); input.type="url"; input.value=data.profile.links?.[key] || ""; input.dataset.link=key; label.append(input); form.append(label); });
  const saveButton=document.createElement("button"); saveButton.textContent="SAVE LOCAL PROFILE"; form.append(saveButton);
  form.onsubmit=async(event)=>{ event.preventDefault(); form.querySelectorAll("[data-key]").forEach((input)=>data.profile[input.dataset.key]=input.value.trim()); data.profile.links ||= {}; form.querySelectorAll("[data-link]").forEach((input)=>data.profile.links[input.dataset.link]=input.value.trim()||"#"); try { await save(); refreshOverview(); alert("Profile saved locally."); } catch(error) { alert(error.message); } };
}
function renderPhotos() {
  const editor=$("#photo-editor"); editor.replaceChildren(...data.photos.map((item,index)=>row(item.alt || item.src.split("/").pop(), "drag to reorder", [["REMOVE", async()=>{ if(!confirm("Remove this photo?"))return; data.photos.splice(index,1); await save(); renderPhotos(); refreshOverview(); }]]))); sortable(editor,data.photos,renderPhotos);
}
function renderMusic() {
  const editor=$("#music-editor"); editor.replaceChildren(...data.tracks.map((track,index)=>row(track.title, "drag to reorder", [["REMOVE",async()=>{data.tracks.splice(index,1);await save();renderMusic();}]]))); sortable(editor,data.tracks,renderMusic);
}
function projectPayload() { const category=$("#project-category").value,title=$("#project-title").value.trim(); return { id: $("#project-id").value || uid(), category, title, name: category+" · "+title, summary: $("#project-summary").value.trim(), stack: $("#project-stack").value.split(",").map((x)=>x.trim()).filter(Boolean), liveUrl: $("#project-live-url").value.trim(), sourceUrl: $("#project-source-url").value.trim() }; }
function resetProject(){ $("#project-form").reset(); $("#project-id").value=""; $("#project-save").textContent="ADD PROJECT"; $("#project-cancel").classList.add("is-hidden"); }
function editProject(item){ $("#project-id").value=item.id; $("#project-category").value=item.category || "FULL-STACK"; $("#project-title").value=item.title || item.name?.split(" · ").pop() || ""; $("#project-summary").value=item.summary || item.detail || ""; $("#project-stack").value=list(item.stack).join(", "); $("#project-live-url").value=item.liveUrl||""; $("#project-source-url").value=item.sourceUrl||""; $("#project-save").textContent="SAVE PROJECT"; $("#project-cancel").classList.remove("is-hidden"); }
function renderProjects(){ const editor=$("#project-editor"); editor.replaceChildren(...data.folders.map((item,index)=>row(item.name,item.summary||"", [["EDIT",()=>editProject(item)],["REMOVE",async()=>{data.folders.splice(index,1);await save();renderProjects();refreshOverview();}]]))); sortable(editor,data.folders,renderProjects); }
function resetGame(){ $("#game-form").reset(); $("#game-id").value=""; $("#game-save").textContent="CREATE GAME FOLDER"; $("#game-cancel").classList.add("is-hidden"); }
let selectedGame;
function editGame(game){ $("#game-id").value=game.id; $("#game-title").value=game.title; $("#game-save").textContent="SAVE GAME FOLDER"; $("#game-cancel").classList.remove("is-hidden"); }
function openGame(game){ selectedGame=game; $("#diary-editor-card").classList.remove("is-hidden"); $("#diary-game-title").textContent=game.title; renderDiary(); }
function renderGamesAdmin(){ const editor=$("#game-editor"); editor.replaceChildren(...data.games.map((game,index)=>row(game.title,game.cover?"cover saved":"no cover", [["OPEN",()=>openGame(game)],["EDIT",()=>editGame(game)],["REMOVE",async()=>{data.games.splice(index,1);await save();renderGamesAdmin();$("#diary-editor-card").classList.add("is-hidden");}]]))); sortable(editor,data.games,renderGamesAdmin); }
function resetDiary(){ $("#diary-form").reset(); $("#diary-id").value=""; $("#diary-save").textContent="ADD DIARY ENTRY"; $("#diary-cancel").classList.add("is-hidden"); }
function renderDiary(){ const editor=$("#diary-editor"); const entries=list(selectedGame?.diaryEntries); editor.replaceChildren(...entries.map((entry,index)=>row(entry.body.slice(0,80),entry.published||"Undated", [["EDIT",()=>{ $("#diary-id").value=entry.id; $("#diary-date").value=entry.published||""; $("#diary-body").value=entry.body; $("#diary-save").textContent="SAVE DIARY ENTRY"; $("#diary-cancel").classList.remove("is-hidden");}],["REMOVE",async()=>{entries.splice(index,1);await save();renderDiary();}]]))); }
function renderCollection(){ const slots=$("#vault-slots"); slots.replaceChildren(...Array.from({length:8},(_,index)=>{const item=data.collection.find((x)=>Number(x.slot)===index+1);const button=document.createElement("button");button.type="button";button.textContent=item?"SLOT "+(index+1)+" · "+item.title:"SLOT "+(index+1)+" · EMPTY";button.addEventListener("click",()=>openSlot(index+1,item));return button;}));}
function openSlot(slot,item){$("#collection-editor-card").classList.remove("is-hidden");$("#collection-slot").value=slot;$("#collection-slot-title").textContent="Slot "+slot;$("#collection-title").value=item?.title||"";$("#collection-description").value=item?.description||"";$("#collection-date").value=item?.item_date||"";$("#collection-url").value=item?.external_url||"";$("#collection-remove").classList.toggle("is-hidden",!item);}
function renderMessages(){ const editor=$("#message-editor");editor.replaceChildren(...data.signals.map((message,index)=>row(message.body,"signal "+(index+1),[["EDIT",()=>{ $("#message-id").value=message.id;$("#message-body").value=message.body;$("#message-sort").value=index;$("#message-save").textContent="SAVE SIGNAL";$("#message-cancel").classList.remove("is-hidden");}],["REMOVE",async()=>{data.signals.splice(index,1);await save();renderMessages();refreshOverview();}]])));sortable(editor,data.signals,renderMessages);}
function renderLeo(){ $("#leo-intro-input").value=data.profile.leoIntro||""; const editor=$("#leo-editor");editor.replaceChildren(...list(data.profile.leoPhotos).map((src,index)=>row(src.split("/").pop(),"Leo snapshot",[["REMOVE",async()=>{data.profile.leoPhotos.splice(index,1);await save();renderLeo();}]]))); }

$("#admin-login").classList.add("is-hidden");$("#admin-dashboard").classList.remove("is-hidden");
$("#admin-mode-status").textContent=localMode?"LOCAL FILE MODE":"READ-ONLY PAGES MODE";
$("#connection-eyebrow").textContent="LOCAL DATABASE";
$("#connection-title").textContent=localMode?"Repository data editor is running.":"GitHub Pages is read-only.";
note(localMode?"Saving writes site-data.js and assets/user-content in this repository. Commit and push to publish.":"Run npm run admin locally to edit this portfolio; changes cannot be made from GitHub Pages.");
$("#admin-nav").addEventListener("click",(event)=>{const button=event.target.closest("[data-panel]");if(!button)return;document.querySelectorAll(".admin-panel").forEach((panel)=>panel.classList.toggle("is-hidden",panel.id!=="panel-"+button.dataset.panel));document.querySelectorAll("#admin-nav button").forEach((item)=>item.classList.toggle("is-active",item===button));$("#panel-title").textContent=button.textContent;});
$("#admin-logout").textContent="Close local editor";$("#admin-logout").onclick=()=>location.href="index.html";
$("#profile-photo-upload").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{data.profile.photoUrl=await upload(file,"profile","#profile-upload-progress");await save();alert("Profile photo saved locally.");}catch(error){alert(error.message)}event.target.value="";});
$("#resume-upload").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{data.profile.links ||= {};data.profile.links.resume=await upload(file,"resume",null);await save();alert("Resume saved locally.");}catch(error){alert(error.message)}event.target.value="";});
$("#photo-upload").addEventListener("change",async(event)=>{for(const file of [...event.target.files]){try{data.photos.push({id:uid(),src:await upload(file,"photos","#photo-upload-progress"),alt:file.name.replace(/\.[^.]+$/,"")});}catch(error){alert(error.message)}}event.target.value="";await save();renderPhotos();refreshOverview();});
$("#music-upload").addEventListener("change",async(event)=>{for(const file of [...event.target.files]){try{data.tracks.push({id:uid(),title:file.name.replace(/\.[^.]+$/,""),src:await upload(file,"music","#music-upload-progress")});}catch(error){alert(error.message)}}event.target.value="";await save();renderMusic();});
$("#project-form").onsubmit=async(event)=>{event.preventDefault();const item=projectPayload();const index=data.folders.findIndex((value)=>value.id===item.id);if(index<0)data.folders.push(item);else data.folders[index]=item;await save();resetProject();renderProjects();refreshOverview();};$("#project-cancel").onclick=resetProject;
$("#game-form").onsubmit=async(event)=>{event.preventDefault();const id=$("#game-id").value||uid();const previous=data.games.find((game)=>game.id===id)||{};const cover=$("#game-cover").files[0];const game={...previous,id,title:$("#game-title").value.trim(),cover:cover?await upload(cover,"game-covers","#game-upload-progress"):previous.cover||"",diaryEntries:list(previous.diaryEntries)};const index=data.games.findIndex((item)=>item.id===id);if(index<0)data.games.push(game);else data.games[index]=game;await save();resetGame();renderGamesAdmin();};$("#game-cancel").onclick=resetGame;
$("#diary-form").onsubmit=async(event)=>{event.preventDefault();if(!selectedGame)return;const id=$("#diary-id").value||uid();const previous=list(selectedGame.diaryEntries).find((entry)=>entry.id===id)||{};const media=[...(previous.media||[])];for(const file of [...$("#diary-media").files])media.push(await upload(file,"game-diary","#diary-upload-progress"));const entry={...previous,id,body:$("#diary-body").value.trim(),published:$("#diary-date").value,media};const index=selectedGame.diaryEntries.findIndex((item)=>item.id===id);if(index<0)selectedGame.diaryEntries.unshift(entry);else selectedGame.diaryEntries[index]=entry;await save();resetDiary();renderDiary();};$("#diary-cancel").onclick=resetDiary;
$("#collection-form").onsubmit=async(event)=>{event.preventDefault();const slot=Number($("#collection-slot").value), index=data.collection.findIndex((item)=>Number(item.slot)===slot), image=$("#collection-image").files[0];const old=index<0?{}:data.collection[index];const item={...old,slot,title:$("#collection-title").value.trim(),description:$("#collection-description").value.trim(),item_date:$("#collection-date").value,external_url:$("#collection-url").value.trim(),image:image?await upload(image,"collection","#collection-upload-progress"):old.image||""};if(index<0)data.collection.push(item);else data.collection[index]=item;await save();renderCollection();};$("#collection-remove").onclick=async()=>{const slot=Number($("#collection-slot").value);data.collection=data.collection.filter((item)=>Number(item.slot)!==slot);await save();$("#collection-editor-card").classList.add("is-hidden");renderCollection();};
$("#message-form").onsubmit=async(event)=>{event.preventDefault();const id=$("#message-id").value||uid();const item={id,body:$("#message-body").value.trim()};const index=data.signals.findIndex((value)=>value.id===id);if(index<0)data.signals.push(item);else data.signals[index]=item;await save();event.target.reset();$("#message-id").value="";$("#message-save").textContent="ADD SIGNAL";$("#message-cancel").classList.add("is-hidden");renderMessages();refreshOverview();};$("#message-cancel").onclick=()=>{$("#message-form").reset();$("#message-id").value="";$("#message-save").textContent="ADD SIGNAL";$("#message-cancel").classList.add("is-hidden");};
$("#leo-form").onsubmit=async(event)=>{event.preventDefault();data.profile.leoIntro=$("#leo-intro-input").value.trim();await save();alert("Leo details saved locally.");};$("#leo-photo-upload").addEventListener("change",async(event)=>{data.profile.leoPhotos ||= [];for(const file of [...event.target.files].slice(0,5-data.profile.leoPhotos.length))data.profile.leoPhotos.push(await upload(file,"leo","#leo-upload-progress"));event.target.value="";await save();renderLeo();});
refreshOverview();renderProfile();renderPhotos();renderMusic();renderProjects();renderGamesAdmin();renderCollection();renderMessages();renderLeo();