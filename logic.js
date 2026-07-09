// logic.js — logique métier PIX (parsing CSV, traitement fichiers, filtres)
// Chargé via <script src="logic.js"> dans le navigateur ET via require() dans les tests Node.

// Compatibilité : navigateur (fonctions globales de utils.js) ou Node (require)
const _u = typeof require !== "undefined" ? require("./utils.js") : window;
const _decodeEntities = _u.decodeEntities;
const _parseDate = _u.parseDate;
const _num = _u.num;
const _bool = _u.bool;

// ── CORRESPONDANCE COLONNES CSV ────────────────────────────────────────────
const COLMAP = [
  [c => c.toLowerCase().includes("email"),                                                       "Email"],
  [c => c.includes("organisation"),                                                              "Organisation"],
  [c => c.includes("Nom de la campagne"),                                                        "Nom_Campagne"],
  [c => c.includes("Nom du Participant"),                                                        "Nom"],
  [c => (c.includes("rénom") || c.includes("renom")) && c.includes("articipant"),               "Prenom"],
  [c => /^NOM\s+Pr/i.test(c.replace(/’/g, "'").replace(/‘/g, "'")),                  "NOM_Prenom"],
  [c => c.includes("rogression") && c.startsWith("%"),                                           "Pct_Progression"],
  [c => (c.includes("but") || c.includes("début")) && c.includes("uro"),                        "Date_Debut"],
  [c => c.includes("artage") && c.includes("O/N"),                                               "Partage"],
  [c => c.includes("alier") && c.includes("/3"),                                                 "Palier"],
  [c => c.includes("ensemble des acquis"),                                                       "Score_Global"],
  [c => c.includes("recherche") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Recherche"],
  [c => c.includes("Interagir") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Interagir"],
  [c => (c.includes("nsérer") || c.includes("nserer")) && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Inserer"],
  [c => c.includes("textuels") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"),  "Pct_Docs"],
  [c => (c.includes("écuriser") || c.includes("ecuriser")) && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Securiser"],
  [c => (c.includes("ésoudre") || c.includes("esoudre")) && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"),  "Pct_Resoudre"],
  [c => c.includes("Construire") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Construire"],
  [c => c.includes("Information") && c.includes("données") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Information"],
  [c => c.includes("Communication") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Communication"],
  [c => (c.includes("réation") || c.includes("reation")) && c.includes("contenu") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Creation"],
  [c => c.includes("Protection") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Protection"],
  [c => c.includes("Environnement") && c.includes("numérique") && c.includes("%") && !c.includes("Nombre") && !c.includes("Acquis"), "Pct_Environnement"],
  [c => c.toLowerCase().includes("obtenu (o/n)") && c.toLowerCase().includes("navigue"),         "Jalon_Navigue"],
  [c => c.toLowerCase().includes("obtenu (o/n)") && c.toLowerCase().includes("protège"),         "Jalon_Protege"],
  [c => c.toLowerCase().includes("obtenu (o/n)") && c.toLowerCase().includes("saisis"),          "Jalon_Saisis"],
  [c => c.toLowerCase().includes("obtenu (o/n)") && c.toLowerCase().includes("identifie"),       "Jalon_Identifie"],
  [c => c.toLowerCase().includes("obtenu (o/n)") && c.toLowerCase().includes("manipule"),        "Jalon_Manipule"],
];

function mapCol(name) {
  const n = _decodeEntities(name);
  for (const [test, mapped] of COLMAP) { if (test(n)) return mapped; }
  return null;
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const first = text.split("\n")[0];
  const sep = first.split(";").length > first.split(",").length ? ";" : ",";
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], missingCols: [] };

  function parseLine(l) {
    const cells = []; let cur = "", inQ = false;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === '"') { inQ = !inQ; }
      else if (l[i] === sep && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += l[i];
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim());
  const colIdx = {};
  headers.forEach((h, i) => { const m = mapCol(h); if (m) colIdx[m] = i; });

  const CRITICAL_COLS = ["Email", "Score_Global", "Palier"];
  const missingCols = CRITICAL_COLS.filter(c => colIdx[c] == null);
  if (colIdx["TypeCampagne"] == null && colIdx["Nom_Campagne"] == null) missingCols.push("Nom_Campagne");

  const rows = lines.slice(1).map(line => {
    const cells = parseLine(line);
    if (cells.length < 3) return null;
    const get = k => colIdx[k] != null ? (cells[colIdx[k]] || "").replace(/^"|"$/g, "").trim() : "";

    let email = get("Email");
    let nom = get("Nom"), prenom = get("Prenom");
    const nomPrenom = get("NOM_Prenom");
    if ((!nom || !prenom) && nomPrenom) {
      const pts = nomPrenom.trim().split(/\s+/);
      if (pts.length >= 2) { nom = pts[0]; prenom = pts.slice(1).join(" "); }
      else { nom = nomPrenom; }
    }
    if (!email || email === "Votre Email") {
      const n = nom, p = prenom;
      if (!n && !p) return null;
      const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".");
      email = (p && n) ? slug(p) + "." + slug(n) + "@pix-cd47.fr" : slug(p || n) + "@pix-cd47.fr";
    }

    const jalons = {};
    headers.forEach((h, i) => {
      if (h.toLowerCase().includes("obtenu (o/n)")) {
        const name = _decodeEntities(h).replace(/obtenu \(O\/N\)/i, "").replace(/obtenu \(o\/n\)/i, "").trim();
        jalons[name] = _bool(cells[i] || "");
      }
    });

    return {
      Email: email, Nom: nom, Prenom: prenom,
      Nom_Campagne: get("Nom_Campagne"),
      Date_Debut: get("Date_Debut"),
      Palier: Math.min(3, Math.max(0, parseInt(get("Palier")) || 0)),
      Score_Global: _num(get("Score_Global")),
      Pct_Progression: _num(get("Pct_Progression")),
      Pct_Recherche: _num(get("Pct_Recherche")), Pct_Interagir: _num(get("Pct_Interagir")),
      Pct_Inserer: _num(get("Pct_Inserer")), Pct_Docs: _num(get("Pct_Docs")),
      Pct_Securiser: _num(get("Pct_Securiser")), Pct_Resoudre: _num(get("Pct_Resoudre")),
      Pct_Construire: _num(get("Pct_Construire")),
      Pct_Information: _num(get("Pct_Information")), Pct_Communication: _num(get("Pct_Communication")),
      Pct_Creation: _num(get("Pct_Creation")), Pct_Protection: _num(get("Pct_Protection")),
      Pct_Environnement: _num(get("Pct_Environnement")),
      Jalons: jalons,
    };
  }).filter(Boolean);

  return { rows, missingCols };
}

function processFiles(files) {
  const cycleData = [];
  const osByKey = {};

  files.forEach(f => {
    const partenaire = (f.partenaire || "").trim() || "(sans nom)";
    const isOS = f.mode === "oneshot";

    if (isOS) {
      f.rows.forEach(row => {
        if (!row.Email || !row.Email.trim()) return;
        const key = row.Email.trim() + "|" + partenaire;
        const existing = osByKey[key];
        if (!existing) {
          osByKey[key] = { ...row, TypeCampagne: "OneShot", Mode: "OneShot",
            Partenaire: partenaire, NbSessions: 1, Duree: null };
        } else {
          const ed = _parseDate(existing.Date_Debut), nd = _parseDate(row.Date_Debut);
          if (nd && (!ed || nd > ed)) {
            osByKey[key] = { ...row, TypeCampagne: "OneShot", Mode: "OneShot",
              Partenaire: partenaire, NbSessions: (existing.NbSessions || 1) + 1, Duree: null };
          } else {
            osByKey[key].NbSessions = (osByKey[key].NbSessions || 1) + 1;
          }
        }
      });
    } else {
      const byEmail = {};
      f.rows.forEach(row => {
        if (!row.Email) return;
        if (!byEmail[row.Email]) byEmail[row.Email] = [];
        byEmail[row.Email].push(row);
      });
      Object.entries(byEmail).forEach(([email, sessions]) => {
        sessions.sort((a, b) => {
          const da = _parseDate(a.Date_Debut), db = _parseDate(b.Date_Debut);
          if (!da && !db) return 0; if (!da) return 1; if (!db) return -1; return da - db;
        });
        const t1 = sessions[0], t2 = sessions.length > 1 ? sessions[sessions.length - 1] : null;
        let duree = null;
        if (t1 && t2) {
          const d1 = _parseDate(t1.Date_Debut), d2 = _parseDate(t2.Date_Debut);
          if (d1 && d2) { const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)); if (!isNaN(diff) && diff >= 0) duree = diff; }
        }
        cycleData.push({ ...t1, TypeCampagne: "Entrée", Mode: "Cycle", Partenaire: partenaire, NbSessions: sessions.length, Duree: duree });
        if (t2) cycleData.push({ ...t2, TypeCampagne: "Sortie", Mode: "Cycle", Partenaire: partenaire, NbSessions: sessions.length, Duree: duree });
      });
    }
  });

  return [...cycleData, ...Object.values(osByKey)];
}

function filt(data, curP, type) {
  const norm = s => (s || "").trim();
  return data.filter(d => (curP === "Tous" || norm(d.Partenaire) === norm(curP)) && (type ? d.TypeCampagne === type : true));
}

function nomParticipant(row) {
  if (!row) return "";
  return row.Prenom ? row.Prenom + " " + row.Nom : row.Nom || row.Email;
}

if (typeof module !== "undefined") {
  module.exports = { mapCol, parseCSV, processFiles, filt, nomParticipant };
}
