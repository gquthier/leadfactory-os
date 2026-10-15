# Correctif 0.5.1 — ouverture automatique du logiciel

La commande `install` prépare désormais l’application, démarre son serveur, attend une réponse HTTP valide puis ouvre Setup dans le navigateur. Elle reste active pour garder le logiciel disponible ; Ctrl-C arrête seulement sa session. `--no-open` désactive uniquement le navigateur ; `install --no-app --no-sops` conserve une installation qui termine sans démarrer de serveur, notamment pour la CI.

Le menu et l’onboarding interactif démarrent le logiciel indépendamment du fournisseur IA. L’ouverture fonctionne aussi avec `--no-agent` ou si l’assistant choisi n’est pas installé. La commande `onboard` revient au menu après la session du CEO au lieu de fermer prématurément le serveur. Les commandes de contexte et l’onboarding JSON restent sans lancement automatique.

Trois tests du vrai processus CLI couvrent `install`, `--no-open` et `--no-app`, avec un serveur HTTP et un lanceur de navigateur de test. Ils contrôlent l’ouverture après disponibilité, le maintien du serveur, une seule installation et la fermeture du port. Trois parcours terminal supplémentaires couvrent le menu sans agent, `onboard --no-agent` et un fournisseur absent. La suite compte maintenant 150 tests racine et 12 parcours terminal. Les résultats de compilation, des tests applicatifs, des types et de l’audit sont publiés dans [GitHub Actions](https://github.com/gquthier/leadfactory-os/actions).

---

# Version 0.5.0 — onboarding et ouverture du CEO

L’installation affiche une identité LeadFactory open source bleue, une animation liée au travail en cours et des étapes lisibles. Les menus fonctionnent avec les flèches ou les numéros ; les 19 rubriques suivent l’ordre de l’application. Le mode `--plain`, `NO_COLOR` et les terminaux étroits suppriment les contrôles ANSI. `LEADFACTORY_REDUCED_MOTION=1` conserve les couleurs sans animation.

Le CLI détecte Codex et Claude Code en parallèle, consulte leur statut de connexion et affiche éventuellement le modèle configuré. Il ne lance pas d’inférence pour ce diagnostic, ne copie pas les identifiants et ne force ni modèle ni permissions. Un seul outil installé est sélectionné automatiquement ; deux outils donnent un choix ; aucun outil donne les liens d’installation et le prompt à transmettre à un autre assistant.

Après quatre réponses sur l’agence, le CEO s’ouvre automatiquement dans le projet avec le brief, les chemins de mémoire, le rôle CEO et le prompt de setup. Le logiciel se prépare en arrière-plan, puis le navigateur s’ouvre et les SOP se téléchargent. `.leadfactory/startup.json` et `setup.log` permettent à l’agent de suivre ce travail. Les vidéos et leur catalogue restent ceux de la bibliothèque immuable 0.4.0.

## Recette de cette évolution

- 147 tests du CLI, du cockpit et des méthodes réussis localement.
- Neuf parcours en vrai pseudo-terminal : Codex seul, Claude seul, choix entre les deux, mode texte simple, aucun fournisseur, ouverture différée, Ctrl-C, échec du fournisseur et CEO actif pendant une compilation bloquée.
- Ces parcours utilisent des exécutables de test : ils vérifient le lancement, les arguments, le brief, la prise du terminal, le retour au menu et l’arrêt des travaux, sans consommer de compte IA.
- Détection en lecture des deux outils réellement installés et de leur état de connexion sur macOS.
- Serveur Next.js réel, compilation déjà en cache : retour immédiat pendant la préparation, contrôle HTTP local puis deux demandes d’arrêt concurrentes ; port fermé sans erreur.
- Un nouveau test reproduit le sous-processus de compilation laissé actif lors d’une annulation. Les compilations s’exécutent désormais dans leur propre groupe de processus, terminé avant de relâcher le verrou d’installation.
- La CI reprend les neuf parcours de terminal et les tests sur macOS/Linux, Node 22/24, ainsi que l’installation, la compilation, les tests HTTP et l’audit de production de l’application. Les journaux [GitHub Actions](https://github.com/gquthier/leadfactory-os/actions) donnent le résultat de chaque révision.

Les sessions connectées indiquées par les outils ne prouvent pas leurs crédits, l’accès effectif à un modèle ou les intégrations métier. Le périmètre local et les limites de dépendances ci-dessous restent applicables.

---

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
