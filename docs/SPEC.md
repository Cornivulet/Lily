# Lily — Spécification fonctionnelle et technique

> Document de référence. Toute IA ou contributeur qui implémente une fonctionnalité de Lily doit lire ce document d'abord, puis la section **§M État d'avancement** pour savoir quelle est la prochaine étape.
>
> Ce document dit ce qui est **voulu** et pourquoi. Ce qui **existe** est décrit dans [FEATURES.md](FEATURES.md) (comportement), [ARCHITECTURE.md](ARCHITECTURE.md) (code, données) et [DEVELOPMENT.md](DEVELOPMENT.md) (installation, Git, CI).
>
> Niveaux de maturité utilisés partout : **MVP** · **V1** · **V2** · **Idée future** · **Hors scope**.
> Statut d'implémentation : ✅ fait · 🟡 partiel/prototype · ⬜ à faire.

## 0. État actuel du code (au 2026-09-28)

Ce qui **existe réellement** (à ne pas confondre avec ce qui est envisagé). Le détail par phase est dans §M.

| Zone | État | Détail |
|---|---|---|
| Monorepo | ✅ | npm workspaces `apps/*` (aucun `packages/*` pour l'instant) ; scripts racine `dev`, `db:up`, `db:migrate`, `db:update`, `build`, `lint`, `test`, `test:e2e` |
| `apps/api` | ✅ | NestJS 12 (ESM), préfixe `/api`, `ValidationPipe` (class-validator), Vitest, oxlint. Modules `auth`, `users`, `vaults`, `notes`, `folders`, `links`, `tags` |
| Prisma | ✅ | Prisma Next `8.0.0-rc` ; contrat `src/prisma/contract.prisma` : `User`, `Vault`, `Folder`, `Note`, `NoteLink`, `Tag`, `NoteTag` |
| Auth | ✅ | JWT en cookie httpOnly, guard global (`@Public()` pour les exceptions), argon2, rate limiting sur register/login/password |
| Knowledge | ✅ | `[[wikilinks]]` et `#tags` indexés à chaque save ; renommage qui réécrit les références ; backlinks, liens sortants, graphe du vault et graphe local |
| `apps/web` | ✅ | React 19, Vite 8, TS 6, Tailwind v4, shadcn/ui, React Router (data router), TanStack Query, react-markdown + remark-gfm, `react-force-graph-2d`, sonner. UI en français |
| Écrans | ✅ | Login, Register, Vaults, Vault (sidebar : sélecteur de vault, recherche, filtres, arbre de dossiers/notes), Note (lecture/édition, aperçu, backlinks, graphe local), Graphe, Settings (profil, mot de passe, déconnexion) |
| Tests | ✅ | API : tests unitaires du parser Markdown, e2e (auth, isolation vaults/notes, knowledge) sur une base séparée. Web : Vitest + Testing Library (liens/tags Markdown, `AuthForm`, `PasswordForm`, `RequireAuth`). Parcours complet vérifié dans un navigateur (Chromium) le 2026-09-28 |
| CI | ✅ | GitHub Actions (`.github/workflows/ci.yml`) : lint, tests unitaires API et web, build, e2e sur un service PostgreSQL 17, à chaque push et PR |
| Documentation | ✅ | `README.MD`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md` |
| PostgreSQL | ✅ | `docker-compose.yml` : service `postgres:17` (user/pass/db `lily`), port 5432 |
| Docker | ✅ | Images API (runtime + job de migration) et web (Caddy), `docker-compose.prod.yml`, migrations versionnées, testés en CI |
| Déploiement | ⬜ | Rien de déployé : local uniquement pour l'instant (§N-18) |

---

## A. Vision produit

**Lily est un carnet de connaissances personnel en ligne** : on y écrit des notes en Markdown, rangées dans des vaults, et reliées entre elles par des liens `[[...]]`. Lily transforme ces liens en backlinks et en graphe pour que l'utilisateur voie comment ses idées se connectent.

**Problème résolu.** Les notes prises au fil de l'eau (cours, veille technique, idées, projets) finissent éparpillées et isolées : on sait qu'on a écrit quelque chose, mais on ne le retrouve pas, et surtout on ne voit pas les rapports entre les sujets. Les dossiers seuls imposent une seule classification ; une note sur « JWT » est à la fois de la sécurité, du NestJS et du projet Lily.

**Proposition de valeur.**
1. Écrire vite, en texte brut Markdown, sans friction.
2. Relier les idées en tapant simplement `[[Autre note]]`.
3. Retrouver par recherche, par liens entrants (backlinks) et visuellement (graphe).
4. Séparer les contextes (Perso / Travail / Apprentissage) dans des vaults indépendants.

**Concept central : la note liée.** L'unité de Lily n'est pas le document isolé mais la *note dans son réseau*. Chaque note est un nœud ; chaque `[[lien]]` est une arête. Les dossiers et tags sont des aides au rangement ; les liens sont la structure de la connaissance.

**Ce qui distingue Lily d'un CRUD de notes.**
- Le contenu est *interprété* : le backend extrait les liens à chaque sauvegarde et maintient un index (`NoteLink`).
- La navigation est *relationnelle* : depuis une note, on voit ce qui y renvoie (backlinks) et son voisinage (graphe local).
- La base de connaissances est *visualisable* : graphe global, puis statistiques (V2).

**Différence avec Obsidian.** Obsidian est local-first (fichiers sur disque). Lily est **serveur-first** : les données vivent dans PostgreSQL derrière une API, ce qui permet d'accéder à ses notes depuis n'importe quel navigateur et plus tard depuis un client desktop Electron. Lily ne vise pas l'écosystème de plugins d'Obsidian.

**Double objectif assumé.** Lily est aussi un projet d'apprentissage (React, NestJS, PostgreSQL, Prisma, Docker, auth). Chaque choix technique privilégie ce qu'on peut comprendre et vérifier étape par étape.

---

## B. Personas

Lily est avant tout un outil **mono-utilisateur par compte** (chacun ses données, pas de partage). Trois profils réels, pas plus :

### P1 — Le développeur en apprentissage (utilisateur principal : l'auteur)
- **Profil** : développeur qui apprend plusieurs technos en parallèle et documente ce qu'il apprend.
- **Besoin** : capturer des notes techniques (commandes, snippets, concepts) et les retrouver.
- **Objectif** : se construire une base de connaissances personnelle réutilisable.
- **Problème** : notes éparpillées (fichiers, onglets, bookmarks), liens entre concepts perdus (« JWT » ↔ « Guards NestJS » ↔ « Cookies »).
- **Lily aide** : Markdown + code blocks, wikilinks entre concepts, recherche plein texte, graphe pour voir les zones de connaissance.

### P2 — L'étudiant / autodidacte
- **Profil** : suit des cours, lit, prépare des examens ou des certifications.
- **Besoin** : prendre des notes par cours et relier les notions entre matières.
- **Objectif** : réviser en naviguant par concepts plutôt que par chapitres.
- **Problème** : les notes linéaires ne montrent pas les dépendances entre notions.
- **Lily aide** : un vault par domaine, dossiers par cours, backlinks pour voir « où cette notion est utilisée ».

### P3 — Le professionnel qui sépare ses contextes
- **Profil** : utilise les mêmes outils pour sa vie perso et son travail.
- **Besoin** : cloisonner strictement les contextes.
- **Objectif** : ne jamais mélanger notes de réunion et notes personnelles.
- **Problème** : un seul espace de notes devient un fourre-tout.
- **Lily aide** : plusieurs vaults isolés (recherche, liens et graphe restent par vault).

---

## C. Use cases

Acteur unique : **Utilisateur** (U). Système : **Lily** (L). Sauf mention, précondition commune : *U est authentifié* ; « le vault courant » est celui ouvert dans l'URL.

### Compte

**UC-01 — Créer un compte** · MVP
- Précondition : U n'est pas connecté.
- Scénario : 1. U ouvre `/register`. 2. Saisit email + mot de passe (+ confirmation). 3. L valide (email valide, mot de passe ≥ 8 caractères). 4. L crée le compte (mot de passe haché) **et un vault par défaut « Mon vault »**. 5. L connecte U et le redirige vers ce vault.
- Alternatifs : 3a. Email déjà utilisé → erreur « Cet email est déjà utilisé ». 3b. Données invalides → erreurs par champ.
- Résultat : compte + vault par défaut créés, U connecté.

**UC-02 — Se connecter** · MVP
- Précondition : U a un compte, n'est pas connecté.
- Scénario : 1. U ouvre `/login`. 2. Saisit email + mot de passe. 3. L vérifie. 4. L pose la session (cookie). 5. Redirection vers le dernier vault ouvert, sinon la liste des vaults.
- Alternatifs : 3a. Identifiants invalides → message générique « Email ou mot de passe incorrect » (ne pas révéler lequel).
- Résultat : U connecté.

**UC-03 — Se déconnecter** · MVP
- Scénario : 1. U clique « Se déconnecter » (sidebar). 2. L supprime la session. 3. Redirection `/login`.
- Résultat : plus aucune route protégée n'est accessible.

**UC-04 — Accès protégé** · MVP (règle transverse)
- Scénario : U non connecté ouvre une URL protégée → redirection `/login`. U tente d'accéder à une ressource d'un autre utilisateur → L répond 404 (pas 403, pour ne pas révéler l'existence).

### Vaults

**UC-10 — Lister et ouvrir ses vaults** · MVP
- Scénario : 1. U ouvre `/vaults` (ou le sélecteur de vault de la sidebar). 2. L affiche ses vaults (nom, nombre de notes, date de modif). 3. U en choisit un. 4. L ouvre `/vaults/:vaultId`.
- Résultat : la sidebar affiche les notes du vault.

**UC-11 — Créer un vault** · MVP
- Scénario : 1. U clique « Nouveau vault ». 2. Saisit un nom. 3. L crée le vault et l'ouvre.
- Alternatifs : 2a. Nom vide ou déjà utilisé par U → erreur.

**UC-12 — Renommer un vault** · MVP
- Scénario : U renomme depuis la liste des vaults ; mêmes contraintes que UC-11.

**UC-13 — Supprimer un vault** · MVP
- Scénario : 1. U demande la suppression. 2. L affiche une confirmation indiquant le nombre de notes qui seront supprimées ; U doit retaper le nom du vault. 3. L supprime le vault et tout son contenu (cascade).
- Alternatifs : 2a. C'est le dernier vault → autorisé ; U arrive sur `/vaults` vide avec un appel à créer.
- Résultat : suppression définitive (pas de corbeille en MVP).

### Notes

**UC-20 — Créer une note** · MVP
- Scénario : 1. U clique « Nouvelle note ». 2. L crée immédiatement une note « Sans titre » (suffixée ` 2`, ` 3`… si nécessaire) et l'ouvre en mode édition. 3. U saisit titre et contenu Markdown. 4. U clique « Enregistrer » (ou Ctrl+S). 5. L persiste.
- Alternatifs : 4a. Titre déjà pris dans le vault → erreur sur le champ titre. 4b. U quitte sans enregistrer → confirmation « Modifications non enregistrées ».
- Résultat : la note apparaît dans la liste de la sidebar.

**UC-21 — Consulter une note** · MVP
- Scénario : 1. U clique une note dans la sidebar. 2. L charge la note et affiche le Markdown rendu (mode lecture). L'URL devient `/vaults/:vaultId/notes/:noteId` (partageable/rechargeable).
- Alternatifs : note introuvable → écran « Note introuvable ».

**UC-22 — Modifier une note** · MVP
- Scénario : 1. U clique « Modifier ». 2. L affiche l'éditeur (textarea Markdown + aperçu). 3. U modifie titre et/ou contenu. 4. « Enregistrer » → L persiste et met à jour `updatedAt`. 5. Retour au mode lecture.
- Alternatifs : 4a. « Annuler » → contenu restauré. 4b. Erreur réseau → message, le texte saisi est conservé dans l'éditeur.
- Règle de concurrence : *last write wins* (acceptable en mono-utilisateur).

**UC-23 — Supprimer une note** · MVP
- Scénario : 1. U clique « Supprimer ». 2. Confirmation. 3. L supprime définitivement. 4. U est redirigé vers le vault.
- V1 : les liens qui pointaient vers cette note deviennent « non résolus » (cf. UC-30).

**UC-24 — Rechercher une note** · MVP (simple) / V2 (avancée)
- Scénario MVP : 1. U tape dans le champ de recherche de la sidebar. 2. Après ~300 ms, L cherche dans le vault courant les notes dont le **titre ou le contenu** contient le texte (insensible à la casse). 3. La liste de la sidebar est filtrée.
- V2 : classement par pertinence, extraits surlignés, filtres par tag/dossier.

**UC-25 — Trier la liste des notes** · V1
- U choisit tri par titre / date de modification / date de création.

### Knowledge management

**UC-30 — Lier deux notes par wikilink** · V1
- Scénario : 1. En édition, U tape `[[Nom d'une note]]`. 2. À l'enregistrement, L extrait les liens du contenu, les résout par titre dans le vault et met à jour l'index `NoteLink`. 3. En mode lecture, `[[Nom]]` est rendu comme un lien cliquable vers la note.
- Alternatifs : 2a. Aucune note ne porte ce titre → le lien est stocké comme **non résolu** et affiché différemment (style « fantôme ») ; cliquer dessus propose de créer la note. 2b. Syntaxe alias `[[Titre|texte affiché]]` → supportée (V1).
- Résultat : les backlinks et le graphe reflètent le lien.

**UC-31 — Voir les backlinks d'une note** · V1
- Scénario : en bas de la note, L affiche « Mentionnée dans » : la liste des notes qui la lient, cliquables.

**UC-32 — Renommer une note liée** · V1
- Scénario : 1. U renomme la note « A » en « B ». 2. L met à jour, **dans une transaction**, le texte `[[A]]` → `[[B]]` dans toutes les notes du vault qui la référencent, puis l'index. 3. L indique « N notes mises à jour ».
- Résultat : aucun lien cassé par un renommage.

**UC-33 — Visualiser le graphe du vault** · V1
- Scénario : 1. U ouvre « Graphe ». 2. L affiche toutes les notes du vault (nœuds, taille ∝ nombre de liens) et les liens résolus (arêtes). 3. U zoome, déplace, survole (titre), clique un nœud → ouvre la note.
- Alternatifs : vault sans lien → nœuds isolés + message d'aide expliquant `[[...]]`.

**UC-34 — Visualiser le graphe local d'une note** · V1
- Scénario : depuis une note, U ouvre le panneau « Graphe local » : la note + ses voisins directs (liens sortants et entrants), profondeur 1 (2 en option).

### Organisation

**UC-40 — Ranger des notes dans des dossiers** · V1
- Scénario : U crée un dossier (éventuellement imbriqué), déplace une note dedans (menu « Déplacer vers… » ; glisser-déposer en V2). La sidebar affiche l'arborescence.
- Alternatifs : suppression d'un dossier non vide → refusée en V1 (message « Déplacez ou supprimez d'abord les notes »).

**UC-41 — Taguer une note** · V1
- Scénario : U écrit `#tag` dans le contenu ; à l'enregistrement, L extrait les tags (même mécanisme que les liens). U filtre la liste par tag.

**UC-42 — Favoris** · V2 — marquer une note, section « Favoris » en haut de la sidebar.

**UC-43 — Corbeille** · V2 — la suppression met la note à la corbeille (restaurable 30 jours).

### Données & compte

**UC-50 — Gérer son profil** · V1 — changer mot de passe, voir son email ; supprimer son compte (V2).
**UC-51 — Exporter un vault** · V2 — télécharger une archive `.zip` de fichiers `.md` (garantit que l'utilisateur n'est jamais enfermé).
**UC-52 — Importer des fichiers Markdown** · V2 — importer un dossier de `.md` (ex. depuis Obsidian).
**UC-53 — Consulter des statistiques** · V2 — nombre de notes, activité par jour, notes les plus connectées, notes orphelines.

---

## D. User stories

### MVP
- En tant qu'utilisateur, je veux **créer un compte et me connecter** afin que mes notes soient privées et accessibles depuis n'importe quel navigateur. (UC-01, 02, 03, 04)
- En tant qu'utilisateur, je veux **créer, renommer, supprimer et ouvrir des vaults** afin de séparer mes contextes (perso, travail, apprentissage). (UC-10 à 13)
- En tant qu'utilisateur, je veux **créer une note** afin de capturer une idée rapidement. (UC-20)
- En tant qu'utilisateur, je veux **lire une note avec son Markdown rendu** afin qu'elle soit agréable à relire (titres, listes, code). (UC-21)
- En tant qu'utilisateur, je veux **modifier une note et que la modification soit sauvegardée** afin de faire évoluer mes connaissances sans rien perdre. (UC-22)
- En tant qu'utilisateur, je veux **supprimer une note** afin de garder un vault propre. (UC-23)
- En tant qu'utilisateur, je veux **rechercher dans les titres et contenus du vault** afin de retrouver une information vite. (UC-24)
- En tant qu'utilisateur, je veux **que l'URL reflète la note ouverte** afin de pouvoir recharger la page ou garder un marque-page.

### V1
- En tant qu'utilisateur, je veux **lier des notes en écrivant `[[Titre]]`** afin de relier mes idées sans quitter le clavier. (UC-30)
- En tant qu'utilisateur, je veux **voir les notes qui mentionnent la note courante** afin de découvrir des connexions. (UC-31)
- En tant qu'utilisateur, je veux **renommer une note sans casser les liens** afin de restructurer sans crainte. (UC-32)
- En tant qu'utilisateur, je veux **voir le graphe de mon vault et d'une note** afin de visualiser la structure de mes connaissances. (UC-33, 34)
- En tant qu'utilisateur, je veux **ranger mes notes dans des dossiers** afin d'organiser un vault qui grossit. (UC-40)
- En tant qu'utilisateur, je veux **taguer mes notes avec `#tag` et filtrer par tag** afin de classer transversalement. (UC-41)
- En tant qu'utilisateur, je veux **trier la liste des notes** afin de retrouver les notes récentes. (UC-25)
- En tant qu'utilisateur, je veux **changer mon mot de passe**. (UC-50)

### V2 / futur
- En tant qu'utilisateur, je veux **une recherche classée par pertinence avec extraits**. (UC-24 V2)
- En tant qu'utilisateur, je veux **une corbeille et des favoris**. (UC-42, 43)
- En tant qu'utilisateur, je veux **une sauvegarde automatique** afin de ne jamais cliquer « Enregistrer ».
- En tant qu'utilisateur, je veux **exporter/importer mes notes en Markdown** afin de ne pas être enfermé. (UC-51, 52)
- En tant qu'utilisateur, je veux **des statistiques sur ma base** (activité, notes orphelines). (UC-53)
- En tant qu'utilisateur, je veux **insérer des images** dans mes notes. (Idée future)
- En tant qu'utilisateur, je veux **Lily en application desktop**. (V2, Electron)

---

## E. MVP

**Définition** : un utilisateur peut créer un compte, avoir plusieurs vaults, et y écrire/lire/modifier/supprimer/rechercher des notes Markdown persistées dans PostgreSQL. Démontrable de bout en bout ; aucune donnée mockée.

### Fonctionnalités indispensables
| Fonctionnalité | UC |
|---|---|
| Inscription, connexion, déconnexion, routes protégées | UC-01 à 04 |
| Vault par défaut créé à l'inscription | UC-01 |
| CRUD vaults + sélecteur de vault | UC-10 à 13 |
| CRUD notes, sauvegarde explicite (bouton + Ctrl+S) | UC-20 à 23 |
| Rendu Markdown en lecture, textarea Markdown en édition, aperçu | UC-21, 22 |
| Recherche simple titre + contenu dans le vault courant | UC-24 |
| URLs par vault et par note | — |
| Gestion des erreurs visible (toasts / messages) | — |

### Volontairement exclus du MVP
Wikilinks, backlinks, graphe, dossiers, tags, tri, favoris, corbeille, autosave, images/pièces jointes, éditeur riche WYSIWYG, gestion du profil, mot de passe oublié, export/import, statistiques, Docker pour api/web, déploiement, Electron.

> Pourquoi les liens ne sont pas dans le MVP alors qu'ils sont le cœur de la vision : ils dépendent d'un CRUD, d'une auth et d'un scoping par vault solides. Ils sont la **première** fonctionnalité après le MVP (Phase 6) et le modèle de données MVP est conçu pour les accueillir sans refonte.

### Entités MVP
`User`, `Vault`, `Note` (cf. §G).

### Endpoints MVP
`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET|POST /api/vaults`, `GET|PATCH|DELETE /api/vaults/:vaultId`, `GET|POST /api/vaults/:vaultId/notes`, `GET|PATCH|DELETE /api/notes/:noteId` (cf. §H).

### Écrans MVP
Login, Register, Liste des vaults, Vault (layout sidebar + contenu), Note (lecture/édition) (cf. §I).

---

## F. Hors scope

Explicitement **non développé** dans le MVP. Colonne « plus tard » = où l'idée peut revenir.

| Sujet | Statut | Raison / plus tard |
|---|---|---|
| Collaboration temps réel, partage de notes/vaults | **Hors scope** | Lily est personnel ; CRDT/WebSockets = complexité énorme |
| Fonctionnalités sociales (profils publics, commentaires, likes) | **Hors scope** | Hors vision |
| Système de plugins, marketplace | **Hors scope** | Réservé aux produits matures avec communauté |
| Microservices, architecture distribuée, file de messages | **Hors scope** | Un monolithe modulaire NestJS suffit largement |
| Application mobile native | **Hors scope** | Le web responsive suffit ; éventuellement Idée future |
| IA (résumé, suggestions de liens, chat avec ses notes) | **Idée future** | Intéressant *après* V1 (les liens donnent le contexte) ; pas avant |
| Synchronisation offline complexe / multi-appareils avec résolution de conflits | **Idée future** | Découle d'Electron ; le modèle serveur-first la rend optionnelle |
| Éditeur riche WYSIWYG (type Notion) | **Idée future** | Markdown brut + aperçu d'abord ; éditeur CodeMirror en V2 |
| Images / pièces jointes | **Idée future** | Nécessite stockage de fichiers (disque/S3) |
| Historique des versions de notes | **Idée future** | Table `NoteRevision` ajoutable plus tard |
| OAuth (Google, GitHub), 2FA, mot de passe oublié par email | **V2 / Idée future** | Nécessite service email ; email + mot de passe suffit |
| Multi-langue (i18n) | **Hors scope MVP** | UI en français d'abord ; décider la langue de l'UI (cf. §N) |
| Templates de notes, daily notes, calendrier | **Idée future** | Sympas mais secondaires |

---

## G. Modèle métier

### Vocabulaire (décidé)
- **Vault** : espace de connaissances isolé appartenant à un utilisateur. Recherche, liens, tags et graphe ne traversent **jamais** les vaults.
- **Dossier** (Folder) : rangement hiérarchique *à l'intérieur* d'un vault.
- **Projet** : **n'est pas une entité**. Un « projet » est un dossier ou un tag. Le mot disparaît de l'UI.
- **Lien** : occurrence de `[[Titre]]` dans le contenu d'une note ; indexée dans `NoteLink`.

### Entités

| Entité | Maturité | Rôle | Attributs principaux | Relations |
|---|---|---|---|---|
| **User** | MVP | Compte | `id` (uuid), `email` (unique, minuscule), `passwordHash`, `createdAt`, `updatedAt` | 1 User → N Vault |
| **Vault** | MVP | Espace isolé | `id`, `name`, `ownerId`, `createdAt`, `updatedAt` · unique(`ownerId`, `name`) | N→1 User ; 1→N Note ; 1→N Folder |
| **Note** | MVP | Unité de connaissance | `id`, `vaultId`, `title`, `content` (Markdown brut, `text`), `createdAt`, `updatedAt` · unique(`vaultId`, `lower(title)`) · V1 : `folderId?` | N→1 Vault ; N→1 Folder (V1) ; liens N..N via NoteLink |
| **NoteLink** | V1 | Index des wikilinks | `id`, `sourceNoteId`, `targetNoteId?` (null = non résolu), `targetTitle` (texte du lien normalisé) · unique(`sourceNoteId`, `targetTitle`) | N→1 Note (source, cascade) ; N→1 Note (cible, `SET NULL`) |
| **Folder** | V1 | Rangement | `id`, `vaultId`, `parentId?`, `name`, `createdAt`, `updatedAt` · unique(`vaultId`, `parentId`, `name`) | arbre (auto-relation) ; 1→N Note |
| **Tag** | V1 | Classement transversal | `id`, `vaultId`, `name` · unique(`vaultId`, `name`) | N..N Note via `NoteTag(noteId, tagId)` |

Champs V2 prévus (non créés avant besoin) : `Note.deletedAt` (corbeille), `Note.isFavorite`.

### Diagramme

```text
User
 │ 1..N
 └── Vault ───────────────────────────────┐
       │ 1..N                             │ 1..N (V1)
       ├── Folder (V1) ── parent 0..1 ──┐ └── Tag (V1)
       │     │ 0..1                     │        │
       │     ▼                          │        │ N..N via NoteTag
       └── Note ◄───────────────────────┘        │
             │  ◄────────────────────────────────┘
             │
             └── NoteLink (V1)   source 1 ──► N liens sortants
                                 cible 0..1 (null = lien non résolu)
```

### Modélisation des liens entre notes (V1)

- **Source de vérité = le contenu Markdown**. `NoteLink` est un **index dérivé**, recalculé à chaque création/modification de note. On ne crée jamais de lien « à la main ».
- **Extraction** (fonction pure, testée unitairement, dans `apps/api/src/links/`) : regex sur `[[...]]` hors blocs de code ; `[[Titre|alias]]` → cible `Titre` ; normalisation (trim, comparaison insensible à la casse) ; dédoublonnage par note.
- **Résolution** : `targetTitle` est cherché parmi les titres du même vault → `targetNoteId` renseigné ou `null`.
- **Mise à jour à la sauvegarde** (transaction) : supprimer les `NoteLink` de la source → réinsérer les liens extraits. Puis : les liens non résolus d'autres notes dont le `targetTitle` correspond au nouveau titre sont résolus.
- **Suppression d'une note cible** : `targetNoteId` → `NULL` (le lien devient non résolu, `targetTitle` conservé).
- **Renommage** : cf. UC-32 (réécriture des contenus en transaction).
- **Liens « bidirectionnels »** : ils ne sont **pas** stockés deux fois. Un lien est orienté (A → B) ; les **backlinks** de B = `SELECT … WHERE targetNoteId = B`. Le graphe est affiché non orienté.
- **Pourquoi le titre unique par vault** : c'est la seule façon pour `[[Titre]]` de désigner une note sans ambiguïté (comme Obsidian à l'échelle d'un dossier).

---

## H. API REST

### Conventions
- Préfixe global **`/api`** (`app.setGlobalPrefix('api')`) ; le front appelle via le proxy Vite (`/api` → `http://localhost:3000`) : même origine, pas de CORS en dev.
- JSON partout ; dates en ISO 8601.
- Authentification par **cookie `httpOnly`** (cf. §K) ; toutes les routes sauf `register`/`login` exigent l'auth (401 sinon).
- **Ressource d'un autre utilisateur = 404**.
- Validation des body → **400** avec détail par champ. Conflit d'unicité → **409**.
- Format d'erreur (celui de NestJS) : `{ "statusCode": 409, "message": "…", "error": "Conflict" }`.
- Types de réponse :
  - `UserDto` = `{ id, email, createdAt }`
  - `VaultDto` = `{ id, name, noteCount, createdAt, updatedAt }`
  - `NoteSummaryDto` = `{ id, title, updatedAt }` (listes : **sans** `content`)
  - `NoteDto` = `{ id, vaultId, title, content, createdAt, updatedAt }`

### Auth — MVP
| Méthode | Route | Objectif | Body | Réponse | Codes |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | Créer un compte (+ vault par défaut) et connecter | `{ email, password }` (password ≥ 8, ≤ 128) | `UserDto` + `defaultVaultId` (pour ouvrir le vault créé) + cookie | 201, 400, 409 |
| POST | `/api/auth/login` | Se connecter | `{ email, password }` | `UserDto` + cookie | 200, 400, 401 |
| POST | `/api/auth/logout` | Se déconnecter (efface le cookie) | — | — | 204 |
| GET | `/api/auth/me` | Utilisateur courant (le front l'appelle au démarrage) | — | `UserDto` | 200, 401 |

### Vaults — MVP
| Méthode | Route | Objectif | Body | Réponse | Codes |
|---|---|---|---|---|---|
| GET | `/api/vaults` | Vaults de l'utilisateur, triés par nom | — | `VaultDto[]` | 200 |
| POST | `/api/vaults` | Créer | `{ name }` (1–100 car.) | `VaultDto` | 201, 400, 409 |
| GET | `/api/vaults/:vaultId` | Détail | — | `VaultDto` | 200, 404 |
| PATCH | `/api/vaults/:vaultId` | Renommer | `{ name }` | `VaultDto` | 200, 400, 404, 409 |
| DELETE | `/api/vaults/:vaultId` | Supprimer (cascade notes) | — | — | 204, 404 |

### Notes — MVP
| Méthode | Route | Objectif | Params / Body | Réponse | Codes |
|---|---|---|---|---|---|
| GET | `/api/vaults/:vaultId/notes` | Lister les notes du vault, triées par `updatedAt` desc | query `q?` (recherche titre+contenu, `ILIKE`) | `NoteSummaryDto[]` | 200, 404 |
| POST | `/api/vaults/:vaultId/notes` | Créer | `{ title?, content? }` (title par défaut « Sans titre » dédoublonné ; title 1–200 ; content ≤ 1 Mo) | `NoteDto` | 201, 400, 404, 409 |
| GET | `/api/notes/:noteId` | Lire | — | `NoteDto` | 200, 404 |
| PATCH | `/api/notes/:noteId` | Modifier titre et/ou contenu | `{ title?, content? }` | `NoteDto` | 200, 400, 404, 409 |
| DELETE | `/api/notes/:noteId` | Supprimer | — | — | 204, 404 |

> Pas de pagination au MVP (un vault personnel a quelques centaines de notes, les listes n'incluent pas le contenu). À ajouter si besoin (`?limit&cursor`).

### V1 (ajouts)
| Méthode | Route | Objectif |
|---|---|---|
| GET | `/api/notes/:noteId/backlinks` | `NoteSummaryDto[]` des notes qui lient cette note |
| GET | `/api/notes/:noteId/links` | Liens sortants `{ targetTitle, targetNoteId \| null }[]` |
| GET | `/api/vaults/:vaultId/graph` | `{ nodes: { id, title, degree }[], edges: { source, target }[] }` (liens résolus) |
| GET | `/api/notes/:noteId/graph?depth=1` | Même format, voisinage de la note (depth 1–2) |
| GET/POST | `/api/vaults/:vaultId/folders` | Lister (à plat, le front construit l'arbre) / créer `{ name, parentId? }` |
| PATCH/DELETE | `/api/folders/:folderId` | Renommer/déplacer `{ name?, parentId? }` / supprimer (409 si non vide) |
| PATCH | `/api/notes/:noteId` | + champ `folderId` pour déplacer une note |
| GET | `/api/vaults/:vaultId/tags` | `{ name, noteCount }[]` |
| GET | `/api/vaults/:vaultId/notes` | + query `tag?`, `folderId?`, `sort=title\|updatedAt\|createdAt` |
| PATCH | `/api/auth/password` | `{ currentPassword, newPassword }` |

---

## I. Frontend

### Principes
- **React Router** pour les URLs ; **TanStack Query** pour tout l'état serveur (cache, chargement, invalidation) ; `useState` local pour l'état d'UI. Pas de store global (Redux/Zustand) tant que ce n'est pas nécessaire.
- Un client HTTP minimal (`src/lib/api.ts` : `fetch` + `credentials: 'include'` + gestion des erreurs) ; un fichier de hooks par feature (`useNotes`, `useVaults`, `useAuth`).
- Organisation par feature : `src/features/{auth,vaults,notes,layout}/`, `src/components/ui/` pour shadcn.
- Markdown rendu avec **react-markdown** (+ `remark-gfm`), jamais `dangerouslySetInnerHTML`.
- Accessibilité : labels sur les champs, focus visible, navigation clavier dans la sidebar, raccourci Ctrl/Cmd+S.
- Palette : `#BBA0D3` (primaire clair), `#7A5C8E` (primaire), `#F5F0E8` (fond), `#CBB7A3` (accent/bordures), `#2A2430` (texte / fond sombre), mappée sur les variables shadcn dans `index.css`.

### Écrans

| Écran | Route | Maturité | Objectif | Composants | Actions | Données / API |
|---|---|---|---|---|---|---|
| Login | `/login` | MVP | Se connecter | `AuthLayout`, `LoginForm` | Soumettre, lien vers Register | `POST /auth/login` |
| Register | `/register` | MVP | Créer un compte | `AuthLayout`, `RegisterForm` | Soumettre, lien vers Login | `POST /auth/register` |
| Vaults | `/vaults` | MVP | Choisir/gérer ses vaults (sert de « dashboard ») | `VaultList`, `VaultCard`, `CreateVaultDialog`, `RenameVaultDialog`, `DeleteVaultDialog` | Ouvrir, créer, renommer, supprimer | `GET/POST/PATCH/DELETE /vaults` |
| Vault | `/vaults/:vaultId` | MVP | Layout principal, aucune note ouverte | `AppShell`, `Sidebar` (`VaultSwitcher`, `SearchInput`, `NoteList`, bouton « Nouvelle note », menu utilisateur/déconnexion), `EmptyState` | Chercher, créer, ouvrir une note, changer de vault | `GET /vaults`, `GET /vaults/:id/notes?q=`, `POST /vaults/:id/notes` |
| Note | `/vaults/:vaultId/notes/:noteId` | MVP | Lire/éditer une note | `NoteView` (ex-`Workspace`), `NoteHeader`, `MarkdownView`, `NoteEditor` (textarea + onglet/split aperçu), `DeleteNoteDialog` | Modifier, enregistrer, annuler, supprimer | `GET/PATCH/DELETE /notes/:id` |
| Note — panneaux V1 | idem | V1 | Contexte relationnel | `BacklinksPanel`, `LocalGraph` | Naviguer vers une note liée | `/notes/:id/backlinks`, `/notes/:id/graph` |
| Graphe | `/vaults/:vaultId/graph` | V1 | Graphe global | `GraphView` | Zoom, survol, clic → note | `GET /vaults/:id/graph` |
| Settings | `/settings` | V1 | Profil, mot de passe | `ProfileForm`, `PasswordForm` | Changer mot de passe, se déconnecter | `GET /auth/me`, `PATCH /auth/password` |
| Stats | `/vaults/:vaultId/stats` | V2 | Datavisualisation | cartes + graphiques | — | endpoint stats V2 |

Au MVP, « Settings » se limite au menu utilisateur de la sidebar (email + « Se déconnecter »).

---

## J. Navigation

### Parcours principal
```text
Ouverture de l'app
 ↓ GET /auth/me
 ├─ 401 → /login ──(connexion)──┐
 └─ 200 ────────────────────────┤
                                ↓
        Dernier vault ouvert (localStorage) ? ── oui → /vaults/:id
                                │ non
                                ↓
                           /vaults (liste)
                                ↓ choix
                        /vaults/:id  (sidebar : liste des notes)
                                ↓ clic sur une note
                  /vaults/:id/notes/:noteId  (lecture, Markdown rendu)
                                ↓ « Modifier »
                     Édition (textarea + aperçu)
                                ↓ « Enregistrer » / Ctrl+S
                    PATCH → lecture, liste mise à jour
```

### Parcours secondaires
- **Inscription** : `/register` → compte + vault par défaut → `/vaults/:defaultId` (état vide « Créez votre première note »).
- **Création rapide** : n'importe où dans un vault → « Nouvelle note » → note « Sans titre » ouverte en édition, focus sur le titre.
- **Recherche** : champ de la sidebar → liste filtrée → clic → note. Effacer le champ → liste complète.
- **Changer de vault** : `VaultSwitcher` (sidebar) → `/vaults/:autreId` ; « Gérer les vaults » → `/vaults`.
- **Suppression** : note → confirmation → `/vaults/:id`. Vault → confirmation (retaper le nom) → `/vaults`.
- **Session expirée** : toute réponse 401 → cache vidé → `/login` (puis retour à l'URL d'origine).
- **V1 — navigation par liens** : clic sur `[[Lien]]` → note cible ; lien non résolu → dialogue « Créer la note “X” ? » ; backlinks → note source ; graphe → clic nœud → note.

---

## K. Architecture technique

### Vue d'ensemble — monolithe modulaire
```text
Navigateur
  React + TS (apps/web, Vite :5173)
        │  fetch /api/*  (cookie httpOnly, même origine via proxy Vite)
        ▼
  NestJS (apps/api, :3000)
    Controllers → Services → Prisma client
        │
        ▼
  PostgreSQL 17 (Docker Compose, :5432)
```
Un seul backend, un seul processus, une seule base. Aucun microservice, aucune file de messages.

### Responsabilités
| Couche | Responsable de | N'est PAS responsable de |
|---|---|---|
| **Frontend** | Affichage, navigation, état d'UI, cache serveur (TanStack Query), rendu Markdown, validation *de confort* (feedback immédiat) | Sécurité, règles métier, contrôle d'accès |
| **Backend (NestJS)** | Auth, **autorisation** (propriété des ressources), validation *faisant foi*, règles métier (unicité des titres, vault par défaut, extraction des liens), transactions, format des erreurs | Rendu, état d'UI |
| **Prisma** | Contrat du schéma (`contract.prisma`), client typé, migrations | Règles métier (restent dans les services) |
| **PostgreSQL** | Persistance, intégrité : clés étrangères, `ON DELETE CASCADE`, contraintes d'unicité, index | Logique applicative |

### Validation
1. Front : champs requis/longueurs pour le feedback immédiat.
2. **Backend, fait foi** : DTOs + `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) avec `class-validator`/`class-transformer` (idiome NestJS standard, pédagogique).
3. Base : contraintes d'unicité et FK (dernier rempart ; l'erreur d'unicité est traduite en 409 par le service).

### Authentification (proposition MVP)
- Mot de passe haché avec **argon2** (ou bcrypt), jamais loggé ni renvoyé.
- Au login : JWT signé (`sub = userId`, expiration 7 jours) via `@nestjs/jwt`, posé en **cookie `httpOnly`, `SameSite=Lax`, `Secure` en prod**. Pas de token accessible au JavaScript (protège contre le vol par XSS).
- `AuthGuard` global (lit le cookie, vérifie le JWT, attache `request.user`) + décorateur `@Public()` pour register/login + décorateur `@CurrentUser()`.
- Autorisation : chaque requête métier filtre par propriétaire, ex. `note.vault.ownerId === user.id` → sinon 404. Centralisé dans les services (méthodes `findOwnedVaultOrThrow`, `findOwnedNoteOrThrow`).
- Logout : efface le cookie. (Révocation serveur / refresh tokens : V2 si besoin.)
- Rate limiting sur `/auth/*` avec `@nestjs/throttler` : V1.
- Passport n'est pas nécessaire : un guard écrit à la main est plus simple à comprendre.

### Organisation des modules NestJS
```text
apps/api/src/
├── main.ts                 # prefix /api, ValidationPipe, cookie-parser
├── app.module.ts
├── config/                 # lecture/validation des variables d'env (DATABASE_URL, JWT_SECRET, PORT)
├── prisma/                 # contract.prisma, db.ts → exposé via PrismaModule/PrismaService injectable
├── common/                 # décorateurs (@Public, @CurrentUser), filtres d'erreur, utilitaires
├── auth/                   # AuthModule : controller, service, guard, DTOs
├── users/                  # UsersModule : service (création, recherche par email) — pas de controller au MVP
├── vaults/                 # VaultsModule : controller, service, DTOs
├── notes/                  # NotesModule : controller, service, DTOs (dépend de VaultsModule pour l'ownership)
├── links/                  # V1 : parser de wikilinks (pur) + LinksService (index NoteLink), graph
├── folders/                # V1
└── tags/                   # V1
```
Règle : controller = HTTP uniquement (params, DTO, codes) ; service = logique + accès aux données ; un service peut appeler un service d'un autre module importé, jamais un controller.

### Frontend
```text
apps/web/src/
├── main.tsx, App.tsx        # QueryClientProvider + Router
├── lib/api.ts               # client fetch
├── types/                   # types des DTO (dupliqués depuis l'API au MVP)
├── features/
│   ├── auth/                # pages Login/Register, useAuth, RequireAuth
│   ├── vaults/              # page Vaults, VaultSwitcher, hooks
│   ├── notes/               # NoteList, NoteView, NoteEditor, MarkdownView, hooks
│   └── layout/              # AppShell, Sidebar
└── components/ui/           # shadcn
```
Types partagés : dupliqués côté web au MVP. Créer `packages/shared` (types DTO + constantes de validation) **seulement** quand la duplication devient pénible (V1).

### Environnement de dev
- `docker compose up -d` → PostgreSQL uniquement (déjà en place). API et web tournent en local (`npm run start:dev`, `npm run dev`) : rechargement rapide, débogage simple.
- Script racine `npm run dev` lançant api + web en parallèle (Phase 0).
- `.env.example` alignés sur le compose (`postgresql://lily:lily@localhost:5432/lily`) + `JWT_SECRET`.
- Dockerisation de l'API et du web : **uniquement** à la phase déploiement.

### Tests (niveau raisonnable)
- API : tests unitaires Vitest des services et du parser de liens ; tests e2e (supertest) des parcours critiques : register/login, **isolation entre deux utilisateurs**, CRUD notes.
- Web : pas d'obligation au MVP ; Vitest + Testing Library sur 2–3 composants clés en V1.
- CI GitHub Actions (lint + test + build) à partir de la Phase 1.

---

## L. Roadmap

Chaque phase = une série de petits commits vérifiables. « Terminé quand » = critère de validation.

### Phase 0 — Remise en ordre · MVP
- Commiter l'état actuel ; aligner `.env.example` avec le compose ; ajouter `JWT_SECRET` à l'exemple.
- API : préfixe `/api` ; web : proxy Vite `/api` ; script racine `dev`.
- Renommer `Workspace` → `NoteView`.
- **Terminé quand** : `docker compose up -d && npm run dev` lance tout ; `GET /api/notes` répond via le front.

### Phase 1 — Notes persistées (API) · MVP
- `PrismaService` injectable à partir de `db.ts` ; migration du modèle `Note`.
- CRUD `/api/notes` (provisoirement sans vault ni auth), DTOs + `ValidationPipe`, 404/400.
- Tests unitaires service + e2e CRUD. CI GitHub Actions.
- **Terminé quand** : CRUD testable au curl/HTTP client, données persistées après redémarrage.

### Phase 2 — Front branché sur l'API · MVP
- React Router + TanStack Query ; `lib/api.ts` ; suppression de `data/notes.ts`.
- Liste, création, lecture, édition (Save réel + Ctrl+S), suppression avec confirmation, URL par note.
- **Terminé quand** : plus aucune donnée mockée, tout survit à un rechargement.

### Phase 3 — Authentification · MVP
- Modèle `User`, register/login/logout/me, guard global, cookie httpOnly.
- Pages Login/Register, `RequireAuth`, gestion du 401.
- Les notes ne sont pas rattachées directement à l'utilisateur : elles restent globales (mais protégées par l'auth) jusqu'à la Phase 4, où elles rejoignent un vault.
- **Terminé quand** : impossible d'appeler l'API sans être connecté ; e2e auth verts.

### Phase 4 — Vaults · MVP
- Modèle `Vault`, `Note.vaultId` (migration : les notes existantes vont dans un vault par défaut du premier utilisateur, ou base réinitialisée — c'est de la donnée de dev).
- Routes imbriquées `/vaults/:vaultId/notes`, vérification d'appartenance, vault par défaut à l'inscription, unicité titre par vault.
- Page Vaults, `VaultSwitcher`.
- **Terminé quand** : e2e « l'utilisateur B ne voit/modifie aucune donnée de A » vert.

### Phase 5 — Markdown + recherche · MVP ✔ fin du MVP
- `MarkdownView` (react-markdown + remark-gfm, styles typographiques), éditeur avec aperçu.
- `GET /vaults/:id/notes?q=` (ILIKE titre + contenu), `SearchInput` avec debounce.
- **Terminé quand** : tous les UC MVP (§C) passent en démo manuelle.

### Phase 6 — Wikilinks & backlinks · V1
- Parser pur + tests ; modèle `NoteLink` ; mise à jour de l'index en transaction à chaque save ; rendu des `[[liens]]` (résolus/fantômes) ; `BacklinksPanel` ; renommage avec réécriture des références (UC-32).
- **Terminé quand** : créer/renommer/supprimer une note garde l'index cohérent (tests).

### Phase 7 — Knowledge graph · V1
- Endpoints graph ; `GraphView` global et `LocalGraph`. Librairie à choisir à ce moment (cf. §N-13).
- **Terminé quand** : graphe d'un vault de ~500 notes fluide ; clic nœud → note.

### Phase 8 — Dossiers & tags · V1
- `Folder` (arbre), déplacement de note ; `Tag`/`NoteTag` extraits de `#tag` (réutilise le mécanisme de la Phase 6) ; filtres et tri de la liste.

### Phase 9 — Compte & robustesse · V1
- Changement de mot de passe, rate limiting auth, page Settings, tests front sur composants clés, `packages/shared` si utile.

### Phase 10 — Docker & déploiement · V1
Préalables relevés lors de la préparation (2026-09-28) :
- **Migrations** : `npm run db:update` (`prisma db update`) aligne directement la base sur le contrat. C'est un outil de dev. En production, il faut des migrations versionnées sur disque (`prisma migration plan`), relues puis appliquées au démarrage ou par un job dédié. À valider sur la RC Prisma Next (§N-14).
- **Reverse proxy et IP client** : derrière un proxy, l'API voit l'IP du proxy, et le rate limiting de `/auth/*` (10 req/min) deviendrait global à tous les utilisateurs. Il faut activer `trust proxy` dans Express (`app.set('trust proxy', 1)`).
- **Cookie `Secure`** : avec `NODE_ENV=production`, la session exige HTTPS. Pas de test en HTTP simple.
- **Même origine** : le front et `/api` doivent être servis sous le même domaine, sinon le cookie `SameSite=Lax` ne suit plus et il faudrait du CORS.

Étapes (un commit chacune) :
1. `trust proxy` + `NODE_ENV=production` documenté + migrations sur disque (script `db:migrate`).
2. `apps/api/Dockerfile` multi-étapes (`node:24-slim`, `npm ci` du workspace, `nest build`, image finale avec `node dist/main`, utilisateur non root).
3. `apps/web/Dockerfile` : `vite build` puis serveur statique + reverse proxy `/api` → `api:3000` (Caddy : HTTPS automatique, config de quelques lignes ; ou nginx, cf. §N-18).
4. `docker-compose.prod.yml` : `postgres` (volume, sans port exposé), `api` (healthcheck, migrations au démarrage), `web` (ports 80/443). Secrets dans un `.env` non versionné.
5. CI : construire les images pour vérifier les Dockerfiles (sans publication au début).
6. Déploiement sur un VPS (cf. §N-18), nom de domaine, sauvegarde quotidienne `pg_dump`, procédure de mise à jour documentée dans `DEVELOPMENT.md`.
- **Terminé quand** : Lily accessible en HTTPS sur une URL publique ; `docker compose -f docker-compose.prod.yml up -d` sur une machine vierge suffit à la relancer.

### Phase 11 — Confort · V2
- Autosave (debounce), corbeille (`deletedAt`), favoris, recherche plein texte PostgreSQL (`tsvector` + index GIN, classement, extraits), éditeur CodeMirror (coloration Markdown, autocomplétion `[[`).

### Phase 12 — Datavisualisation · V2
- Statistiques : notes par vault, activité (heatmap par jour), notes orphelines, notes les plus connectées.

### Phase 13 — Import/Export · V2
- Export `.zip` de `.md` ; import d'un dossier Obsidian (liens `[[...]]` compatibles).

### Phase 14 — Electron · V2
- Nouveau workspace `apps/desktop` : processus principal Electron minimal qui ouvre une `BrowserWindow` sur **l'URL de production** (§N-15 option a). C'est l'option la plus simple : le cookie de session fonctionne tel quel (même origine), et le front n'a pas besoin d'être modifié ni dupliqué.
- Charger plutôt le build local (`file://`) casserait l'auth par cookie (origine différente) et obligerait à revoir §N-9 (token + header `Authorization`, CORS). À ne faire que pour l'offline.
- Sécurité Electron : `contextIsolation: true`, `nodeIntegration: false`, liens externes ouverts dans le navigateur, navigation limitée au domaine de Lily.
- Packaging avec `electron-builder` (Linux AppImage/deb, Windows, macOS) ; mise à jour automatique plus tard.
- Offline / synchro : Idée future (§N-15 b/c).
- **Terminé quand** : un installateur Linux ouvre Lily connecté à l'instance de production.

### Mobile · à décider (§N-19)
Le web est déjà utilisable sur téléphone (sidebar en tiroir, vérifié à 390 px). Voies possibles, de la moins à la plus coûteuse : PWA installable (manifest + icônes, sans offline), coquille Capacitor autour du front, application native (hors scope, §F). Rien n'est planifié avant la décision N-19.

Dépendances clés : 1 → 2 → 3 → 4 → 5 (MVP linéaire) ; 6 dépend de 4 (scoping par vault) ; 7 dépend de 6 ; 8 réutilise le parser de 6 ; 10 peut se faire dès la fin du MVP ; 14 et le mobile dépendent de 10 (instance HTTPS publique).

---

## Matrice des fonctionnalités

| Domaine | MVP | V1 | V2 | Idée future | Hors scope |
|---|---|---|---|---|---|
| Notes | CRUD, save explicite, URL par note | tri | autosave, corbeille, favoris | historique de versions, templates, daily notes | — |
| Éditeur | textarea Markdown + aperçu, rendu GFM | rendu wikilinks | CodeMirror, autocomplétion `[[` | WYSIWYG, images | — |
| Organisation | vaults | dossiers, tags `#` | glisser-déposer | — | — |
| Knowledge | — | wikilinks, backlinks, renommage sûr, graphe global + local | — | suggestions de liens (IA) | — |
| Recherche | ILIKE titre + contenu | filtres tag/dossier | plein texte PostgreSQL classé | recherche globale inter-vaults | — |
| Dataviz | — | graphe | statistiques, activité | — | — |
| Compte | register/login/logout | mot de passe, rate limit | suppression de compte | OAuth, 2FA, reset par email | profils publics |
| Infra | Postgres en Docker, CI | Docker complet, déploiement | — | — | microservices |
| Desktop | — | — | Electron (client en ligne) | offline + synchro | mobile natif |
| Autres | — | — | import/export `.md` | IA | collaboration temps réel, plugins, marketplace, social |

---

## M. État d'avancement & règles pour l'IA

**Prochaine étape** : la Phase 10 est faite jusqu'à l'étape 5 (stack Docker testée en local et en CI). L'étape 6 (déploiement public) attend un serveur et un domaine (§N-18). En attendant : **Phase 11** (confort) ou PWA (§N-19, à décider).

Phase 10, 2026-09-28 : la stack `docker-compose.prod.yml` a passé la recette navigateur complète (46/46) sur `http://localhost:8080`, avec cookie `Secure`, migrations au démarrage, persistance après redémarrage, et rate limiting par IP client derrière le proxy (vérifié).

Mis à jour le 2026-09-28. Vérifié localement et en CI : `npm run lint`, `npm run build`, `npm test` (API : 9 tests unitaires ; web : 15 tests), `npm run test:e2e` (13 tests). **Recette navigateur** (Chromium piloté par Playwright, hors dépôt) : 46 vérifications couvrant les UC-01 à 04, 10 à 13, 20 à 25, 30 à 34, 40, 41 et 50, plus le responsive à 390 px. Aucune erreur JavaScript en console. Elle a révélé et fait corriger : l'absence totale de style du Markdown rendu (titres, listes, code, tableaux, liens fantômes et tags indistincts, UC-30 2a), des états vides affichés pendant le chargement des backlinks et du graphe local, et des requêtes 404 après la suppression d'une note.

Écarts connus entre la spec et le code :
- **Unicité des vaults** sensible à la casse (« Travail » ≠ « travail »), alors que les titres de notes ne le sont pas. Conforme à §G, mais incohérent pour l'utilisateur : à trancher si ça gêne.
- `PATCH /auth/password` renvoie 401 quand le mot de passe actuel est faux (le front ne déconnecte pas pour autant). §H ne précise pas ce code ; 400 serait plus juste sémantiquement.

| Phase | Statut | Remarques |
|---|---|---|
| 0 — Remise en ordre | ✅ | Préfixe `/api`, proxy Vite, script `dev`, `.env.example` alignés. `Workspace` supprimé (remplacé par `NotePage`) |
| 1 — Notes persistées | ✅ | CRUD, validation, tests ; CI GitHub Actions en place (2026-09-28) |
| 2 — Front branché | ✅ | React Router (data router) + TanStack Query, plus de données mockées |
| 3 — Auth | ✅ | JWT en cookie httpOnly, guard global, argon2, `RequireAuth`, gestion du 401 |
| 4 — Vaults | ✅ | Notes rattachées à un vault, vault par défaut, e2e d'isolation entre utilisateurs |
| 5 — Markdown + recherche | ✅ | react-markdown + remark-gfm, recherche `ILIKE`. UC MVP vérifiés dans un navigateur (2026-09-28) |
| 6 — Wikilinks & backlinks | ✅ | Parser testé, index `NoteLink`, renommage qui réécrit les références |
| 7 — Knowledge graph | ✅ | `react-force-graph-2d` (N-13 → option a). Fluidité à ~500 notes non mesurée |
| 8 — Dossiers & tags | ✅ | Arbre `parentId`, tags `#` extraits du contenu, filtres et tri. Unicité des noms entre dossiers frères ajoutée le 2026-09-28 (index `coalesce(parentId, '')`, 409) |
| 9 — Compte & robustesse | ✅ | `PATCH /auth/password`, rate limiting, page Settings, tests front. `packages/shared` pas créé : seuls les types DTO et le parser Markdown (`apps/web/src/lib/markdown.ts`, miroir de l'API) sont dupliqués |
| 10 — Docker & déploiement | 🟡 | Étapes 1 à 5 faites : migrations versionnées, `trust proxy`, `GET /api/health`, Dockerfiles, compose prod, job CI `docker`. Étape 6 (VPS, domaine, HTTPS, sauvegardes planifiées) en attente de §N-18 |
| 11+ | ⬜ | Electron (14) préparé en §L ; mobile en attente de §N-19 |

Règles quand on demande « implémente la prochaine fonctionnalité de Lily » :
1. Prendre la première phase non terminée, la découper en étapes d'un commit chacune, les annoncer avant de coder.
2. Ne pas implémenter une fonctionnalité d'une maturité supérieure (pas de V1 pendant le MVP).
3. Ne pas ajouter de dépendance non citée dans ce document sans le justifier et demander.
4. Respecter §H (routes, codes, formats) et §K (couches, validation, ownership).
5. Ajouter/mettre à jour les tests de la phase ; `npm run lint` et `npm test` doivent passer.
6. Mettre à jour cette section (§M) à la fin de la phase.
7. Toute décision de §N encore « ouverte » rencontrée en chemin → demander à l'utilisateur.

---

## N. Décisions : prises et ouvertes

### Décidées
| # | Sujet | Décision | Conséquence |
|---|---|---|---|
| 1 | Source de vérité | **Serveur (PostgreSQL)** | Le backend est central ; offline et synchro deviennent optionnels/futurs ; Electron = client |
| 2 | Vault / Workspace / Project | **Vault** + **Dossiers** ; pas d'entité Projet | Modèle simple ; « Projet » = dossier ou tag |
| 3 | Liens | **Wikilinks `[[Titre]]` parsés au save**, index `NoteLink` dérivé | Titre unique par vault obligatoire ; renommage doit réécrire les références |
| 4 | Liens bidirectionnels | Lien stocké **une fois, orienté** ; backlinks = requête inverse | Pas de double écriture, pas d'incohérence possible |
| 5 | Architecture | Monolithe modulaire NestJS, REST | — |

### Ouvertes (options, conséquences, recommandation)

**N-6 — Markdown vs éditeur riche.** (a) Textarea Markdown + aperçu : trivial, contenu portable. (b) CodeMirror 6 : coloration, autocomplétion `[[`, reste du Markdown. (c) WYSIWYG (TipTap/Lexical) : confortable mais stocke souvent du JSON, casse la portabilité et complique les liens. → *Reco* : (a) au MVP, (b) en V2 ; éviter (c).

**N-7 — Stockage du contenu.** (a) Markdown brut en colonne `text` : simple, exportable, recherche directe. (b) JSON d'éditeur : lié à un éditeur. (c) Fichiers sur disque : contredit la décision 1. → *Reco* : (a).

**N-8 — Suppression soft vs hard.** Hard : simple, conforme au MVP. Soft (`deletedAt`) : permet la corbeille mais chaque requête doit filtrer, et l'unicité des titres doit ignorer les notes supprimées (index partiel). → *Reco* : hard au MVP, soft en V2 avec la corbeille. **À confirmer** : acceptes-tu qu'une suppression soit définitive au MVP ?

**N-9 — Stratégie d'auth.** (a) JWT en cookie httpOnly : protégé contre XSS, nécessite même origine/CSRF maîtrisé (`SameSite=Lax` suffit pour une API JSON). (b) JWT en `localStorage` + header `Authorization` : le plus courant dans les tutos, simple pour Electron, mais vulnérable au vol par XSS. (c) Sessions serveur en base : révocation facile, un peu plus de code. → *Reco* : (a). Réévaluer pour Electron (Phase 14).

**N-10 — Structure des dossiers.** (a) Arbre `parentId` (imbrication libre). (b) Un seul niveau. (c) Chemins matérialisés (`/a/b`). → *Reco* : (a) avec profondeur non limitée mais requête à plat + arbre construit côté front.

**N-11 — Tags.** (a) Extraits du contenu `#tag` (comme Obsidian ; cohérent avec les wikilinks). (b) Champ séparé dans l'UI (chips). → *Reco* : (a). Conséquence : pas d'UI d'édition de tags, tout passe par le texte.

**N-12 — Stratégie de recherche.** MVP `ILIKE` (suffisant jusqu'à quelques milliers de notes) → V2 `tsvector` + GIN (classement, extraits ; attention à la config de langue `french`/`simple`). Moteur externe (Meilisearch, Elastic) : **hors scope**.

**N-13 — Librairie de graphe (Phase 7).** (a) `react-force-graph-2d` : rapide à intégrer. (b) `d3-force` + canvas/SVG maison : plus d'apprentissage dataviz, plus de code. (c) Sigma.js/Cytoscape : puissants, plus lourds. → Décider en Phase 7 selon l'objectif (livrer vs apprendre D3).

**N-14 — Prisma Next (8.0 RC).** Avantage : version d'avenir, contrat typé. Risques : API encore mouvante, documentation et réponses communautaires rares (y compris pour les IA). Alternative : Prisma ORM stable. → *Reco* : rester sur Prisma Next tant qu'il ne bloque pas ; si un blocage coûte plus d'une session, repasser en stable. **À confirmer.**

**N-15 — Architecture Electron & offline.** (a) Electron = navigateur dédié vers l'API distante (pas d'offline). (b) Electron + cache local (IndexedDB/SQLite) en lecture seule offline. (c) Offline complet avec file de mutations et synchro. → *Reco* : (a) en V2, (b) Idée future, (c) hors scope tant qu'il n'y a pas de vrai besoin.

**N-16 — Langue de l'interface.** Le prototype mélange anglais (« Edit », « Save », « Explorer ») et français (« Veuillez sélectionner une note »). → **À décider** : UI en français, en anglais, ou i18n plus tard (i18n = hors MVP).

**N-17 — Titre de note obligatoire et unique.** Nécessaire pour les wikilinks. Alternative : autoriser les doublons et lier par id (`[[id]]`) — illisible. → *Reco* : unique par vault, insensible à la casse, dès le MVP (évite une migration de données plus tard).

**N-18 — Hébergement de la Phase 10.** (a) VPS (Hetzner, OVH…) + Docker Compose + Caddy : quelques euros par mois, tout sous contrôle, formateur (Linux, TLS, sauvegardes), mais maintenance à sa charge. (b) PaaS (Render, Railway, Fly.io) : déploiement depuis Git, base managée, moins à apprendre sur l'infra, coût et dépendance au fournisseur plus élevés. → *Reco* : (a), cohérent avec le compose existant et l'objectif pédagogique. **Décidé le 2026-09-28 : local uniquement pour l'instant** (ni serveur ni domaine). La stack est prête pour (a) : il suffira de `SITE_ADDRESS=<domaine>` sur un VPS.

**N-19 — Mobile.** (a) Web responsive seul (existant). (b) PWA installable : manifest + icônes, peu de code, pas d'offline. (c) Capacitor : réutilise le front dans une app de store, mais complique l'auth (origine `capacitor://`, même problème que N-15/N-9). (d) Application native : hors scope (§F). → *Reco* : (b) juste après la Phase 10, (c) seulement si une vraie présence en store devient utile. **À décider.**
