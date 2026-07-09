const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { mapCol, parseCSV, processFiles, filt, nomParticipant } = require("./logic.js");

// ── mapCol ────────────────────────────────────────────────────────────────
describe("mapCol", () => {
  it("colonne email → 'Email'", () => {
    assert.equal(mapCol("Adresse email"), "Email");
  });
  it("colonne Score_Global", () => {
    assert.equal(mapCol("% de l'ensemble des acquis"), "Score_Global");
  });
  it("colonne Palier", () => {
    assert.equal(mapCol("Palier obtenu /3"), "Palier");
  });
  it("colonne inconnue → null", () => {
    assert.equal(mapCol("Colonne inconnue"), null);
  });
  it("décode les entités HTML avant matching", () => {
    assert.equal(mapCol("Adresse email"), "Email");
  });
});

// ── parseCSV — séparateur et colonnes de base ─────────────────────────────
describe("parseCSV — séparateur", () => {
  const baseHeaders = "Adresse email;% de l'ensemble des acquis;Palier obtenu /3;Nom de la campagne\n";
  const baseRow = "alice@test.fr;0,72;2;Campagne test\n";

  it("détecte le séparateur point-virgule", () => {
    const { rows } = parseCSV(baseHeaders + baseRow);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Email, "alice@test.fr");
  });

  it("détecte le séparateur virgule", () => {
    const csv = "Adresse email,% de l'ensemble des acquis,Palier obtenu /3,Nom de la campagne\nalice@test.fr,0.72,2,Campagne test\n";
    const { rows } = parseCSV(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].Email, "alice@test.fr");
  });

  it("ignore le BOM UTF-8", () => {
    const csv = "﻿" + baseHeaders + baseRow;
    const { rows } = parseCSV(csv);
    assert.equal(rows.length, 1);
  });

  it("CSV vide (pas de lignes) → rows vide", () => {
    const { rows } = parseCSV("Email\n");
    assert.equal(rows.length, 0);
  });
});

// ── parseCSV — normalisation Score_Global ─────────────────────────────────
describe("parseCSV — Score_Global", () => {
  function makeCsv(score) {
    return `Adresse email;% de l'ensemble des acquis;Palier obtenu /3;Nom de la campagne\nalice@test.fr;${score};1;Camp\n`;
  }

  it("valeur décimale '0.72' → 0.72", () => {
    const { rows } = parseCSV(makeCsv("0.72"));
    assert.ok(Math.abs(rows[0].Score_Global - 0.72) < 0.001);
  });

  it("valeur entière '72' (format PIX) → 0.72", () => {
    const { rows } = parseCSV(makeCsv("72"));
    assert.ok(Math.abs(rows[0].Score_Global - 0.72) < 0.001);
  });

  it("virgule française '0,72' → 0.72", () => {
    const { rows } = parseCSV(makeCsv("0,72"));
    assert.ok(Math.abs(rows[0].Score_Global - 0.72) < 0.001);
  });

  it("Score_Global vide → null", () => {
    const { rows } = parseCSV(makeCsv(""));
    assert.equal(rows[0].Score_Global, null);
  });
});

// ── parseCSV — Palier clampé à [0, 3] ────────────────────────────────────
describe("parseCSV — Palier", () => {
  function makeCsv(palier) {
    return `Adresse email;% de l'ensemble des acquis;Palier obtenu /3;Nom de la campagne\nalice@test.fr;0.5;${palier};Camp\n`;
  }

  it("palier valide 2 → 2", () => {
    const { rows } = parseCSV(makeCsv("2"));
    assert.equal(rows[0].Palier, 2);
  });

  it("palier 4 → clampé à 3", () => {
    const { rows } = parseCSV(makeCsv("4"));
    assert.equal(rows[0].Palier, 3);
  });

  it("palier -1 → clampé à 0", () => {
    const { rows } = parseCSV(makeCsv("-1"));
    assert.equal(rows[0].Palier, 0);
  });

  it("palier vide → 0", () => {
    const { rows } = parseCSV(makeCsv(""));
    assert.equal(rows[0].Palier, 0);
  });
});

// ── parseCSV — colonnes manquantes ────────────────────────────────────────
describe("parseCSV — missingCols", () => {
  it("CSV complet → missingCols vide", () => {
    const csv = "Adresse email;% de l'ensemble des acquis;Palier obtenu /3;Nom de la campagne\nalice@test.fr;0.5;1;Camp\n";
    const { missingCols } = parseCSV(csv);
    assert.equal(missingCols.length, 0);
  });

  it("Email manquant → signalé dans missingCols", () => {
    const csv = "% de l'ensemble des acquis;Palier obtenu /3;Nom de la campagne\n0.5;1;Camp\n";
    const { missingCols } = parseCSV(csv);
    assert.ok(missingCols.includes("Email"));
  });

  it("Score_Global manquant → signalé", () => {
    const csv = "Adresse email;Palier obtenu /3;Nom de la campagne\nalice@test.fr;1;Camp\n";
    const { missingCols } = parseCSV(csv);
    assert.ok(missingCols.includes("Score_Global"));
  });
});

// ── filt ─────────────────────────────────────────────────────────────────
describe("filt", () => {
  const data = [
    { Partenaire: "Alpha", TypeCampagne: "Entrée" },
    { Partenaire: "Alpha", TypeCampagne: "Sortie" },
    { Partenaire: "Beta",  TypeCampagne: "Entrée" },
    { Partenaire: "Beta",  TypeCampagne: "Sortie" },
    { Partenaire: " Beta ", TypeCampagne: "Entrée" }, // espaces
  ];

  it("'Tous' sans type → retourne tout", () => {
    assert.equal(filt(data, "Tous", null).length, 5);
  });

  it("'Tous' avec type → filtre par type", () => {
    assert.equal(filt(data, "Tous", "Entrée").length, 3);
  });

  it("partenaire exact → filtre", () => {
    assert.equal(filt(data, "Alpha", null).length, 2);
  });

  it("partenaire avec espaces dans les données → normalize", () => {
    // " Beta " avec espace doit matcher "Beta"
    assert.equal(filt(data, "Beta", null).length, 3);
  });

  it("partenaire + type → intersection", () => {
    assert.equal(filt(data, "Alpha", "Entrée").length, 1);
  });

  it("partenaire inexistant → tableau vide", () => {
    assert.equal(filt(data, "Gamma", null).length, 0);
  });

  it("données vides → tableau vide", () => {
    assert.equal(filt([], "Tous", "Entrée").length, 0);
  });
});

// ── nomParticipant ────────────────────────────────────────────────────────
describe("nomParticipant", () => {
  it("Prenom + Nom → 'Prenom Nom'", () => {
    assert.equal(nomParticipant({ Prenom: "Alice", Nom: "Dupont", Email: "a@b.fr" }), "Alice Dupont");
  });

  it("Nom seulement → Nom", () => {
    assert.equal(nomParticipant({ Prenom: "", Nom: "Dupont", Email: "a@b.fr" }), "Dupont");
  });

  it("ni Prenom ni Nom → Email", () => {
    assert.equal(nomParticipant({ Prenom: "", Nom: "", Email: "a@b.fr" }), "a@b.fr");
  });

  it("null → chaîne vide", () => {
    assert.equal(nomParticipant(null), "");
  });

  it("undefined → chaîne vide", () => {
    assert.equal(nomParticipant(undefined), "");
  });
});

// ── processFiles — OneShot ────────────────────────────────────────────────
describe("processFiles — OneShot", () => {
  const makeRow = (email, date, score) => ({
    Email: email, Nom: "Test", Prenom: "User",
    Date_Debut: date, Score_Global: score,
    Palier: 1, Nom_Campagne: "Camp",
    Pct_Recherche: null, Pct_Interagir: null, Pct_Inserer: null,
    Pct_Docs: null, Pct_Securiser: null, Pct_Resoudre: null, Pct_Construire: null,
    Pct_Information: null, Pct_Communication: null, Pct_Creation: null,
    Pct_Protection: null, Pct_Environnement: null, Pct_Progression: null, Jalons: {}
  });

  it("une session OneShot → un enregistrement", () => {
    const files = [{ partenaire: "Alpha", mode: "oneshot", rows: [makeRow("a@b.fr", "2023-01-01", 0.5)] }];
    const result = processFiles(files);
    assert.equal(result.length, 1);
    assert.equal(result[0].Mode, "OneShot");
    assert.equal(result[0].Partenaire, "Alpha");
  });

  it("deux sessions même email → déduplique, conserve la plus récente", () => {
    const files = [{
      partenaire: "Alpha", mode: "oneshot",
      rows: [
        makeRow("a@b.fr", "2023-01-01", 0.5),
        makeRow("a@b.fr", "2023-06-01", 0.8),
      ]
    }];
    const result = processFiles(files);
    assert.equal(result.length, 1);
    assert.equal(result[0].Score_Global, 0.8);
    assert.equal(result[0].NbSessions, 2);
  });

  it("deux emails différents → deux enregistrements", () => {
    const files = [{
      partenaire: "Alpha", mode: "oneshot",
      rows: [makeRow("a@b.fr", "2023-01-01", 0.5), makeRow("b@b.fr", "2023-01-01", 0.6)]
    }];
    const result = processFiles(files);
    assert.equal(result.length, 2);
  });

  it("email vide → ignoré", () => {
    const files = [{
      partenaire: "Alpha", mode: "oneshot",
      rows: [makeRow("", "2023-01-01", 0.5)]
    }];
    const result = processFiles(files);
    assert.equal(result.length, 0);
  });
});

// ── processFiles — Cycle ──────────────────────────────────────────────────
describe("processFiles — Cycle", () => {
  const makeRow = (email, date, score) => ({
    Email: email, Nom: "Test", Prenom: "User",
    Date_Debut: date, Score_Global: score, Palier: 1, Nom_Campagne: "Camp",
    Pct_Recherche: null, Pct_Interagir: null, Pct_Inserer: null,
    Pct_Docs: null, Pct_Securiser: null, Pct_Resoudre: null, Pct_Construire: null,
    Pct_Information: null, Pct_Communication: null, Pct_Creation: null,
    Pct_Protection: null, Pct_Environnement: null, Pct_Progression: null, Jalons: {}
  });

  it("deux sessions même email → T1 (Entrée) + T2 (Sortie)", () => {
    const files = [{
      partenaire: "Beta", mode: "cycle",
      rows: [
        makeRow("a@b.fr", "2023-01-01", 0.4),
        makeRow("a@b.fr", "2023-06-01", 0.7),
      ]
    }];
    const result = processFiles(files);
    assert.equal(result.length, 2);
    const entree = result.find(r => r.TypeCampagne === "Entrée");
    const sortie = result.find(r => r.TypeCampagne === "Sortie");
    assert.ok(entree);
    assert.ok(sortie);
    assert.equal(entree.Score_Global, 0.4);
    assert.equal(sortie.Score_Global, 0.7);
  });

  it("une seule session → uniquement T1, pas de T2", () => {
    const files = [{
      partenaire: "Beta", mode: "cycle",
      rows: [makeRow("a@b.fr", "2023-01-01", 0.5)]
    }];
    const result = processFiles(files);
    assert.equal(result.length, 1);
    assert.equal(result[0].TypeCampagne, "Entrée");
  });

  it("calcule la durée entre T1 et T2 en jours", () => {
    const files = [{
      partenaire: "Beta", mode: "cycle",
      rows: [
        makeRow("a@b.fr", "2023-01-01", 0.4),
        makeRow("a@b.fr", "2023-04-01", 0.7),
      ]
    }];
    const result = processFiles(files);
    const entree = result.find(r => r.TypeCampagne === "Entrée");
    assert.equal(entree.Duree, 90);
  });

  it("partenaire vide → '(sans nom)'", () => {
    const files = [{
      partenaire: "", mode: "cycle",
      rows: [makeRow("a@b.fr", "2023-01-01", 0.5)]
    }];
    const result = processFiles(files);
    assert.equal(result[0].Partenaire, "(sans nom)");
  });
});
