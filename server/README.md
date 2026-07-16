# Backend "espace enseignante" (PHP + MySQL, OVH)

API pour l'authentification (élèves + enseignante), la gestion des comptes
élèves, et l'ajout de mots au lexique — hébergée à côté du site statique,
dans `/clicmots/api/` sur le même hébergement OVH. Nécessite PHP 8.x
(`password_hash`) et une base MySQL.

## Installation (à faire toi-même, une seule fois)

1. **Base de données** : dans le manager OVH, section "Bases de données",
   crée une base (ou utilise-en une existante). Note l'hôte, le nom, le
   user et le mot de passe.
2. **Tables** : ouvre phpMyAdmin/Adminer depuis le manager OVH sur cette
   base, et exécute le contenu de [`schema.sql`](./schema.sql) (colle-le
   dans l'onglet SQL, "Exécuter").
3. **Config** : copie `api/config.php.example` en `api/config.php`, remplis
   `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASS` avec les infos de l'étape 1, et
   choisis un `SETUP_TOKEN` — une longue chaîne aléatoire à toi (par
   exemple générée avec `openssl rand -hex 32` dans un terminal, ou avec ton
   gestionnaire de mots de passe). Ce fichier ne doit **jamais** être commité
   dans Git (déjà dans `.gitignore`).
4. **Upload FTP** : envoie tout le dossier `server/` sur OVH, dans
   `/clicmots/api-src/` par exemple, PUIS place le contenu du sous-dossier
   `api/` dans `/clicmots/api/` (à la racine de `/clicmots/`, à côté du site
   déployé) — c'est ce chemin `/clicmots/api/...` que le frontend appelle.
   `setup.html` peut rester où tu veux (ex. directement dans `/clicmots/`),
   tu n'en as besoin qu'une fois.
5. **Créer le compte enseignante** : ouvre `setup.html` dans ton navigateur
   (ex. `https://www.cours-vandewalle.fr/clicmots/setup.html`), remplis le
   jeton (celui mis dans `config.php`), un identifiant et un mot de passe
   pour ta compagne. Une fois le compte créé, **supprime** `setup.html` et
   `api/setup.php` du serveur (sécurité : empêche quiconque de retenter la
   création d'un compte, même si ça échouerait de toute façon tant qu'un
   compte enseignante existe déjà).

## Sécurité

- Mots de passe jamais stockés en clair (`password_hash`/`password_verify`).
- Sessions HttpOnly + Secure + SameSite=Lax.
- Anti brute-force basique : 10 tentatives / 15 min par IP (voir `auth.php`).
- Toutes les requêtes SQL passent par des requêtes préparées (PDO) — pas
  d'injection SQL possible depuis les entrées utilisateur.
- Le lexique ajouté manuellement valide la catégorie et chaque touche
  phonétique contre une liste fermée côté serveur — impossible d'y glisser
  autre chose que des données conformes au format attendu par le site.

## Endpoints

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| POST | `/api/login.php` | public | `{identifiant, motDePasse}` → session |
| POST | `/api/logout.php` | connecté | détruit la session |
| GET | `/api/session.php` | public | état de connexion actuel |
| GET | `/api/students.php` | enseignante | liste des élèves |
| POST | `/api/students.php` | enseignante | `{prenom, motDePasse}` → crée un élève |
| DELETE | `/api/students.php?id=` | enseignante | supprime un élève |
| GET | `/api/lexicon.php` | connecté | liste des mots ajoutés |
| POST | `/api/lexicon.php` | enseignante | `{mot, categorie, genre?, phonemes}` |
| DELETE | `/api/lexicon.php?id=` | enseignante | supprime un mot ajouté |
