# Ouvrir son agence et travailler avec son agent

La Factory rassemble l'application, le contexte de votre agence et les méthodes de travail. Vous donnez l'objectif ; votre assistant prépare les dossiers et les livrables, et vous retrouvez le résultat dans l'application.

## Premier lancement

Avec Node.js **22.12 ou plus récent** et Git :

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.4.1 leadfactory init mon-agence
```

Le CLI demande le nom de l'agence, son offre, sa cible, son premier objectif et votre assistant. Vous pouvez répondre « à définir » : votre agent vous aidera à préciser ces points. Choisissez ensuite **Ouvrir ma Factory et lancer mon agent**.

Les dépendances verrouillées sont installées et l’application est compilée en production. Les vidéos (environ 1,1 Go) sont récupérées depuis la release et vérifiées par SHA-256. Utiliser `--no-sops` pour différer les vidéos, puis `npm run factory -- sops` pour les installer. Le navigateur ouvre **Setup**, puis votre assistant démarre dans le projet avec votre brief et le prompt de setup : trouver les accès autorisés, configurer les outils utiles et demander une seule action à la fois quand une clé manque. Le premier téléchargement dépend de la connexion ; le CLI affiche le chemin du journal en cas de problème. Il ne faut pas installer séparément les méthodes dans votre configuration globale : l'agent reçoit leurs chemins dans le projet.

Codex ou Claude Code doit être installé et connecté à votre propre compte. Vérifiez avec `codex --version` ou `claude --version`, puis connectez-vous si nécessaire avec `codex login` ou `claude auth login`. Guides officiels : [Codex CLI](https://developers.openai.com/codex/cli/) et [Claude Code](https://code.claude.com/docs/en/quickstart). Le CLI Factory conserve vos réglages de modèle et de permissions. Une version détectée ne prouve pas l'authentification ou le quota ; l'assistant affiche ses propres demandes de connexion.

Avec un autre assistant, choisissez **recevoir le contexte**, ouvrez le même dossier dans votre outil et donnez-lui le prompt affiché. Aucun fournisseur de remplacement n'est choisi automatiquement.

## Ce que le menu permet

| Action | Résultat |
| --- | --- |
| Ouvrir ma Factory et lancer mon agent | Application et assistant prêts pour le premier livrable |
| Naviguer dans la Factory | Accès direct au dashboard, clients, campagnes, CRM, résultats, ressources et finances |
| Confier une mission | Onboarding, acquisition, campagne, création, delivery ou reprise |
| Comprendre le parcours | Explication des étapes et des dossiers |
| Modifier le brief | Actualiser l'offre et la cible sans effacer les décisions |
| Vérifier mon installation | Node, Git, assistants, dépendances et méthodes présentes |
| Afficher le contexte | Prompt utilisable par un autre assistant |
| Partager mon dashboard | Vérifier les configurations existantes et préparer Railway, Supabase ou Podman avec l’agent |

Le menu se pilote avec un numéro puis Entrée. Quittez la session de l'assistant pour revenir au menu. Quitter la Factory arrête uniquement le serveur qu'elle a démarré ; les données restent sur disque. Pour garder seulement le logiciel ouvert : `npm run factory -- start`.

## Reprendre demain

Relancez `npm run factory`, puis **Confier une mission → Reprendre la dernière mission**. Le brief, les décisions et la prochaine action sont conservés dans `.leadfactory/`. L'agent doit y écrire son compte rendu à la fin de chaque mission ; le CLI ne prétend pas qu'une mission est terminée à sa place.

| Dossier | Contenu |
| --- | --- |
| `.leadfactory/profile.json` et `CONTEXT.md` | Brief de votre agence, sans identifiants de connexion |
| `.leadfactory/NEXT.md` et `DECISIONS.md` | Travail à reprendre, résultats vérifiés et décisions |
| `.leadfactory/clients/<id>/` | Notes et livrables de travail du client concerné |
| `full-app/.local-data/` | Données affichées dans l'application et connexions locales séparées |
| `full-app/resources/agency-kit/` | Huit rôles et 39 méthodes incluses dans le dépôt |

Ces données locales sont exclues de Git. Le profil de la Factory est un brief de travail pour l'agent : il n'est pas une nouvelle fiche client et ne modifie pas les connexions de Start Here. La sauvegarde métier depuis l'application ne comprend pas le dossier `.leadfactory/` : copiez aussi ce dossier pour conserver la mémoire de votre agent. Les secrets des connexions restent exclus de l'export métier et doivent être reconfigurés sur une autre machine.

## Télécharger une installation avec le CLI

Le CLI sait créer un nouveau dossier et télécharger le dépôt avec ses méthodes :

```sh
node bin/leadfactory.mjs init ../mon-agence --ref NOM_DE_LA_REVISION
```

Il refuse d'écraser un dossier existant. La révision doit contenir le CLI, l'application et ses guides. `--no-onboard` permet de télécharger uniquement. Reprendre un dossier existant : `npm run factory -- --project /chemin/mon-agence`.

La commande ci-dessus utilise le tag **v0.4.1** du dépôt public, et non un paquet publié sur le registre npm. Le clone contient l’application, les méthodes, les tests et les guides ; le petit paquet lancé par `npx` sert à télécharger ce projet. Aucun compte métier n’est connecté par le téléchargement.

## Commandes pour les agents

```sh
node bin/leadfactory.mjs doctor --json
node bin/leadfactory.mjs context --json
node bin/leadfactory.mjs onboard --profile /chemin/profil.json --json
node bin/leadfactory.mjs agent --provider codex --role ceo --task "Préparer mon offre" --print --json
node bin/leadfactory.mjs start --no-open --port 14321
```

Le point d'entrée de l'agent est [AGENT-START.md](AGENT-START.md). Son accès aux données passe par les [API locales documentées](AGENT-API.md). `agent --print` n'appelle pas de modèle ; lancer réellement `agent` ouvre votre assistant interactif et utilise votre compte.

Exemple de profil pour un setup sans questions :

```json
{
  "agency": "Mon agence",
  "offer": "Prise de rendez-vous B2B",
  "audience": "PME industrielles",
  "objective": "Préparer ma première offre",
  "provider": "codex",
  "language": "fr",
  "port": 14320
}
```

## Résoudre un démarrage bloqué

- **Port utilisé :** choisissez `--port 14321`. La Factory refuse de confondre deux projets sur le même port.
- **Installation interrompue :** Ctrl-C nettoie les verrous. Après une coupure brutale seulement, vérifier qu’aucune installation ne tourne, retirer le dossier vide `.leadfactory/install.lock` ou `full-app/public/sops/.install-lock` indiqué dans l’erreur, puis relancer. Pour réparer les dépendances, lancer `npm run factory -- install`, puis le menu. Les fichiers métier sont conservés.
- **Assistant absent ou non connecté :** installez/connectez votre assistant avec son guide officiel ; `context` reste disponible.
- **Serveur arrêté :** lisez `.leadfactory/app.log`, corrigez l'erreur puis relancez. Le mode local reste lié à `127.0.0.1`.
- **Terminal distant sans navigateur :** ajoutez `--no-open` et utilisez l'adresse affichée depuis la même machine.

La recette du CLI cible macOS et Linux. Windows natif reste à tester ; utiliser WSL en attendant sa validation. Les intégrations payantes et l'authentification distante ont leur propre recette, distincte du démarrage local.

## Connexions et partage

[Setup guidé par l’agent](AGENT-SETUP.md) : mêmes instructions dans le CLI et les boutons copiables de Setup. [Partager son dashboard](DEPLOYMENT.md) : `npm run factory -- deploy`, ou `deploy --check --verify --json` pour vérifier les sessions globales existantes en lecture. Le partage Internet de cette version nécessite encore la recette distante ; les connexions détectées ne la remplacent pas.
