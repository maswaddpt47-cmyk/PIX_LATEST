// utils.js — fonctions utilitaires pures (pas de DOM, pas de React)
// Chargé via <script src="utils.js"> dans le navigateur ET via require() dans les tests Node.

function decodeEntities(s) {
  return s.replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
          .replace(/’/g, "'").replace(/‘/g, "'")
          .replace(/′/g, "'");
}

function parseDate(str) {
  if (!str) return null;
  str = str.trim();
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m1) return new Date(`${m1[3]}-${m1[2]}-${m1[1]}T00:00:00`);
  const m2 = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return new Date(m2[1] + "T00:00:00");
  return null;
}

function avg(a) {
  return a.length ? a.reduce((s, b) => s + b, 0) / a.length : 0;
}

function nn(a) {
  return a.filter(v => v != null);
}

function r100(v) {
  return v != null ? Math.round(v * 100) : 0;
}

function pct(v) {
  return v != null ? Math.round(v * 100) + "%" : "—";
}

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function safeAvg(arr, f) {
  const v = nn(arr.map(x => x[f]));
  return v.length ? r100(avg(v)) : null;
}

function num(v) {
  const n = parseFloat(v.replace(/\s/g, "").replace(",", ".").replace(/%$/, ""));
  if (isNaN(n)) return null;
  return n > 1 ? n / 100 : n;
}

function bool(v) {
  const s = (v || "").toLowerCase();
  return s === "oui" || s === "o" || s === "true" ? true
       : s === "non" || s === "n" || s === "false" ? false
       : null;
}

function fmtDate(str) {
  const d = parseDate(str);
  return d ? d.toLocaleDateString("fr-FR") : str || "—";
}

if (typeof module !== "undefined") {
  module.exports = { decodeEntities, parseDate, avg, nn, r100, pct, median, safeAvg, num, bool, fmtDate };
}
