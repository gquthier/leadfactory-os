# Travailler avec ce dépôt

## Point d'entrée de l'agent utilisateur

Pour opérer l'agence, commencer par `docs/AGENT-START.md`, puis le contexte `.leadfactory/` de cette installation. `npm run factory` fournit l'onboarding, le menu et le lancement de l'assistant personnel dans le projet. `node bin/leadfactory.mjs context --json` fournit la carte des méthodes ; `doctor --json` vérifie les prérequis sans inférence. Les API pour agir dans l'application sont documentées dans `docs/AGENT-API.md`. Ne pas modifier directement sa base JSON lorsque le serveur tourne.

Ce dépôt contient le cockpit local d'une agence lead gen et 23 skills. Commencer par `README.md`. Pour une mission, charger uniquement le dossier du client concerné et le skill approprié (voir `docs/SKILLS.md`).

## Interface LeadFactory d'origine

Depuis le 15 octobre 2026, `full-app/` contient la copie locale de l'interface complète demandée par Gauthier : composants, navigation et écrans issus de `gquthier/leadfactory-app`, avec stockage local vide. Lire `docs/APP.md` et `full-app/NOTICE.md`. `npm run factory` installe, compile et ouvre l’application en mode production local. Les 39 méthodes et huit prompts nécessaires à cette application sont autonomes dans `full-app/resources/agency-kit/` ; le cockpit léger et ses 23 skills restent disponibles à la racine.

Ne jamais utiliser une base, des données ou des secrets de l'application d'origine. Vérifier l'app complète par `npm run app:test`, `npm run app:build` et `npm run app:typecheck`. Ses connexions et son mode distant ne sont pas certifiés par une recette de l'interface locale. La version publique de cette adaptation est sous MIT ; préserver sa notice de provenance et les licences des tiers.

## Exécuter une mission

Le cockpit démarre par `npm start` et stocke ses données dans `data/`. Préserver les frontières entre clients. Enregistrer le brief, les hypothèses, les sources, le livrable et la prochaine action. Les accès aux services se configurent dans l'environnement de l'utilisateur, jamais dans les notes ou Git.

Les skills utilisent uniquement les outils effectivement disponibles ; distinguer instruction, tentative, résultat observé et action externe exécutée. La présence d'un skill ou d'un token ne vaut pas autorisation d'envoi, de diffusion ou de dépense.

Le cockpit recherche les changements toutes les trois secondes et préserve les saisies ou brouillons non enregistrés. Respecter ce comportement lors des modifications d'interface.

## Modifier le code

Garder le cockpit et le CLI sans dépendances, leur persistance portable et leur démarrage Node.js 22 (22.12 minimum pour la Factory complète). Utiliser des fixtures fictives et vérifier le comportement modifié avec `npm test`. Ne pas committer `data/`, `.leadfactory/`, exports personnels, captures de vrais clients, secrets ou logs. Le kit est MIT ; préserver les attributions des skills adaptés.
