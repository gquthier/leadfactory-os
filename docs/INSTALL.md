# Installer LeadFactory OS

Prévoir **Node.js 22.12+**, **Git**, une connexion Internet et environ **4 Go libres** pour le code, la compilation et les vidéos. macOS et Linux sont les cibles de cette version ; Windows natif reste à valider (utiliser WSL). Aucun accès GitHub privé n’est nécessaire.

## 1. Télécharger et lancer

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.5.1 leadfactory init mon-agence
```

Le dossier doit être nouveau. Le CLI affiche l’installation, détecte Codex et Claude Code et leurs sessions, puis demande quatre informations sur l’agence. Si les deux assistants sont installés, choisir celui à utiliser ; sinon l’outil présent est sélectionné automatiquement. Le CEO s’ouvre dès le brief enregistré avec le contexte et le prompt de setup.

Le logiciel se prépare en arrière-plan : dépendances verrouillées, compilation de production, ouverture de Setup, puis récupération des vidéos. Garder la Factory ouverte pendant cette préparation. L’état est dans `.leadfactory/startup.json`, le journal dans `.leadfactory/setup.log`. Les lancements suivants réutilisent la compilation tant que les sources ne changent pas.

Pour un assistant autre que Codex ou Claude Code, choisir **Un autre assistant · copier le contexte**. Codex ou Claude Code utilise le compte personnel de l’utilisateur et demande sa connexion si nécessaire. Le CLI conserve leurs réglages de permissions et de modèle. Pour une interface texte simple : `--plain`. Pour différer l’ouverture du CEO : `--no-agent` ; le logiciel se lance et s’ouvre tout de même.

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
npx --yes --package github:gquthier/leadfactory-os#v0.5.1 leadfactory init mon-agence --no-sops
cd mon-agence
npm run factory -- sops
```

Chaque fichier est contrôlé par taille et SHA-256. Le catalogue est activé une fois les médias vérifiés. Un téléchargement interrompu reprend les fichiers manquants ; les fichiers personnels existants ne sont pas écrasés.

## Installation manuelle et diagnostic

```sh
git clone --branch v0.5.1 --single-branch https://github.com/gquthier/leadfactory-os.git mon-agence
cd mon-agence
npm run factory -- doctor --json
npm run factory -- start
```

`start --no-open --no-sops` fonctionne sans assistant ni ouverture de navigateur. Garder le terminal ouvert ; Ctrl-C arrête uniquement son serveur. `install --no-sops` réinstalle les dépendances, reconstruit l’application, démarre son serveur et ouvre automatiquement Setup dans le navigateur, sans toucher aux dossiers métier. Le terminal reste ouvert pour maintenir le logiciel actif. Pour installer uniquement et rendre la main à un script : `install --no-app --no-sops`. `--no-open` conserve le serveur sans ouvrir de navigateur. Les erreurs de préparation sont dans `.leadfactory/setup.log`, celles du serveur dans `.leadfactory/app.log`.

Le serveur écoute uniquement `127.0.0.1`. Le mode local n’est pas un hébergement multi-utilisateurs. [Partager et déployer](DEPLOYMENT.md) demande une recette supplémentaire de l’authentification et des intégrations.

[Guide complet du CLI](FACTORY.md) · [Documentation des agents](AGENT-START.md) · [API locales](AGENT-API.md) · [Limites et sécurité](../SECURITY.md)

Le cockpit historique léger reste disponible via `npm start` sur `http://127.0.0.1:4310`. Il possède son propre stockage `data/` ; le CLI Factory utilise l’interface complète.
