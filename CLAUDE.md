# CLAUDE.md — Règles de travail pour ce dépôt

## 1. Git pull systématique en début de session

Avant de lire ou modifier le moindre fichier, toujours synchroniser :

```bash
git pull origin main
# et si on travaille sur une branche feature :
git pull origin <branche-de-travail>
```

Objectif : ne jamais partir d'une version obsolète et écraser des modifications faites entre deux sessions.

---

## 2. Un commit par modification logique

Chaque changement = un commit distinct avec préfixe explicite :

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `refactor:` | Restructuration sans changement de comportement |
| `chore:` | Nettoyage, tâche technique |
| `style:` | Modifications CSS / UI sans impact fonctionnel |

Git fait office d'historique et de filet de sécurité — pas besoin de backups manuels datés, chaque commit est déjà un point de retour.

---

## 3. Branche de travail

Les modifications Claude se font sur la branche désignée en début de session (`claude/...`). Le push final vers `main` est autorisé sans demande préalable.

---

## 4. Tests unitaires — règle obligatoire

| Fichier source | Fichier de tests | Runner |
|---|---|---|
| `utils.js` — fonctions bas niveau | `utils.test.js` | `node --test utils.test.js` |
| `logic.js` — logique métier | `logic.test.js` | `node --test logic.test.js` |

Ces fichiers sont chargés dans le navigateur (`<script src="utils.js">`, `<script src="logic.js">` dans `pix-analyser-v3-6.html`) ET testés sous Node.
Une seule source de vérité — ne jamais dupliquer une fonction entre `utils.js`/`logic.js` et le fichier principal.

Après toute modification de `utils.js` ou `logic.js` :
1. Modifier la fonction
2. Exécuter le runner correspondant
3. Commiter source + tests ensemble si un test a été mis à jour

Règles :
- Bug corrigé → corriger le code, pas le test
- Changement intentionnel → mettre à jour code ET test dans le même commit
- Ne jamais supprimer un test pour faire passer le commit
- La CI bloque le déploiement si un test échoue (job `test` dans `.github/workflows/deploy.yml`, prérequis du job `deploy`)

---

## Récapitulatif du flux par session

```
1. git pull origin main
2. Appliquer les modifications
3. Commit feat/fix/refactor: <description claire>
4. Répéter 2-3 pour chaque modification logique
5. Push
```
