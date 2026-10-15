# Correctif 0.4.1 — 15 octobre 2026

La recette publique de 0.4.0 a mis en évidence deux demandes concurrentes de fermeture lors d’un Ctrl-C. Si le serveur attendait encore une connexion HTTP, les deux appels pouvaient tenter de tuer le même groupe de processus et lever `kill EPERM` sur macOS. Le correctif partage une seule promesse de fermeture et n’envoie chaque signal qu’une fois. Un test reproduisant un serveur qui ignore SIGTERM a échoué sur 0.4.0 avec cette même erreur ; il couvre désormais l’arrêt forcé et la concurrence des demandes.

Le correctif passe les **134 tests** du CLI/cockpit. Il a aussi été vérifié avec le vrai serveur Next.js pendant une lecture vidéo ouverte : fermeture concurrente sans erreur, port fermé et autre session préservée.

La version 0.4.1 réutilise la bibliothèque immuable de 0.4.0 et ses mêmes empreintes SHA-256. Il n’est pas nécessaire de télécharger à nouveau les fichiers vérifiés. Les instructions d’installation utilisent le tag 0.4.1.

Le parcours public 0.4.0 a également validé le téléchargement sans identifiants GitHub, le clone, l’onboarding, le contexte de huit rôles et 39 méthodes, les 83 médias, leur reprise après interruption, l’installation automatique et la compilation. Les 15 vidéos sont visibles dans Ressources ; la lecture MP4 avec sous-titres français et chapitres a été constatée dans le navigateur. Les 75 URL de médias requises répondent HTTP 200, la lecture partielle MP4 HTTP 206 et une origine étrangère HTTP 403.

## Vérifications de la version 0.4.0 — 15 octobre 2026

## Distribution

Cette version est préparée dans un dépôt neuf, sans reprise des anciennes branches privées. Le CLI public est un petit paquet téléchargé par npm depuis le tag GitHub ; il clone ensuite le projet complet. Le code original publié est sous MIT, avec conservation des notices des tiers. Les données d’agence, connexions, historiques personnels, fichiers d’environnement et caches ne font pas partie du dépôt.

La commande `init` refuse d’écraser un dossier. L’installation utilise `npm ci` et le lockfile versionné. Le serveur lancé par le CLI utilise une compilation de production, écoute `127.0.0.1` et vérifie l’identité du projet avant de réutiliser un port. Un arrêt de la Factory ne tue pas un serveur démarré par une autre session.

Les médias sont des assets de release séparés : 83 fichiers, environ 1,1 Go, vérifiés par taille et SHA-256 avec `resources/sops-manifest.json`. Aucun média n’est exécuté ni extrait d’une archive. Les redirections sont limitées aux hôtes GitHub attendus, les chemins dangereux et liens symboliques sont refusés, le catalogue est activé en dernier et les fichiers modifiés par l’utilisateur sont préservés. Ctrl-C annule le téléchargement et nettoie le verrou.

## Vérifications locales réalisées

Sur macOS avec Node 26.6.0 :

- Installation sans `node_modules` et compilation de production par `prepareApp` : réussies.
- 133 tests du cockpit, du CLI et des méthodes : réussis.
- 37 tests de l’application complète : réussis.
- 3 parcours HTTP sur la compilation de production : réussis (menus, isolation locale, export/restauration, mission agent avec livrable fictif).
- TypeScript : aucune erreur.
- Audit des dépendances de production : zéro vulnérabilité signalée à cette date.
- Le pipeline CI complète cette recette sur Node 22/24, Linux/macOS ; son statut et ses journaux font foi dans [GitHub Actions](https://github.com/gquthier/leadfactory-os/actions).

## Sécurité et limites connues

Le scanner de secrets utilise les règles Gitleaks par défaut. Son exception est limitée aux noms de champs `d_cible1_*` et `d_cible2_*` du questionnaire, dans un unique fichier ; elle ne désactive pas le contrôle des secrets du projet. Les fichiers de connexion restent locaux avec permissions 0600 ; ils ne sont pas chiffrés au repos et ne font pas partie des exports métier.

L’audit complet signale encore la chaîne de compilation Tailwind 3 / braces. Aucune version corrigée de braces n’est publiée au moment du contrôle. Les détails et le périmètre sont dans [DEPENDENCIES.md](DEPENDENCIES.md) ; l’alerte n’est ni supprimée ni présentée comme corrigée.

Le mode local n’est pas une authentification multi-utilisateurs. Les requêtes avec un hôte ou une origine étrangère sont rejetées ; les anciennes API externes sont bloquées dans ce mode. Le partage sur Internet, Auth/RLS/Storage Supabase, les notifications clients et les permissions métier Meta nécessitent une recette distincte sur les comptes de l’utilisateur. Le conteneur Podman est fourni mais n’a pas été exécuté pendant cette recette, faute de moteur actif. Le CLI `deploy` est un diagnostic et un transfert de contexte à l’agent, pas une certification de déploiement distant.

Les tests de lancement de Codex/Claude vérifient le transfert d’arguments et la conservation des permissions ; ils ne prouvent pas l’authentification ni les quotas du compte de chaque utilisateur. Aucune campagne, dépense ou notification réelle n’est utilisée pour valider cette version.

Ces contrôles réduisent les risques identifiés ; ils ne garantissent pas l’absence de toute faille. Signaler les problèmes selon [SECURITY.md](../SECURITY.md).
