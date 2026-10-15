# Ouvrir son agence et travailler avec son agent

La Factory rassemble l'application, le contexte de votre agence et les méthodes de travail. Vous donnez l'objectif ; votre assistant prépare les dossiers et les livrables, et vous retrouvez le résultat dans l'application.

## Premier lancement

Avec Node.js **22.12 ou plus récent** et Git :

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.5.0 leadfactory init mon-agence
```

Le parcours affiche quatre étapes : détecter votre assistant, présenter l’agence, enregistrer le contexte et ouvrir le CEO. Renseignez le nom, l’offre, la cible et le premier objectif ; Entrée accepte « à définir avec mon agent » pour les détails. Aucun clic de lancement supplémentaire : le CEO démarre dès la fin de l’onboarding interactif.

Codex et Claude Code sont détectés en parallèle via leurs commandes de version et de statut de connexion, sans inférence. Si un seul est installé, il est sélectionné ; si les deux sont présents, le menu propose celui déjà connecté par défaut, ou votre choix précédent. `--provider codex|claude|manual` reste prioritaire. Une connexion détectée correspond à l’état déclaré par l’outil, pas à une vérification de ses crédits ni de l’accès à chaque modèle.

Le nom de modèle configuré peut être affiché à titre indicatif ; le CLI ne le force pas et ne modifie ni les permissions ni les réglages du fournisseur. Les réglages propres au projet restent applicables. Guides officiels : [Codex CLI](https://developers.openai.com/codex/cli/) et [Claude Code](https://code.claude.com/docs/en/quickstart). Si nécessaire, se connecter avec `codex login` ou `claude auth login` ; aucune clé IA n’est copiée dans le profil agence.

Pendant votre conversation, les dépendances verrouillées s’installent et l’application se compile en production, sans écrire de logs dans le terminal de l’assistant. Le navigateur ouvre Setup quand le logiciel est prêt ; les vidéos (environ 1,1 Go) se téléchargent ensuite et sont vérifiées par SHA-256. L’agent peut consulter `.leadfactory/startup.json` et `.leadfactory/setup.log`. Il avance sur le brief pendant la préparation, puis vérifie les API et connecte les outils utiles. Il reçoit les chemins des méthodes dans le projet ; aucune installation globale des skills n’est nécessaire.

`--no-sops` diffère les vidéos ; `npm run factory -- sops` les reprend. `--no-app` ouvre seulement l’assistant. `--no-agent` conserve l’onboarding et affiche le menu sans ouvrir automatiquement une session IA. Avec un autre assistant, choisir **Un autre assistant · copier le contexte**, ouvrir le même dossier et lui transmettre le prompt affiché. Si aucun outil n’est installé, les liens officiels et ce prompt sont proposés.

## Ce que le menu permet

| Action | Résultat |
| --- | --- |
| Parler à mon CEO | Session de votre assistant avec le contexte agence ; logiciel préparé en arrière-plan |
| Naviguer dans la Factory | Accès direct au dashboard, clients, campagnes, CRM, résultats, ressources et finances |
| Confier une mission | Onboarding, acquisition, campagne, création, delivery ou reprise |
| Modifier le brief | Actualiser l'offre et la cible sans effacer les décisions |
| Changer mon assistant | Choisir un outil installé ou copier le contexte |
| Partager mon dashboard | Vérifier les configurations existantes et préparer Railway, Supabase ou Podman avec l’agent |
| Vérifier mon installation | Node, Git, assistants, dépendances et méthodes présentes |
| Copier le contexte | Prompt utilisable par un autre assistant |
| Comprendre le parcours | Explication des étapes et des dossiers |
| Quitter | Arrêter la préparation et le serveur de cette session |

Le menu se pilote avec ↑/↓ et Entrée, ou un numéro puis Entrée. Les 19 rubriques de navigation suivent exactement l’ordre de la barre latérale du logiciel. `--plain`, `NO_COLOR` ou un terminal étroit activent la version texte sans contrôles ANSI ; `LEADFACTORY_REDUCED_MOTION=1` conserve les couleurs sans animation. Quittez la session de l'assistant pour revenir au menu. Quitter la Factory annule la préparation en cours et arrête uniquement le serveur qu'elle a démarré ; les données restent sur disque. Pour garder seulement le logiciel ouvert : `npm run factory -- start`.

## Reprendre demain

Relancez `npm run factory`, puis **Confier une mission → Reprendre la dernière mission**. Le brief, les décisions et la prochaine action sont conservés dans `.leadfactory/`. L'agent doit y écrire son compte rendu à la fin de chaque mission ; le CLI ne prétend pas qu'une mission est terminée à sa place.

| Dossier | Contenu |
| --- | --- |
| `.leadfactory/profile.json` et `CONTEXT.md` | Brief de votre agence, sans identifiants de connexion |
| `.leadfactory/NEXT.md` et `DECISIONS.md` | Travail à reprendre, résultats vérifiés et décisions |
| `.leadfactory/startup.json` et `setup.log` | État et journal de la préparation ; vérifier que le PID est toujours actif |
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

La commande ci-dessus utilise le tag **v0.5.0** du dépôt public, et non un paquet publié sur le registre npm. Le clone contient l’application, les méthodes, les tests et les guides ; le petit paquet lancé par `npx` sert à télécharger ce projet. Aucun compte métier n’est connecté par le téléchargement.

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
- **Préparation ou serveur arrêté :** lisez `.leadfactory/setup.log` puis `.leadfactory/app.log`, corrigez l'erreur puis relancez. Le mode local reste lié à `127.0.0.1`.
- **Terminal distant sans navigateur :** ajoutez `--no-open` et utilisez l'adresse affichée depuis la même machine.

La recette du CLI cible macOS et Linux. Windows natif reste à tester ; utiliser WSL en attendant sa validation. Les intégrations payantes et l'authentification distante ont leur propre recette, distincte du démarrage local.

## Connexions et partage

[Setup guidé par l’agent](AGENT-SETUP.md) : mêmes instructions dans le CLI et les boutons copiables de Setup. [Partager son dashboard](DEPLOYMENT.md) : `npm run factory -- deploy`, ou `deploy --check --verify --json` pour vérifier les sessions globales existantes en lecture. Le partage Internet de cette version nécessite encore la recette distante ; les connexions détectées ne la remplacent pas.
