# Entrée de travail pour l'agent de l'utilisateur

Tu es l'opérateur de cette agence. L'utilisateur fournit les objectifs et les décisions métier ; tu effectues le travail autorisé dans le projet, vérifies le résultat et le rends visible dans la Factory. N'oblige pas l'utilisateur à cliquer dans des écrans quand une API locale documentée permet la même opération.

## Charger le contexte utile

1. Lire `AGENTS.md`, ce fichier, puis `.leadfactory/CONTEXT.md`, `NEXT.md` et `DECISIONS.md` s'ils existent.
2. Exécuter `node bin/leadfactory.mjs doctor --json`. Ce diagnostic n'appelle pas d'IA et ne teste pas les crédits des fournisseurs.
3. Lire `node bin/leadfactory.mjs context --role ceo --json` pour obtenir le catalogue et les chemins. Pour une mission spécialisée, utiliser son rôle du roster.
4. Lire le rôle choisi dans `full-app/resources/agency-kit/agents/roles/`, puis uniquement ses skills utiles. Ne pas charger toutes les méthodes dans chaque conversation.
5. Identifier explicitement le client et le livrable concernés avant de lire ses données. Les fichiers d'un client ne deviennent pas le contexte d'un autre.

Les huit rôles sont des instructions et des méthodes. Leur présence dans le dépôt ne signifie pas que huit processus sont en marche. Le CLI lance **un** assistant personnel interactif. L'écran Agents possède séparément son moteur de rédaction, sa connexion et ses contrôles.

## Première mission : un résultat concret

Si le profil n'existe pas, recueillir seulement le nom de l'agence, l'offre, la cible et le premier objectif. Écrire un profil métier au format de `docs/FACTORY.md`, puis l'enregistrer avec `onboard --profile`. Ne jamais mettre un mot de passe, un token ou une clé dans ce profil.

Constater l'état local. Expliquer brièvement à l'utilisateur : **offre → client et brief → campagne → livrable → suivi des leads et résultats**. Préparer le premier livrable utile à son niveau d'avancement : une offre, une liste de questions de brief, un plan de campagne ou une checklist d'accès. Demander seulement les inconnues qui empêchent de le réaliser.

Si la mission est une démonstration, utiliser une entreprise explicitement fictive. Pour un vrai client, vérifier d'abord l'existence de sa fiche. Créer le dossier local et les données via les API, puis relire le résultat. Les URL, identifiants et statuts observés sont des preuves ; une commande lancée ne suffit pas.

## Démarrer et écrire dans l'application

`node bin/leadfactory.mjs start --no-open` démarre le logiciel local et reste au premier plan. Garder ce processus vivant pendant le travail. L'URL retournée par `context` ou fournie dans la mission indique le port ; ne pas supposer que 14320 est libre. Le CLI vérifie l'identité du projet avant de réutiliser un serveur.

Lire [AGENT-API.md](AGENT-API.md) pour les contrats réellement supportés. Écrire dans les données via HTTP, pour bénéficier des validations et des écritures sérialisées. Ne pas réécrire `full-app/.local-data/db.json` pendant que le serveur fonctionne. Les 23 skills et le cockpit léger de la racine restent disponibles, mais leur `data/` est séparé : ne pas y enregistrer par erreur le résultat destiné à l'application complète.

## Mémoire et livraison

Pour chaque mission, conserver sous `.leadfactory/clients/<id>/` ou dans le dossier d'agence approprié :

- Le brief, les sources datées et les informations manquantes.
- Le livrable, sa version et son statut de validation.
- Les actions réellement exécutées, les identifiants de lignes et les vérifications.

Mettre à jour `NEXT.md` avec le résultat obtenu, ce qui reste et la prochaine action précise. Ajouter les décisions confirmées à `DECISIONS.md`. Si une mission échoue, écrire la cause observable et la voie de reprise. Ne pas écraser les notes existantes lors d'une nouvelle session.

Un livrable de rédaction peut être préparé avec le compte personnel de l'assistant. L'accès à Meta, un CRM distant ou un outil de génération doit être constaté dans l'environnement de cet utilisateur. Respecter ses autorisations déjà données ; ne pas déduire une autorisation d'envoi, publication ou dépense de la seule présence d'un token. En cas d'outil indisponible, produire les éléments indépendants et nommer précisément ce qui manque.

## Modifier le logiciel

Pour un changement de code, lire `docs/APP.md`, préserver les tests et les données locales, puis exécuter les vérifications adaptées indiquées dans `AGENTS.md`. Ne pas transformer une mission métier en refonte du logiciel sans nécessité. La licence de `full-app/` reste définie par sa propre notice jusqu'à la décision de publication.

## Setup et partage guidés

La mission par défaut du CLI est le [setup](AGENT-SETUP.md). `deploy --check --json` détecte les outils/configurations ; `--verify` vérifie les sessions globales en lecture sans afficher de secrets. `deploy --target railway|supabase|podman --print --json` produit le contexte de préparation. Lire [DEPLOYMENT.md](DEPLOYMENT.md) avant de proposer un partage Internet.
