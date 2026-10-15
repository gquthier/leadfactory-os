# Installer LeadFactory OS

Prévoir **Node.js 22.12+**, **Git**, une connexion Internet et environ **4 Go libres** pour le code, la compilation et les vidéos. macOS et Linux sont les cibles de cette version ; Windows natif reste à valider (utiliser WSL). Aucun accès GitHub privé n’est nécessaire.

## 1. Télécharger et lancer

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.4.1 leadfactory init mon-agence
```

Le dossier doit être nouveau. Répondre aux questions sur l’agence et choisir son assistant. Le CLI installe les dépendances verrouillées, compile le logiciel puis ouvre Setup et transmet le contexte à l’agent. Le premier lancement est plus long ; les suivants réutilisent la compilation tant que les sources ne changent pas.

Pour un assistant autre que Codex ou Claude Code, choisir **recevoir le contexte**. Ces assistants doivent être installés et connectés au compte personnel de l’utilisateur. Le CLI conserve leurs réglages de permissions et de modèle.

## 2. Connecter uniquement les outils utiles

Dans **Setup**, copier le prompt de setup ou celui d’un service avec **Ask agent to find it and update**. L’agent recherche les accès autorisés, les configure, puis indique ce qui a réellement été testé. Une clé enregistrée n’active pas automatiquement une intégration distante. Aucun compte payant n’est nécessaire pour ouvrir et utiliser les écrans locaux.

## 3. Reprendre le projet

```sh
cd mon-agence
npm run factory
```

Le contexte est dans `.leadfactory/`, les données de l’application dans `full-app/.local-data/`. Ces dossiers sont privés et exclus de Git. Le menu ouvre les clients, campagnes, CRM, ressources et missions des agents.

## Vidéos et connexion lente

Les 15 vidéos et leurs documents occupent environ 1,1 Go. Pour les installer plus tard :

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.4.1 leadfactory init mon-agence --no-sops
cd mon-agence
npm run factory -- sops
```

Chaque fichier est contrôlé par taille et SHA-256. Le catalogue est activé une fois les médias vérifiés. Un téléchargement interrompu reprend les fichiers manquants ; les fichiers personnels existants ne sont pas écrasés.

## Installation manuelle et diagnostic

```sh
git clone --branch v0.4.1 --single-branch https://github.com/gquthier/leadfactory-os.git mon-agence
cd mon-agence
npm run factory -- doctor --json
npm run factory -- start
```

`start --no-open --no-sops` fonctionne sans assistant ni ouverture de navigateur. Garder le terminal ouvert ; Ctrl-C arrête uniquement son serveur. `install --no-sops` réinstalle les dépendances et reconstruit l’application sans toucher aux dossiers métier. Les erreurs serveur sont dans `.leadfactory/app.log`.

Le serveur écoute uniquement `127.0.0.1`. Le mode local n’est pas un hébergement multi-utilisateurs. [Partager et déployer](DEPLOYMENT.md) demande une recette supplémentaire de l’authentification et des intégrations.

[Guide complet du CLI](FACTORY.md) · [Documentation des agents](AGENT-START.md) · [API locales](AGENT-API.md) · [Limites et sécurité](../SECURITY.md)

Le cockpit historique léger reste disponible via `npm start` sur `http://127.0.0.1:4310`. Il possède son propre stockage `data/` ; le CLI Factory utilise l’interface complète.
