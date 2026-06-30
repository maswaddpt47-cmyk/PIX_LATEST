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

Toutes les modifications Claude se font sur la branche désignée en début de session (`claude/...`), jamais directement sur `main` sans autorisation explicite de l'utilisateur.

---

## Récapitulatif du flux par session

```
1. git pull origin main
2. Appliquer les modifications
3. Commit feat/fix/refactor: <description claire>
4. Répéter 2-3 pour chaque modification logique
5. Push
```
