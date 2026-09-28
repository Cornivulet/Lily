# Lily

[![CI](https://github.com/Cornivulet/Lily/actions/workflows/ci.yml/badge.svg)](https://github.com/Cornivulet/Lily/actions/workflows/ci.yml)

Application web de prise de notes et de gestion de connaissances personnelles, inspirée d'Obsidian : des notes en Markdown, reliées entre elles par des `[[wikilinks]]`, rangées dans des **vaults**, et visualisables sous forme de graphe.

## Pourquoi Lily

Les notes utiles ne vivent pas seules : une idée en appelle une autre. Lily permet d'écrire vite, en Markdown, et de **relier** les notes sans quitter le clavier. Les liens retour (backlinks) et le graphe font ensuite apparaître des connexions qu'on n'avait pas prévues.

Contrairement à Obsidian, les notes sont stockées sur un **serveur** (PostgreSQL) : on les retrouve depuis n'importe quel navigateur, et une application desktop (Electron) viendra plus tard comme simple client.

Lily est aussi un projet d'apprentissage, développé comme un vrai produit : architecture simple et lisible, typage strict, tests, CI. Principes : KISS, YAGNI, un monolithe modulaire plutôt que des microservices.

## Fonctionnalités

- **Comptes** : inscription, connexion, déconnexion, changement de mot de passe.
- **Vaults** : plusieurs espaces de notes indépendants par utilisateur (perso, travail…).
- **Notes Markdown** : édition avec aperçu en direct, rendu GFM (tableaux, listes de tâches…), `Ctrl+S`.
- **Wikilinks** `[[Titre]]` et `[[Titre|texte]]`, liens vers des notes pas encore créées, renommage qui met à jour les liens.
- **Backlinks** : « Mentionnée dans » sous chaque note.
- **Tags** `#tag` écrits dans le texte, filtre par tag.
- **Dossiers** imbriqués, recherche plein texte simple, tri.
- **Graphe** du vault et graphe local de chaque note.

Détail du comportement : [docs/FEATURES.md](docs/FEATURES.md).

## Stack

| | |
|---|---|
| Frontend (`apps/web`) | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix), Lucide, React Router, TanStack Query, react-markdown |
| Backend (`apps/api`) | NestJS 12, TypeScript, Prisma Next, class-validator, JWT en cookie httpOnly, argon2 |
| Données | PostgreSQL 17 (Docker Compose) |
| Qualité | Vitest, Testing Library, supertest, ESLint, oxlint, Prettier, GitHub Actions |

## Démarrage rapide

Prérequis : Node.js 24, npm, Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # puis changer JWT_SECRET
npm run db:up                            # PostgreSQL dans Docker
npm run db:migrate                       # applique les migrations (crée les tables)
npm run dev                              # API :3000 + web :5173
```

Ouvrir http://localhost:5173 et créer un compte.

| Commande | Effet |
|---|---|
| `npm run dev` | API (watch) + front (Vite) en parallèle |
| `npm run lint` | oxlint (API) + ESLint (web) |
| `npm test` | tests unitaires API + web |
| `npm run test:e2e` | tests e2e de l'API sur une base `lily_test` dédiée |
| `npm run build` | build de production des deux applications |

Toute l'application en conteneurs, comme en production (seul Docker est nécessaire) :

```bash
cp .env.example .env                     # puis renseigner les secrets
docker compose -f docker-compose.prod.yml up -d --build
```

Guide complet : [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Document | Contenu |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Spécification : vision, cas d'usage, API, modèle, **roadmap et état d'avancement** (§M), décisions |
| [docs/FEATURES.md](docs/FEATURES.md) | Ce que fait réellement chaque fonctionnalité et ses règles |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Organisation du code, couches, auth, données, tests |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Installation, variables d'environnement, Prisma, tests, Git et CI |
