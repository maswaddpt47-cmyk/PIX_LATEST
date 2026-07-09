const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  decodeEntities, parseDate, avg, nn, r100, pct,
  median, safeAvg, num, bool, fmtDate
} = require("./utils.js");

// ── decodeEntities ────────────────────────────────────────────────────────
describe("decodeEntities", () => {
  it("cas nominal — chaîne sans entités", () => {
    assert.equal(decodeEntities("bonjour"), "bonjour");
  });
  it("&#39; → apostrophe", () => {
    assert.equal(decodeEntities("l&#39;école"), "l'école");
  });
  it("&#x27; → apostrophe", () => {
    assert.equal(decodeEntities("d&#x27;accord"), "d'accord");
  });
  it("&quot; → guillemet", () => {
    assert.equal(decodeEntities("&quot;texte&quot;"), '"texte"');
  });
  it("&amp; → &", () => {
    assert.equal(decodeEntities("A &amp; B"), "A & B");
  });
  it("guillemet typographique Unicode → apostrophe", () => {
    assert.equal(decodeEntities("l’eau"), "l'eau");
  });
  it("chaîne vide → chaîne vide", () => {
    assert.equal(decodeEntities(""), "");
  });
});

// ── parseDate ─────────────────────────────────────────────────────────────
describe("parseDate", () => {
  it("format DD/MM/YYYY", () => {
    const d = parseDate("15/01/2023");
    assert.equal(d.getFullYear(), 2023);
    assert.equal(d.getMonth(), 0);
    assert.equal(d.getDate(), 15);
  });
  it("format YYYY-MM-DD", () => {
    const d = parseDate("2023-06-20");
    assert.equal(d.getFullYear(), 2023);
    assert.equal(d.getMonth(), 5);
    assert.equal(d.getDate(), 20);
  });
  it("null → null", () => {
    assert.equal(parseDate(null), null);
  });
  it("chaîne vide → null", () => {
    assert.equal(parseDate(""), null);
  });
  it("chaîne invalide → null", () => {
    assert.equal(parseDate("pas-une-date"), null);
  });
  it("gère les espaces en début/fin", () => {
    const d = parseDate("  2023-01-01  ");
    assert.equal(d.getFullYear(), 2023);
  });
});

// ── avg ───────────────────────────────────────────────────────────────────
describe("avg", () => {
  it("cas nominal", () => {
    assert.equal(avg([1, 2, 3]), 2);
  });
  it("tableau vide → 0", () => {
    assert.equal(avg([]), 0);
  });
  it("valeur unique", () => {
    assert.equal(avg([5]), 5);
  });
  it("valeurs décimales", () => {
    assert.ok(Math.abs(avg([0.1, 0.3]) - 0.2) < 1e-10);
  });
});

// ── nn ────────────────────────────────────────────────────────────────────
describe("nn", () => {
  it("filtre les null", () => {
    assert.deepEqual(nn([1, null, 2, null, 3]), [1, 2, 3]);
  });
  it("filtre les undefined", () => {
    assert.deepEqual(nn([1, undefined, 2]), [1, 2]);
  });
  it("tableau sans null → inchangé", () => {
    assert.deepEqual(nn([1, 2, 3]), [1, 2, 3]);
  });
  it("tout null → tableau vide", () => {
    assert.deepEqual(nn([null, null]), []);
  });
  it("tableau vide → tableau vide", () => {
    assert.deepEqual(nn([]), []);
  });
  it("conserve 0 et false", () => {
    assert.deepEqual(nn([0, false, null]), [0, false]);
  });
});

// ── r100 ──────────────────────────────────────────────────────────────────
describe("r100", () => {
  it("0.72 → 72", () => {
    assert.equal(r100(0.72), 72);
  });
  it("arrondit au plus proche", () => {
    assert.equal(r100(0.725), 73);
  });
  it("0 → 0", () => {
    assert.equal(r100(0), 0);
  });
  it("null → 0", () => {
    assert.equal(r100(null), 0);
  });
  it("1 → 100", () => {
    assert.equal(r100(1), 100);
  });
});

// ── pct ───────────────────────────────────────────────────────────────────
describe("pct", () => {
  it("0.72 → '72%'", () => {
    assert.equal(pct(0.72), "72%");
  });
  it("0 → '0%'", () => {
    assert.equal(pct(0), "0%");
  });
  it("null → '—'", () => {
    assert.equal(pct(null), "—");
  });
  it("undefined → '—'", () => {
    assert.equal(pct(undefined), "—");
  });
  it("1 → '100%'", () => {
    assert.equal(pct(1), "100%");
  });
});

// ── median ────────────────────────────────────────────────────────────────
describe("median", () => {
  it("nombre impair d'éléments", () => {
    assert.equal(median([1, 2, 3, 4, 5]), 3);
  });
  it("nombre pair d'éléments", () => {
    assert.equal(median([1, 2, 3, 4]), 2.5);
  });
  it("tableau vide → null", () => {
    assert.equal(median([]), null);
  });
  it("valeur unique", () => {
    assert.equal(median([7]), 7);
  });
  it("trie les valeurs avant calcul", () => {
    assert.equal(median([5, 1, 3]), 3);
  });
  it("deux éléments", () => {
    assert.equal(median([2, 8]), 5);
  });
});

// ── safeAvg ───────────────────────────────────────────────────────────────
describe("safeAvg", () => {
  it("cas nominal — calcule la moyenne en %", () => {
    const arr = [{ score: 0.5 }, { score: 0.7 }];
    assert.equal(safeAvg(arr, "score"), 60);
  });
  it("tableau vide → null", () => {
    assert.equal(safeAvg([], "score"), null);
  });
  it("tous les champs null → null", () => {
    const arr = [{ score: null }, { score: null }];
    assert.equal(safeAvg(arr, "score"), null);
  });
  it("ignore les null et calcule sur les valides", () => {
    const arr = [{ score: 0.6 }, { score: null }, { score: 0.8 }];
    assert.equal(safeAvg(arr, "score"), 70);
  });
});

// ── num ───────────────────────────────────────────────────────────────────
describe("num", () => {
  it("valeur décimale string → float", () => {
    assert.equal(num("0.72"), 0.72);
  });
  it("valeur entière >1 → divisée par 100", () => {
    assert.equal(num("72"), 0.72);
  });
  it("virgule française → point", () => {
    assert.equal(num("0,72"), 0.72);
  });
  it("avec symbole %", () => {
    assert.equal(num("72%"), 0.72);
  });
  it("avec espaces (milliers)", () => {
    assert.equal(num("1 234"), 12.34);
  });
  it("chaîne invalide → null", () => {
    assert.equal(num("abc"), null);
  });
  it("chaîne vide → null", () => {
    assert.equal(num(""), null);
  });
  it("0 → 0", () => {
    assert.equal(num("0"), 0);
  });
  it("1 → 0.01 (car ≤1)", () => {
    assert.equal(num("1"), 1);
  });
  it("100 → 1 (normalisé)", () => {
    assert.equal(num("100"), 1);
  });
});

// ── bool ─────────────────────────────────────────────────────────────────
describe("bool", () => {
  it("'oui' → true", () => assert.equal(bool("oui"), true));
  it("'Oui' (casse) → true", () => assert.equal(bool("Oui"), true));
  it("'o' → true", () => assert.equal(bool("o"), true));
  it("'true' → true", () => assert.equal(bool("true"), true));
  it("'non' → false", () => assert.equal(bool("non"), false));
  it("'n' → false", () => assert.equal(bool("n"), false));
  it("'false' → false", () => assert.equal(bool("false"), false));
  it("valeur inconnue → null", () => assert.equal(bool("maybe"), null));
  it("chaîne vide → null", () => assert.equal(bool(""), null));
  it("undefined → null", () => assert.equal(bool(undefined), null));
});

// ── fmtDate ───────────────────────────────────────────────────────────────
describe("fmtDate", () => {
  it("format DD/MM/YYYY → retourne une chaîne non vide", () => {
    const result = fmtDate("15/01/2023");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
    assert.ok(result !== "—");
  });
  it("format YYYY-MM-DD → retourne une chaîne non vide", () => {
    const result = fmtDate("2023-06-20");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });
  it("null → '—'", () => {
    assert.equal(fmtDate(null), "—");
  });
  it("chaîne vide → '—'", () => {
    assert.equal(fmtDate(""), "—");
  });
  it("chaîne invalide → retourne la chaîne originale", () => {
    assert.equal(fmtDate("pas-une-date"), "pas-une-date");
  });
});
