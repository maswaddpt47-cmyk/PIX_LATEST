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

## 2. Backup daté avant toute modification

Avant de toucher un fichier existant, créer une copie datée :

```
Format : nomfichier.backup.YYYYMMDD-HHMM.ext
Exemple : pix-analyser-v3-6.backup.20260614-1120.html
```

Ce backup est commité **séparément** (commit `chore: backup ...`) avant la modification, pour permettre un retour arrière facile.

---

## 3. Un commit par modification logique

Chaque changement = un commit distinct avec préfixe explicite :

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `refactor:` | Restructuration sans changement de comportement |
| `chore:` | Backup, nettoyage, tâche technique |
| `style:` | Modifications CSS / UI sans impact fonctionnel |

---

## 4. Branche de travail

Toutes les modifications Claude se font sur la branche désignée en début de session (`claude/...`), jamais directement sur `main` sans autorisation explicite de l'utilisateur.

---

## Récapitulatif du flux par session

```
1. git pull origin main
2. Créer backup daté du fichier ciblé
3. Commit chore: backup ...
4. Appliquer les modifications
5. Commit feat/fix/refactor: <description claire>
6. Répéter 4-5 pour chaque modification logique
7. Push
```
