# Partager son dashboard avec l’aide de son agent

Le CLI propose un parcours guidé, depuis le menu **Partager mon dashboard** ou :

```sh
npm run factory -- deploy
```

Il détecte les outils installés et la présence de configurations dans ce projet. Il propose une destination, puis lance votre agent personnel avec le diagnostic et les contraintes de l’application. Le lancement ne déploie pas silencieusement : l’agent prépare les étapes et utilise les autorisations données pour la destination choisie. Le diagnostic ne lit ni n’affiche les contenus des fichiers de secrets.

## Une commande de vérification

```sh
npm run factory -- deploy --check --json
npm run factory -- deploy --check --verify --json
```

Sans `--verify` : versions des CLI, présence d’un fichier d’environnement, de `supabase/config.toml`, de `railway.json`/`railway.toml`, et indicateurs de variables de tokens. Avec `--verify` : chaque CLI utilise sa session existante pour un contrôle en lecture. Leurs sorties privées ne sont pas reproduites dans le rapport : seul le statut apparaît.

Les sessions globales sont vérifiées par le CLI du fournisseur, sans scanner les autres projets ni recopier sa configuration. Supabase appelle `projects list --output json`, Railway `whoami --json`, Podman `info --format json`. Une erreur peut signifier réseau indisponible, authentification absente, permissions insuffisantes ou moteur arrêté : le rapport dit « à vérifier », sans inventer la cause. Un token Railway limité à un projet peut ne pas permettre `whoami` ; l’agent doit vérifier le projet visé avec les outils appropriés.

## Choisir la destination

| Choix | Usage | Travail de l’agent |
|---|---|---|
| Railway + Supabase | Dashboard partagé en ligne | Choisir le projet, préparer base/Auth/Storage, sécuriser les accès, héberger l’application, vérifier l’URL |
| Supabase | Base, comptes et stockage | Configurer un projet propre et recetter le schéma et les accès ; l’application a aussi besoin d’un hébergeur |
| Podman | Installation locale en conteneur | Construire le paquet fourni, monter les données et ouvrir uniquement le port local |

Préparer un prompt sans lancer de modèle :

```sh
npm run factory -- deploy --target railway --print --json
npm run factory -- deploy --target supabase --print
npm run factory -- deploy --target podman --print
```

Retirer `--print` lance votre agent personnel. Il lit le projet, réutilise seulement les accès autorisés, prépare les fichiers et demande une information uniquement quand la destination ou le périmètre manque. Une configuration détectée n’autorise pas l’utilisation arbitraire d’un projet existant.

## Paquet Podman local

`deploy/Containerfile` contient l’application et ses méthodes. `.containerignore` exclut les dépendances installées, caches, données et fichiers d’environnement. Construire depuis la racine :

```sh
podman build -f deploy/Containerfile -t leadfactory-local .
podman volume create leadfactory-data
podman run --name leadfactory --rm -p 127.0.0.1:14320:14320 -v leadfactory-data:/app/.local-data:U leadfactory-local
```

Le volume persiste les données, `:U` attribue son propriétaire à l’utilisateur du conteneur. Utiliser uniquement le volume nommé prévu, pas un répertoire arbitraire avec `:U`. Le conteneur écoute en interne sur toutes ses interfaces pour permettre le mapping ; le port de la machine reste sur `127.0.0.1`, et le garde d’hôte de l’application reste actif. Ouvrir `http://127.0.0.1:14320/admin/start-here`.

La recette réelle du conteneur doit être effectuée sur une machine avec Podman opérationnel avant de le déclarer prêt. Le CLI personnel de la machine hôte peut piloter l’application par les API locales ; le conteneur n’embarque ni ses identifiants ni un agent connecté. Configurer les clés de cette installation dans Setup. Le partage de vidéos SOP nécessite aussi leurs fichiers dans `full-app/public/sops/` au moment de la construction.

## Condition du partage Internet

Cette version est vérifiée pour une utilisation locale. Son administrateur fictif et son garde loopback ne sont pas un système d’accès Internet. Le diagnostic conserve `publicReady: false` tant que la recette distante de cette version n’est pas faite.

Avant de partager une URL publique, l’agent doit produire des preuves : authentification, autorisations serveur, séparation de deux clients, RLS/Storage, callbacks, sauvegarde et restauration, accès anonyme refusé. Un changement de mode ou une clé Supabase ne suffit pas. Préparer les ressources privées est distinct de publier les sources ou une image : respecter `full-app/NOTICE.md` et les blocages de [LAUNCH-READINESS.md](LAUNCH-READINESS.md). Ne pas supprimer ces gardes pour faire passer une démonstration.

Commandes vérifiées dans les documentations officielles le 15 octobre 2026 : [Railway whoami](https://docs.railway.com/cli/whoami), [CLI Supabase](https://supabase.com/docs/reference/cli/v0/supabase-projects-list), [Podman info](https://docs.podman.io/en/latest/markdown/podman-info.1.html).
