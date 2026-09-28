# Architecture de Lily

Ce document décrit le code **tel qu'il est**. Les raisons des choix (et les options écartées) sont dans [SPEC.md §K](SPEC.md#k-architecture-technique) et [§N](SPEC.md#n-décisions--prises-et-ouvertes).

## Vue d'ensemble

Un **monolithe modulaire** : un front React, une API NestJS, une base PostgreSQL. Pas de microservices ni de file de messages.

```text
Navigateur ── React (apps/web, Vite :5173)
                │  fetch /api/*  + cookie de session httpOnly
                │  (même origine grâce au proxy Vite en dev)
                ▼
             NestJS (apps/api, :3000, préfixe /api)
               Controllers → Services → client Prisma Next
                ▼
             PostgreSQL 17 (Docker Compose, :5432)
```

## Organisation du dépôt

```text
Lily/
├── apps/
│   ├── web/                    # Front React + Vite
│   │   ├── src/
│   │   │   ├── main.tsx, App.tsx   # providers + routes (React Router, data router)
│   │   │   ├── lib/                # client HTTP (api.ts), QueryClient, parser Markdown, utilitaires
│   │   │   ├── types/api.ts        # types des réponses de l'API (miroir des DTO)
│   │   │   ├── components/         # composants partagés (dialogues, états) ; ui/ = shadcn
│   │   │   ├── features/           # un dossier par domaine : auth, vaults, notes, folders,
│   │   │   │                       #   tags, graph, layout, settings (pages + hooks)
│   │   │   └── test/               # setup Vitest + helpers de rendu
│   │   └── vite.config.ts          # alias @, proxy /api, config Vitest
│   └── api/                    # API NestJS
│       ├── src/
│       │   ├── main.ts, app.setup.ts, app.module.ts
│       │   ├── config/env.ts        # lecture des variables d'environnement
│       │   ├── prisma/              # contract.prisma (schéma) + contrat généré + client
│       │   ├── common/              # décorateurs @Public/@CurrentUser, helpers d'erreurs
│       │   ├── auth/  users/        # comptes, session, guard global
│       │   ├── vaults/ notes/ folders/
│       │   ├── links/               # parser Markdown (pur), index des liens, backlinks, graphe
│       │   └── tags/
│       ├── migrations/              # état du schéma suivi par Prisma Next
│       └── test/                    # tests e2e + préparation de la base de test
├── docs/                       # SPEC, FEATURES, ARCHITECTURE, DEVELOPMENT
├── .github/workflows/ci.yml    # CI GitHub Actions
├── docker-compose.yml          # PostgreSQL de développement
└── package.json                # workspaces npm + scripts racine
```

`packages/*` est déclaré dans les workspaces mais n'existe pas encore : aucun code partagé pour l'instant (voir « Duplication assumée » plus bas).

## Frontend (`apps/web`)

- **Routage** : React Router en mode *data router*, nécessaire pour `useBlocker` (garde « modifications non enregistrées »). Deux gardes : `RequireAuth` (sinon `/login`, avec l'URL d'origine en mémoire) et `RedirectIfAuthenticated` (login/register inutiles une fois connecté).
- **État serveur** : TanStack Query pour tout ce qui vient de l'API (cache, chargement, invalidation). Un fichier de hooks par domaine (`useNotes`, `useVaults`…). Après toute modification de note, `invalidateKnowledge()` rafraîchit ce qui dépend des contenus : listes, backlinks, graphe, tags.
- **État d'UI** : `useState` local, plus un seul contexte React, `VaultContext` (vault courant + filtres de la sidebar). Pas de store global.
- **Client HTTP** (`lib/api.ts`) : `fetch` + `credentials: 'include'`. Toute réponse non-2xx devient une `ApiError(status, message)`. Un 401 hors `/auth/*` vide le cache, ce qui renvoie vers `/login`.
- **UI** : Tailwind CSS v4, composants shadcn/ui (Radix) copiés dans `components/ui/`, icônes Lucide, toasts `sonner`. La palette est définie par des variables CSS dans `index.css`, qui contient aussi la typographie du Markdown rendu.
- **Markdown** : `react-markdown` + `remark-gfm`, jamais `dangerouslySetInnerHTML`. `lib/markdown.ts` transforme `[[liens]]` et `#tags` en liens internes avant le rendu, en ignorant le code.
- **Graphe** : `react-force-graph-2d` (canvas), dans `features/graph/GraphView.tsx`.

## Backend (`apps/api`)

- **NestJS 12** en ESM. Chaque domaine est un module : controller (HTTP uniquement : params, DTO, codes) → service (règles métier et accès aux données).
- **Configuration globale** (`app.setup.ts`, partagée avec les e2e) : préfixe `/api`, `cookie-parser`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **Validation** : DTO `class-validator`. Messages d'erreur en français ; 400 avec détail par champ.
- **Erreurs** : format NestJS `{ statusCode, message, error }`. Violation d'unicité → 409 (traduite dans les services, `common/db-errors.ts`).
- **Autorisation** : chaque accès vérifie que la ressource appartient à l'utilisateur, via `findOwnedVaultOrThrow` et `findOwnedNoteOrThrow`. Une ressource d'un autre utilisateur donne **404**, jamais 403, pour ne pas révéler qu'elle existe.
- **Transactions** : création, modification et suppression de note mettent à jour l'index des liens et des tags dans la même transaction. Un renommage réécrit aussi les notes qui citent l'ancien titre.
- **Rate limiting** : `@nestjs/throttler`, 600 req/min globalement et 10 req/min sur register, login et changement de mot de passe.

L'API REST complète (routes, corps, codes) est décrite dans [SPEC.md §H](SPEC.md#h-api-rest). Seul écart : `POST /auth/register` renvoie aussi `defaultVaultId`, pour que le front ouvre directement le vault créé.

## Authentification

1. `register` / `login` : mot de passe haché avec **argon2**. Un JWT est signé (`sub = userId`, 7 jours, secret `JWT_SECRET`).
2. Le JWT est posé dans le cookie **`lily_session`** : `httpOnly`, `SameSite=Lax`, `Secure` en production. Le JavaScript du front n'y a jamais accès, ce qui protège contre le vol de session par XSS.
3. Un **guard global** (`auth.guard.ts`) lit le cookie sur chaque requête, sauf les routes `@Public()`, et attache l'utilisateur, récupérable avec `@CurrentUser()`.
4. `logout` efface le cookie. Il n'y a pas de révocation côté serveur : un JWT volé resterait valide jusqu'à son expiration, ce qui est acceptable en mono-utilisateur (voir SPEC §N-9).

## Données

### Prisma Next

Le schéma est **déclaré** dans `apps/api/src/prisma/contract.prisma`. `prisma contract emit` en génère `contract.json` et `contract.d.ts`, tous deux versionnés. Le client typé (`prisma/db.ts`) est injecté dans les services via le token `DB` du `PrismaModule`.

`npm run db:update` régénère le contrat et **aligne la base** sur celui-ci (`prisma db update`). C'est pratique en développement ; une vraie stratégie de migrations pour la production reste à mettre en place (Phase 10). Prisma Next est en version RC : voir SPEC §N-14.

### Modèle

```text
User 1──N Vault 1──N Note N──0..1 Folder (arbre via parentId)
                │      │
                │      ├── NoteLink (source → cible ou NULL) : index des [[liens]]
                │      └── NoteTag N──1 Tag
                ├──N Folder
                └──N Tag
```

| Table | Rôle | Contraintes notables |
|---|---|---|
| `users` | Comptes | `email` unique (stocké en minuscules) |
| `vaults` | Espaces isolés | unique (`ownerId`, `name`) ; supprimé avec l'utilisateur (cascade) |
| `folders` | Rangement hiérarchique | `parentId` → `folders` (`RESTRICT` : pas de suppression d'un dossier non vide) |
| `notes` | Notes Markdown | unique (`vaultId`, `lower(title)`) ; `folderId` → `folders` (`RESTRICT`) |
| `note_links` | Index dérivé des `[[liens]]` | unique (`sourceNoteId`, `targetTitle`) ; source en cascade, cible `SET NULL` (le lien devient fantôme) |
| `tags` / `note_tags` | Tags extraits du contenu | unique (`vaultId`, `name`) ; cascades |

Principe clé : **le contenu Markdown est la source de vérité**. `note_links` et `note_tags` sont des index recalculés à chaque enregistrement, jamais édités à la main. Un lien est orienté (A → B) et stocké une seule fois ; les backlinks de B sont la requête inverse. `targetTitle` est conservé pour qu'un lien fantôme se résolve automatiquement quand la note cible est créée.

Identifiants : UUID. Dates : ISO 8601 (`createdAt`, `updatedAt`).

## Docker

Aujourd'hui, Docker ne sert qu'à **PostgreSQL** en développement (`docker-compose.yml` : `postgres:17`, utilisateur, mot de passe et base `lily`, volume `postgres_data`). L'API et le front tournent directement sous Node pour un rechargement rapide. La conteneurisation de l'application est prévue en Phase 10 (voir [SPEC.md §L](SPEC.md#l-roadmap)).

## Tests

| Suite | Outil | Contenu | Commande |
|---|---|---|---|
| Unitaires API | Vitest | Parser Markdown : extraction des liens et tags, réécriture au renommage | `npm run test -w apps/api` |
| e2e API | Vitest + supertest + vraie base | Auth, isolation des vaults et notes entre utilisateurs, liens, tags, graphe | `npm run test:e2e` |
| Unitaires web | Vitest + Testing Library + jsdom | Liens et tags Markdown, `AuthForm`, `PasswordForm`, `RequireAuth` | `npm run test -w apps/web` |

Les e2e ne touchent jamais la base de développement. `test/global-setup.ts` crée si besoin `<base>_test` (ex. `lily_test`), y applique le schéma et la vide avant la suite.

## Duplication assumée

Le parser Markdown (`apps/api/src/links/markdown.ts` ↔ `apps/web/src/lib/markdown.ts`) et les types des DTO (`apps/web/src/types/api.ts`) existent en deux exemplaires. Si l'un change, l'autre doit suivre. Un `packages/shared` supprimerait cette duplication quand elle deviendra pénible.
