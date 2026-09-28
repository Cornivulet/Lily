# Développer sur Lily

## Prérequis

- **Node.js 24** (version utilisée par la CI) et npm
- **Docker** (pour PostgreSQL)
- Git

## Installation

```bash
git clone https://github.com/Cornivulet/Lily.git
cd Lily
npm install                              # installe les deux applications (workspaces npm)
cp apps/api/.env.example apps/api/.env
```

### Variables d'environnement (`apps/api/.env`)

| Variable | Exemple | Rôle |
|---|---|---|
| `DATABASE_URL` | `postgresql://lily:lily@localhost:5432/lily` | Base PostgreSQL. Les e2e utilisent automatiquement `<base>_test`. |
| `JWT_SECRET` | `openssl rand -hex 32` | Clé de signature des sessions. **Obligatoire** : l'API refuse de démarrer sans elle. |
| `PORT` | `3000` | Port de l'API (optionnel, 3000 par défaut). Le proxy Vite pointe sur 3000. |
| `NODE_ENV` | `production` | Optionnel. En `production`, le cookie de session est `Secure` (HTTPS obligatoire). |

Le front n'a pas de variable d'environnement : il appelle `/api`, relayé par Vite vers `http://localhost:3000`. Les fichiers `.env` ne sont jamais versionnés (seul `.env.example` l'est).

## Lancer l'application

```bash
npm run db:up        # PostgreSQL 17 dans Docker (conteneur lily-postgres)
npm run db:migrate   # applique les migrations de apps/api/migrations/
npm run dev          # API (watch, :3000) + web (Vite, :5173)
```

Puis ouvrir http://localhost:5173.

Pour lancer les deux applications séparément : `npm run start:dev -w apps/api` et `npm run dev -w apps/web`.

### PostgreSQL et Docker

- `docker compose up -d postgres` (ou `npm run db:up`) démarre la base. Les données vivent dans le volume `postgres_data` et survivent au redémarrage.
- `docker compose stop` l'arrête. `docker compose down -v` **supprime** aussi les données.
- Console SQL : `docker exec -it lily-postgres psql -U lily lily`.

### Modifier le schéma (Prisma Next)

Le schéma évolue par **migrations versionnées**, les mêmes en dev, en test, en CI et en production.

1. Éditer `apps/api/src/prisma/contract.prisma`.
2. `npm run migration:plan -w apps/api` : régénère `contract.json` / `contract.d.ts`, puis crée un dossier `apps/api/migrations/app/<date>_<nom>/` qui décrit les opérations à appliquer. **Le relire** (`migration.ts`, `ops.json`), surtout si une opération peut perdre des données.
3. `npm run db:migrate` : applique la migration à la base de dev.
4. Commiter le `.prisma`, les fichiers générés et tout `apps/api/migrations/`.

`npm run test:e2e` applique les migrations à la base `lily_test` : un changement de contrat sans migration fait donc échouer les e2e, en local comme en CI.

Pour prototyper, `npm run db:update` aligne directement la base de dev sur le contrat, sans migration. Il faut quand même planifier la migration avant de commiter. Documentation de l'outil : `apps/api/prisma-next.md`.

## Stack de production (Docker)

`docker-compose.prod.yml` fait tourner Lily comme en production, sur n'importe quelle machine qui a Docker (Node n'est pas nécessaire) :

| Service | Image | Rôle |
|---|---|---|
| `postgres` | `postgres:17` | Base de données, non exposée hors de Docker, volume `postgres_data` |
| `migrate` | `apps/api/Dockerfile`, cible `migrate` | Applique les migrations en attente, puis s'arrête |
| `api` | `apps/api/Dockerfile` | API NestJS (`NODE_ENV=production`, utilisateur non root). Démarre après `migrate` |
| `web` | `apps/web/Dockerfile` | Caddy : sert le front et relaie `/api` vers `api`. Démarre quand l'API est « healthy » |

```bash
cp .env.example .env     # renseigner POSTGRES_PASSWORD et JWT_SECRET (openssl rand -hex …)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # état ; `logs -f api` pour les journaux
```

Puis ouvrir `http://localhost` (ou `http://localhost:<HTTP_PORT>`).

- Le projet Compose s'appelle `lily-prod` : ses conteneurs et volumes sont séparés de la base de développement.
- **Mise à jour** : `git pull` puis la même commande `up -d --build`. Les nouvelles migrations sont appliquées automatiquement avant le redémarrage de l'API.
- **Arrêt** : `docker compose -f docker-compose.prod.yml down`. Avec `-v`, **les données sont supprimées**.
- **Sauvegarde** : `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U lily lily > lily-$(date +%F).sql`.
- **HTTPS** : sur un serveur dont le nom de domaine pointe vers la machine, mettre `SITE_ADDRESS=lily.example.com` (ports 80 et 443 ouverts). Caddy obtient et renouvelle alors les certificats. En `NODE_ENV=production`, le cookie de session est `Secure` : hors `localhost`, Lily doit donc être servie en HTTPS.
- L'image `migrate` pèse environ 2,9 Go, car le CLI de Prisma Next (RC) est lourd. Elle ne sert qu'au démarrage ; l'image de l'API fait environ 570 Mo et celle du front environ 90 Mo.

## Qualité

| Commande (à la racine) | Effet |
|---|---|
| `npm run lint` | oxlint sur l'API, ESLint sur le web |
| `npm test` | tests unitaires API puis web |
| `npm run test:e2e` | tests e2e de l'API (PostgreSQL doit tourner) |
| `npm run build` | `nest build` + `tsc -b && vite build` (le build web vérifie aussi les types) |

Autres commandes utiles :

- `npm run test:watch -w apps/web` (ou `-w apps/api`) : tests en mode watch.
- `npm run test:cov -w apps/api` : couverture.
- `npm run format -w apps/web` / `-w apps/api` : Prettier. ⚠️ Une partie du code existant n'est pas encore formatée : lancer Prettier sur un fichier peut produire un gros diff sans rapport avec la modification. Formater plutôt dans un commit dédié.

Avant de pousser : `npm run lint && npm test && npm run build && npm run test:e2e`, c'est-à-dire exactement ce que vérifie la CI.

## Git

### Branches

- `main` : branche stable. On n'y pousse pas directement : les changements arrivent par pull request.
- `feat/<sujet>`, `fix/<sujet>`, `docs/<sujet>`… : une branche par sujet, créée depuis `main`, fusionnée par PR une fois la CI verte.

### Commits

Messages en anglais au format [Conventional Commits](https://www.conventionalcommits.org/) : `type(scope): description`.

- types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`
- scopes : `api`, `web`, ou rien pour ce qui touche au dépôt entier

Exemples tirés de l'historique : `feat(api): auth, vaults, notes…`, `test(web): add Vitest and Testing Library tests`, `docs: mark phase 9 as done in the spec`.

Un commit = une étape cohérente qui passe lint et tests.

### Workflow

1. Lire [SPEC.md §M](SPEC.md#m-état-davancement--règles-pour-lia) pour savoir quelle est la prochaine étape.
2. Créer une branche, découper le travail en petits commits.
3. Mettre à jour les tests, puis la doc concernée (`FEATURES.md`, `ARCHITECTURE.md`) et **§M de la spec** à la fin d'une phase.
4. Pousser et ouvrir une PR vers `main` ; la CI doit être verte avant la fusion.

## CI

`.github/workflows/ci.yml` s'exécute sur chaque push et chaque pull request. Deux tâches en parallèle sur `ubuntu-latest`.

**`check`**, avec Node 24 et un service `postgres:17` configuré comme le `docker-compose.yml` :

1. `npm ci`
2. lint
3. tests unitaires API
4. tests unitaires web
5. build
6. tests e2e (sur la base `lily_test`, construite par les migrations)

**`docker`** : construit les images de production, démarre `docker-compose.prod.yml` (migrations, API healthy, Caddy) et appelle le front et `/api/health` à travers Caddy.

Un nouveau push sur la même branche annule l'exécution en cours. Résultats : onglet **Actions** du dépôt, ou `gh run list` / `gh run watch`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `Missing required environment variable JWT_SECRET` | `apps/api/.env` absent ou incomplet |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL non démarré : `npm run db:up` |
| Page blanche ou 502 sur `/api/...` | L'API ne tourne pas, ou n'écoute pas sur le port 3000 |
| `429 Too Many Requests` sur la connexion | Limite de 10 tentatives par minute : attendre une minute |
| Erreurs SQL « relation does not exist » | Schéma pas à jour : `npm run db:migrate` |
