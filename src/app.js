import { characters } from "./catalog.js";
import { emptyState, findCharacters, mergeCandidates, recognizeFromFiles, saveCandidates } from "./box-service.js";

const key = "monst-party-box-phase1";
let state = JSON.parse(localStorage.getItem(key) || "null") || emptyState();
let account = "main";
let files = [];
let candidates = [];
const $ = (selector) => document.querySelector(selector);

function persist() { localStorage.setItem(key, JSON.stringify(state)); }
function characterFor(id) { return characters.find((character) => character.id === id); }
function flash(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }
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
$("#screenshots").addEventListener("change", (event) => {
  files = [...event.target.files]; $("#analyse").disabled = files.length === 0;
  $("#selected-files").innerHTML = files.map((file) => `<div class="thumb"><img alt="${file.name}" src="${URL.createObjectURL(file)}"><span>${file.name}</span></div>`).join("");
});
$("#analyse").addEventListener("click", () => {
  candidates = recognizeFromFiles(files, characters); $("#review-section").classList.remove("hidden"); renderCandidates();
  $("#recognition-note").textContent = candidates.length ? "候補を作成しました。保存前に内容を確認してください。" : "この端末だけで候補化できる名前が見つかりませんでした。検索から手動追加してください。";
  $("#review-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#character-search").addEventListener("input", (event) => {
  const result = findCharacters(event.target.value, characters); $("#search-results").innerHTML = result.map((character) => `<button class="result" data-character="${character.id}">${character.name} <small>(${character.form})</small></button>`).join("");
  document.querySelectorAll("[data-character]").forEach((button) => button.addEventListener("click", () => { candidates.push({ ...characterFor(button.dataset.character), quantity: 1, source: "manual" }); $("#character-search").value = ""; $("#search-results").innerHTML = ""; renderCandidates(); }));
});
$("#add-character").addEventListener("click", () => { const first = findCharacters($("#character-search").value, characters)[0]; if (first) { candidates.push({ ...first, quantity: 1, source: "manual" }); $("#character-search").value = ""; $("#search-results").innerHTML = ""; renderCandidates(); } else flash("キャラ名を入力して候補から選んでください"); });
$("#save-box").addEventListener("click", () => { if (!candidates.length) return flash("保存するキャラを追加してください"); state = saveCandidates(state, account, candidates); persist(); candidates = []; files = []; $("#screenshots").value = ""; $("#selected-files").innerHTML = ""; $("#review-section").classList.add("hidden"); renderAccount(); flash(`${account === "main" ? "メイン" : "サブ"}BOXへ保存しました`); });
document.querySelectorAll(".account").forEach((button) => button.addEventListener("click", () => { account = button.dataset.account; renderAccount(); }));
$("#box-search").addEventListener("input", renderBox);
renderAccount();
