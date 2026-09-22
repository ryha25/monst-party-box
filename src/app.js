import { characters } from "./catalog.js";
import { boxGridRegions, createManualCharacter, emptyState, findCharacters, mergeCandidates, normalize, recognizeFromFiles, saveCandidates } from "./box-service.js";
import { loadRemoteCharacters } from "./supabase-catalog.js";
import { clearSession, getStoredSession, getUser, signIn, signUp } from "./supabase-auth.js";
import { loadBox, saveBox } from "./supabase-box.js";

const key = "monst-party-box-phase1";
const manualCharactersKey = "monst-party-box-manual-characters";
let state = JSON.parse(localStorage.getItem(key) || "null") || emptyState();
let account = "main";
let files = [];
let candidates = [];
let unknownSlots = [];
let manualCharacters = JSON.parse(localStorage.getItem(manualCharactersKey) || "[]");
let catalogue = [...characters, ...manualCharacters];
let remoteCatalogueReady = false;
let session = getStoredSession();
let user = null;
let remoteAccounts = null;
const $ = (selector) => document.querySelector(selector);

function persist() { localStorage.setItem(key, JSON.stringify(state)); }
function registerManualCharacter(name) {
  const existing = catalogue.find((character) => normalize(character.name) === normalize(name));
  if (existing) return existing;
  const character = createManualCharacter(name);
  manualCharacters = [...manualCharacters, character];
  localStorage.setItem(manualCharactersKey, JSON.stringify(manualCharacters));
  catalogue = [...catalogue, character];
  return character;
}
function characterFor(id) { return catalogue.find((character) => character.id === id); }
function flash(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }
function renderAuth() {
  $("#auth-signed-out").classList.toggle("hidden", Boolean(user));
  $("#auth-signed-in").classList.toggle("hidden", !user);
  if (user) $("#signed-in-email").textContent = user.email;
}
function mergeBoxStates(localState, remoteState) {
  const merged = { accounts: { main: [], sub: [] } };
  for (const slot of ["main", "sub"]) {
    const quantities = new Map(localState.accounts[slot].map((item) => [item.characterId, item.quantity]));
    for (const item of remoteState.accounts[slot]) quantities.set(item.characterId, Math.max(quantities.get(item.characterId) || 0, item.quantity));
    merged.accounts[slot] = [...quantities].map(([characterId, quantity]) => ({ characterId, quantity }));
  }
  return merged;
}
async function activateSession(nextSession) {
  session = nextSession; user = await getUser(session);
  if (!user) throw new Error("ログイン状態を確認できませんでした");
  const remote = await loadBox(session, user);
  remoteAccounts = remote.accounts;
  state = mergeBoxStates(state, remote.state);
  persist(); renderAuth(); renderAccount(); flash("サーバーのBOXを読み込みました");
}
function renderAccount() {
  document.querySelectorAll(".account").forEach((button) => { const isCurrent = button.dataset.account === account; button.classList.toggle("active", isCurrent); const count = state.accounts[button.dataset.account].reduce((sum, item) => sum + item.quantity, 0); button.querySelector("small").textContent = `${count}体登録`; });
  $("#box-title").textContent = `${account === "main" ? "メイン" : "サブ"}BOX`;
  renderBox();
}
function renderBox() {
  const term = $("#box-search").value || "";
  const items = state.accounts[account].map((item) => ({ ...item, character: characterFor(item.characterId) })).filter((item) => item.character && (!term || item.character.name.includes(term)));
  $("#owned-total").textContent = `${state.accounts[account].reduce((sum, item) => sum + item.quantity, 0)}体`;
  $("#box-list").innerHTML = items.length ? items.map(({ character, quantity }) => `<div class="box-row"><div class="avatar">${character.attribute}</div><div class="char-info"><strong>${character.name}</strong><small>${character.form} · ${character.type}</small></div><strong>×${quantity}</strong></div>`).join("") : `<p class="empty">まだ登録されていません</p>`;
}
function renderCandidates() {
  candidates = mergeCandidates(candidates);
  $("#candidate-count").textContent = `${candidates.reduce((sum, item) => sum + item.quantity, 0)}体`;
  $("#candidate-list").innerHTML = candidates.length ? candidates.map((item, index) => `<div class="candidate"><div class="avatar">${item.attribute}</div><div class="char-info"><strong>${item.name}</strong><small>${item.form} · ${item.source === "filename" ? "ファイル名から候補化" : "手動追加"}</small></div><input class="qty" aria-label="${item.name}の所持数" min="1" type="number" value="${item.quantity}" data-index="${index}"><button class="remove" title="削除" data-remove="${index}">×</button></div>`).join("") : `<p class="empty">自動候補がありません。下の検索から追加してください。</p>`;
  document.querySelectorAll(".qty").forEach((input) => input.addEventListener("change", (event) => { candidates[Number(event.target.dataset.index)].quantity = Math.max(1, Number(event.target.value) || 1); renderCandidates(); }));
  document.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => { candidates.splice(Number(button.dataset.remove), 1); renderCandidates(); }));
}
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像を読み込めませんでした")); };
    image.src = url;
  });
}
async function createUnknownSlots(imageFiles) {
  const slots = [];
  for (const file of imageFiles) {
    try {
      const image = await loadImage(file);
      for (const [index, region] of boxGridRegions(image.naturalWidth, image.naturalHeight).entries()) {
        const canvas = document.createElement("canvas");
        canvas.width = region.width; canvas.height = region.height;
        canvas.getContext("2d").drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
        slots.push({ id: `${file.name}-${index}`, imageUrl: canvas.toDataURL("image/jpeg", 0.82), added: false });
      }
    } catch { flash(`${file.name} を読み込めませんでした`); }
  }
  return slots;
}
function renderUnknownSlots() {
  const section = $("#unknown-section");
  if (!unknownSlots.length) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  $("#unknown-count").textContent = `${unknownSlots.filter((slot) => !slot.added).length}件未追加`;
  $("#unknown-grid").innerHTML = unknownSlots.map((slot, index) => `<article class="unknown-card"><img src="${slot.imageUrl}" alt="未判別アイコン ${index + 1}">${slot.added ? `<p class="slot-added">追加済み</p>` : `<input data-slot-search="${index}" placeholder="名前を検索" autocomplete="off"><div class="slot-results" id="slot-results-${index}"></div>`}</article>`).join("");
  document.querySelectorAll("[data-slot-search]").forEach((input) => input.addEventListener("input", (event) => {
    const index = Number(event.target.dataset.slotSearch);
    const matches = findCharacters(event.target.value, catalogue).slice(0, 5);
    $(`#slot-results-${index}`).innerHTML = matches.length ? matches.map((character) => `<button class="slot-result" data-slot-character="${index}" data-character="${character.id}">${character.name} <small>${character.form}</small></button>`).join("") : event.target.value.trim() ? `<button class="slot-result" data-slot-manual="${index}">「${event.target.value.trim()}」を追加</button>` : "";
    document.querySelectorAll("[data-slot-character]").forEach((button) => button.addEventListener("click", () => {
      candidates.push({ ...characterFor(button.dataset.character), quantity: 1, source: "manual" });
      unknownSlots[Number(button.dataset.slotCharacter)].added = true;
      renderCandidates(); renderUnknownSlots();
    }));
    document.querySelectorAll("[data-slot-manual]").forEach((button) => button.addEventListener("click", () => {
      const character = registerManualCharacter(event.target.value);
      candidates.push({ ...character, quantity: 1, source: "manual" });
      unknownSlots[Number(button.dataset.slotManual)].added = true;
      renderCandidates(); renderUnknownSlots();
    }));
  }));
}
$("#screenshots").addEventListener("change", (event) => {
  files = [...event.target.files]; $("#analyse").disabled = files.length === 0;
  $("#selected-files").innerHTML = files.map((file) => `<div class="thumb"><img alt="${file.name}" src="${URL.createObjectURL(file)}"><span>${file.name}</span></div>`).join("");
});
$("#analyse").addEventListener("click", async () => {
  $("#analyse").disabled = true; $("#analyse").textContent = "アイコンを切り出しています…";
  candidates = recognizeFromFiles(files, catalogue); unknownSlots = await createUnknownSlots(files); $("#review-section").classList.remove("hidden"); renderCandidates(); renderUnknownSlots();
  $("#recognition-note").textContent = candidates.length ? "候補を作成しました。保存前に内容を確認してください。" : "この端末だけで候補化できる名前が見つかりませんでした。検索から手動追加してください。";
  $("#analyse").disabled = false; $("#analyse").textContent = "画像を解析して確認する";
  $("#review-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#character-search").addEventListener("input", (event) => {
  const result = findCharacters(event.target.value, catalogue); $("#search-results").innerHTML = result.map((character) => `<button class="result" data-character="${character.id}">${character.name} <small>(${character.form})</small></button>`).join("");
  document.querySelectorAll("[data-character]").forEach((button) => button.addEventListener("click", () => { candidates.push({ ...characterFor(button.dataset.character), quantity: 1, source: "manual" }); $("#character-search").value = ""; $("#search-results").innerHTML = ""; renderCandidates(); }));
});
$("#add-character").addEventListener("click", () => { try { const name = $("#character-search").value; const first = findCharacters(name, catalogue)[0] || registerManualCharacter(name); candidates.push({ ...first, quantity: 1, source: "manual" }); $("#character-search").value = ""; $("#search-results").innerHTML = ""; renderCandidates(); } catch (error) { flash(error.message); } });
$("#save-box").addEventListener("click", async () => { if (!candidates.length) return flash("保存するキャラを追加してください"); state = saveCandidates(state, account, candidates); persist(); if (session && remoteAccounts && remoteCatalogueReady) { try { await saveBox(session, remoteAccounts, state); } catch { flash("端末には保存しました。サーバー同期は後でもう一度試します。"); } } candidates = []; unknownSlots = []; files = []; $("#screenshots").value = ""; $("#selected-files").innerHTML = ""; $("#review-section").classList.add("hidden"); renderAccount(); flash(`${account === "main" ? "メイン" : "サブ"}BOXへ保存しました`); });
document.querySelectorAll(".account").forEach((button) => button.addEventListener("click", () => { account = button.dataset.account; renderAccount(); }));
$("#box-search").addEventListener("input", renderBox);
$("#sign-in").addEventListener("click", async () => { try { await activateSession(await signIn($("#auth-email").value, $("#auth-password").value)); } catch (error) { flash(error.message); } });
$("#sign-up").addEventListener("click", async () => { try { const result = await signUp($("#auth-email").value, $("#auth-password").value); if (result.access_token) await activateSession(result); else flash("確認メールを開いた後、ログインしてください"); } catch (error) { flash(error.message); } });
$("#sign-out").addEventListener("click", () => { clearSession(); session = null; user = null; remoteAccounts = null; renderAuth(); flash("ログアウトしました"); });
try {
  const remoteCharacters = await loadRemoteCharacters();
  if (remoteCharacters.length) { catalogue = [...remoteCharacters, ...manualCharacters]; remoteCatalogueReady = true; }
} catch {
  // A local catalogue keeps the app usable until the first character import.
}
if (session) {
  try { await activateSession(session); } catch { session = null; user = null; clearSession(); }
}
renderAuth();
renderAccount();
