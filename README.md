<div align="center">

# LeadFactory OS

### Votre agence de lead gen. Votre logiciel. Votre agent IA.

Un espace local pour organiser les clients, préparer les campagnes, suivre les leads et confier le travail à votre assistant — avec les méthodes et le contexte déjà dans le projet.

[![Vérifications](https://github.com/gquthier/leadfactory-os/actions/workflows/test.yml/badge.svg)](https://github.com/gquthier/leadfactory-os/actions/workflows/test.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.1-blue)](https://github.com/gquthier/leadfactory-os/releases/tag/v0.5.1)

[Installer](docs/INSTALL.md) · [Comprendre le parcours](docs/FACTORY.md) · [Pour les agents](docs/AGENT-START.md) · [Contribuer](CONTRIBUTING.md)

</div>

## Lancez votre Factory

Avec **Node.js 22.12+ et Git**, sur macOS ou Linux :

```sh
npx --yes --package github:gquthier/leadfactory-os#v0.5.1 leadfactory init mon-agence
```

Une installation animée, quatre réponses, puis **votre CEO prend la main**. Le CLI détecte Codex et Claude Code sur votre machine ; s’ils sont tous les deux installés, vous choisissez. Votre assistant s’ouvre automatiquement dans le projet avec le brief de l’agence, son rôle, sa mémoire et la mission de setup.

Le dashboard se prépare silencieusement en arrière-plan et ouvre automatiquement **Setup** dans votre navigateur dès qu’il est prêt, même sans assistant IA ou avec `--no-agent`. Les vidéos se téléchargent ensuite : elles ne retardent pas votre première conversation. Les menus au clavier suivent le même ordre que l’application.

Le CLI est distribué depuis le tag GitHub public : aucun compte npm ou accès privé au dépôt n’est nécessaire. Prévoyez environ 4 Go libres et quelques minutes au premier lancement. Les vidéos représentent 1,1 Go ; ajoutez `--no-sops` pour les installer plus tard. `--plain` désactive les animations et `--no-agent` permet de rester au menu après le brief.

## Du contexte aux livrables

| Votre besoin | Ce qui est inclus |
| --- | --- |
| Démarrer sans assembler une pile d’outils | Un onboarding, un menu de navigation et une application locale |
| Donner un vrai contexte à l’agent | Brief de l’agence, décisions, prochaine action, huit rôles et 39 méthodes |
| Organiser les opérations | Clients, briefs, campagnes, CRM, livrables et ressources personnalisables |
| Configurer les connexions | Setup avec clés privées, prompts copiables et aide de votre agent |
| Transmettre le savoir-faire | 15 vidéos françaises avec voix, chapitres, sous-titres et fiches ; tutoriels et modèles de procédures clairement distingués |
| Garder la main sur le travail | Données locales, sauvegarde métier, ressources modifiables et copies indépendantes |

Codex et Claude Code sont pris en charge avec **votre propre compte**. Un autre assistant peut recevoir le même prompt. Vos réglages de modèle et de permissions sont conservés ; LeadFactory ne fournit ni crédits IA ni comptes fournisseurs.

## Reprenez là où vous en étiez

```sh
cd mon-agence
npm run factory
```

Choisissez une mission ou naviguez vers **Clients**, **Campagnes**, **CRM** et **Ressources**. Votre agent s’appuie sur `.leadfactory/` pour retrouver le contexte. Les données de l’application restent dans `full-app/.local-data/` ; ni les données clients ni les clés ne sont committées dans Git.

```sh
npm run factory -- doctor --json       # Diagnostic local
npm run factory -- start --no-sops     # Ouvrir uniquement le logiciel
npm run factory -- context --json      # Contexte à transmettre à un agent
npm run factory -- sops                # Installer / vérifier les vidéos
npm run factory -- deploy --check      # Examiner les options de déploiement
```

## Périmètre de cette version

**Cette version est un logiciel local.** Elle démarre vide sur `127.0.0.1`, sans base de production ni clé préchargée. Les actions métier locales sont utilisables sans Supabase. La sauvegarde des clés et les tests de connexion ne rendent pas tous les anciens adaptateurs externes opérationnels.

Les notifications réelles aux clients, l’achat média, OAuth Meta et le partage d’un dashboard sur Internet nécessitent leurs connexions, permissions et tests. Le parcours `deploy` prépare ces étapes avec votre agent ; il ne promet pas un SaaS multi-utilisateurs déployé en un clic. [Détails du périmètre](docs/APP.md) · [Déploiement](docs/DEPLOYMENT.md).

La bibliothèque vidéo inclut des captures du logiciel et de Meta, ainsi que des modèles de procédures clients. Les modèles sont identifiés comme tels ; ils ne sont pas des démonstrations d’interfaces externes. [Voir les ressources](docs/SOPS.md).

## Conçu pour travailler avec vos agents

- [Point d’entrée et règles de travail](docs/AGENT-START.md)
- [Prompts de setup et connexions](docs/AGENT-SETUP.md)
- [API locales et exemples](docs/AGENT-API.md)
- [Parcours complet d’une agence](docs/AGENCY-PLAYBOOK.md)
- [Installation et dépannage](docs/INSTALL.md)

## Ouvert, documenté, vérifiable

Le code original publié est sous **MIT**. Les dépendances, polices et méthodes adaptées conservent leurs [attributions](THIRD_PARTY_NOTICES.md). Le dépôt public a un historique propre et n’inclut pas les anciennes branches internes.

Les tests, la compilation et l’audit des dépendances de production tournent en CI. Les [vérifications de release](docs/RELEASE.md), la [revue des dépendances](docs/DEPENDENCIES.md) et la [politique de sécurité](SECURITY.md) précisent ce qui a été testé et les limites connues. Aucun audit ne constitue une garantie d’absence de faille.
