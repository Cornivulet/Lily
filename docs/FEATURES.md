# Fonctionnalités de Lily

Ce document décrit le **comportement réel** de l'application (état V1). Les cas d'usage d'origine, avec leurs identifiants `UC-xx`, sont dans [SPEC.md §C](SPEC.md#c-use-cases). L'interface est en français.

## Compte et session

| Action | Où | Comportement |
|---|---|---|
| Créer un compte | `/register` | Email + mot de passe (8 à 128 caractères) + confirmation. Crée aussi un vault **« Mon vault »** et l'ouvre. Email déjà pris → « Cet email est déjà utilisé ». |
| Se connecter | `/login` | Mauvais identifiants → message générique « Email ou mot de passe incorrect ». Après connexion : retour à la page demandée, sinon au dernier vault ouvert, sinon à la liste des vaults. |
| Rester connecté | — | Session de 7 jours dans un cookie `httpOnly`. Un rechargement de page conserve la session. |
| Se déconnecter | Menu utilisateur (bas de la sidebar) ou `/settings` | Efface le cookie, vide le cache du navigateur, renvoie sur `/login`. |
| Accès protégé | Toute page sauf login/register | Sans session → `/login`, puis retour à l'URL d'origine après connexion. Une session expirée pendant l'utilisation produit le même effet. |
| Changer de mot de passe | `/settings` | Mot de passe actuel + nouveau (≥ 8, différent de l'actuel) + confirmation. Mot de passe actuel faux → erreur, la session reste ouverte. |

Les routes d'authentification sont limitées à **10 requêtes par minute** (anti-bruteforce), le reste de l'API à 600 par minute.

## Vaults

Un vault est un espace de notes **totalement isolé** : recherche, liens, tags et graphe ne le quittent jamais.

- **Liste** (`/vaults`) : nom, nombre de notes, date de modification. Sert de page d'accueil.
- **Créer** : bouton « Nouveau vault » (page Vaults ou sélecteur de la sidebar). Le nom (1 à 100 caractères) doit être unique parmi vos vaults ; la comparaison **tient compte de la casse**. Le nouveau vault s'ouvre.
- **Changer de vault** : sélecteur en haut de la sidebar.
- **Renommer / supprimer** : menu « … » d'une carte sur `/vaults`. La suppression demande de retaper le nom et supprime **définitivement** toutes les notes, dossiers et tags du vault.
- Aucun vault : la page Vaults affiche un état vide invitant à en créer un.

## Notes

- **Créer** : « Nouvelle note » crée immédiatement « Sans titre » (puis « Sans titre 2 », « Sans titre 3 »…) et l'ouvre en édition, focus sur le titre. « Nouvelle note ici » dans le menu d'un dossier la crée dans ce dossier.
- **Lire** : clic dans la sidebar. L'URL `/vaults/:vaultId/notes/:noteId` peut être rechargée ou mise en favori. Note inexistante → « Note introuvable ».
- **Modifier** : bouton « Modifier ». Trois modes : Écrire, Aperçu, Côte à côte (grand écran). Enregistrer avec le bouton ou **Ctrl/Cmd+S**. « Annuler » restaure la dernière version enregistrée.
- **Modifications non enregistrées** : quitter la note (autre note, autre page) demande confirmation. Fermer ou recharger l'onglet déclenche l'avertissement du navigateur.
- **Titre** : 1 à 200 caractères, **unique dans le vault sans tenir compte de la casse** (sinon erreur sur le champ). Les caractères `[ ] | #` sont interdits, car ils cassent la syntaxe des liens.
- **Contenu** : Markdown brut, 1 Mo maximum.
- **Supprimer** : menu « … » → Supprimer → confirmation. Suppression **définitive** (pas de corbeille). Les liens qui pointaient vers la note deviennent des liens « fantômes ».
- **Recherche** : champ de la sidebar, déclenché 300 ms après la frappe. Cherche dans le **titre et le contenu**, sans tenir compte de la casse, dans le vault courant.
- **Tri** : modifiées récemment (par défaut), créées récemment, titre A → Z.

## Markdown

Rendu avec [react-markdown](https://github.com/remarkjs/react-markdown) et GFM : titres, listes, listes de tâches, tableaux, code en ligne et blocs de code, citations, liens. Le HTML brut n'est **pas** interprété, ce qui protège contre le XSS. Les liens externes s'ouvrent dans un nouvel onglet.

## Wikilinks et backlinks

| Syntaxe | Effet |
|---|---|
| `[[Titre]]` | Lien vers la note « Titre » du même vault (casse ignorée) |
| `[[Titre\|texte affiché]]` | Même cible, affiche « texte affiché » |
| `[[Titre#Section]]` | Cible « Titre » (l'ancre n'est pas encore exploitée) |

- Les liens sont extraits **à chaque enregistrement** et indexés côté serveur. Tout ce qui se trouve dans un bloc de code ou du code en ligne est ignoré.
- **Lien résolu** : affiché en couleur, il ouvre la note.
- **Lien fantôme** (la note n'existe pas) : affiché grisé et souligné en pointillés. Un clic propose « Créer la note “X” ? » ; une fois la note créée, le lien devient résolu partout.
- **Renommer** une note réécrit `[[Ancien titre]]` en `[[Nouveau titre]]` dans toutes les notes du vault qui la citent, en conservant alias et ancres. Un message indique « Liens mis à jour dans N notes ».
- **Mentionnée dans** (sous chaque note) : la liste des notes qui citent la note courante.

## Tags

- Écrire `#tag` dans le contenu, au début d'un mot. Caractères autorisés : lettres (accents compris), chiffres, `_`, `-`, `/`. Il faut au moins un caractère qui ne soit pas un chiffre : `#2024` n'est pas un tag, contrairement à `#projet/2024`.
- Les tags sont stockés en **minuscules** et extraits à l'enregistrement, comme les liens. Les blocs de code sont ignorés.
- Section « Tags » de la sidebar : liste avec le nombre de notes. Un clic filtre la liste des notes. Un clic sur un `#tag` dans une note applique le même filtre.

## Dossiers

- Bouton « Nouveau dossier » de la sidebar, puis le menu « … » d'un dossier : nouvelle note ici, nouveau sous-dossier, renommer, supprimer.
- Imbrication illimitée. ⚠️ Deux dossiers frères peuvent aujourd'hui porter le même nom, alors que la spec (§G) prévoit l'unicité : écart connu, voir [SPEC.md §M](SPEC.md#m-état-davancement--règles-pour-lia).
- **Déplacer une note** : menu « … » de la note → « Déplacer vers… » → un dossier ou la racine du vault.
- **Supprimer un dossier** : seulement s'il est vide (ni notes ni sous-dossiers). Sinon : « Déplacez ou supprimez d'abord le contenu du dossier ».

## Graphe

- **Graphe du vault** (lien en bas de la sidebar) : un nœud par note, une arête par lien résolu. La taille d'un nœud augmente avec son nombre de liens. On peut zoomer et déplacer ; le titre apparaît au survol et sous les nœuds une fois zoomé ; un clic ouvre la note.
- **Graphe local** (sous chaque note) : la note et ses voisins directs, dans les deux sens.
- Vault vide → « Le graphe est vide ». Notes sans lien → nœuds isolés, avec un rappel de la syntaxe `[[Titre]]`.

## Paramètres (`/settings`)

Email et date d'inscription, changement de mot de passe, déconnexion.

## Interface

- **Responsive** : sous 768 px, la sidebar devient un tiroir ouvert par le bouton ☰. Sous 1024 px, l'éditeur n'affiche plus le mode « Côte à côte ».
- Les chargements, erreurs et états vides sont affichés dans chaque zone. Les succès et les erreurs d'action apparaissent en toasts.

## Limites connues (voir la roadmap, [SPEC.md §L](SPEC.md#l-roadmap))

Pas d'autosave, de corbeille, de favoris, d'images, d'export/import, de mot de passe oublié ni de suppression de compte. La recherche est un simple `ILIKE`, sans classement par pertinence. Les dossiers ne se déplacent pas encore depuis l'interface (l'API le permet). L'interface existe seulement en thème clair.
