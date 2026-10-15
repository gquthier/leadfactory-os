# L'interface complète LeadFactory

Préparation locale du 15 octobre 2026, à la demande de Gauthier : reprendre l'UX, l'UI et les menus de `https://app.leadfactory.my/`.

## Démarrer

Node.js 22.12 ou plus récent. Depuis la racine du dépôt :

```sh
npm run app:install
npm run app:dev
```

Ouvrir **http://127.0.0.1:14320/admin/dashboard**. La configuration est accessible dans **Start Here**. Aucune clé ni base distante nécessaire pour parcourir les écrans et enregistrer ses données locales.

Pour un démarrage après compilation :

```sh
npm run app:build
npm run app:start
```

Le cockpit léger historique reste disponible avec `npm start` sur le port 4310. Sa base `data/` et celle de l'interface complète (`full-app/.local-data/`) sont distinctes. Aucun transfert de données n'est automatique.

## Interface reprise

Les composants du logiciel original fournissent le Dashboard, Pipeline, Onboarding, Clients, Résultats, Campagnes, Leads, CRM, Team, Finance, Activité, Formations, Meta Ads, UGC Scripts, Ressources, Webhooks et Paramètres. Start Here et Agents IA ajoutent la configuration de cette copie locale.

Adaptations demandées le 15 octobre pour la version open source : Chat IA est retiré de la navigation et son ancienne URL renvoie au Dashboard ; « CRM LF » devient « CRM ». La section Webhooks explique l'envoi des leads et la préparation d'une connexion avec l'agent, sans lien ni parcours Make imposé. Ressources conserve la création, l'édition, la duplication et les attributions de contenus de l'agence à côté des SOP fournies.

La palette, les bordures, les ombres, la sidebar et les écrans proviennent du code original. Les polices Space Grotesk et Inter Tight sont incluses localement avec leurs licences. Les tableaux démarrent vides, avec un administrateur fictif ; aucune statistique d'exploitation n'est préchargée.

## Connexions et portée

Clients, campagnes, questionnaire, ressources et équipe utilisent le stockage local. Les connecteurs externes restent à configurer et recetter avec les comptes de l'utilisateur. Un menu Meta Ads visible n'est pas une preuve de connexion active. Le détail est dans [Start Here](../full-app/docs/START-HERE.md).

Le mode local est un atelier administratif sur `127.0.0.1`. Il ne fournit pas une authentification multi-utilisateur pour un hébergement Internet. Les aperçus client permettent la revue locale des écrans.

Le code original de cette adaptation publique est sous MIT : [notice](../full-app/NOTICE.md). Les dépendances et leurs limites sont détaillées dans [DEPENDENCIES.md](DEPENDENCIES.md).

## Sauvegarde

Start Here propose le téléchargement des données de l’agence et leur restauration dans une installation vide. Les tokens et l’historique des agents en sont exclus. [Périmètre et procédure](../full-app/README.md#sauvegarder-et-restaurer).

L’audit des dépendances de production est désormais sans alerte. Cinq entrées liées au compilateur Tailwind restent signalées en développement : [analyse et limites](DEPENDENCIES.md).
