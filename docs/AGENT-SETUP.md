# Setup guidé par l’agent

Le bouton « Copier le setup prompt » de `/admin/start-here` et la mission par défaut de `npm run factory -- agent` partagent exactement `full-app/runtime/setup-prompt.mjs`. Le CLI ajoute le chemin du projet, l’adresse de la session et le contexte de l’agence. `--task` permet de choisir une autre mission. Les boutons « Ask agent to find it and update » copient une variante ciblée à coller dans l’agent ; ils ne démarrent pas une exécution cachée.

## Parcours

1. Lire le contexte de cette installation et `docs/AGENT-API.md`. Déterminer l’adresse de cette session depuis le CLI ou `.leadfactory/profile.json`, sans présumer le port 14320.
2. Lire `GET /api/starter/connections` : uniquement des métadonnées, jamais les clés. Ne pas redemander une clé déjà configurée sans raison.
3. Chercher les variables et connexions autorisées du projet courant. Ne pas scanner les autres projets ni réutiliser les comptes du développeur de ce starter. Traiter les secrets en mémoire ; ne pas les afficher, mettre dans la ligne de commande, le contexte agent, un commit ou une capture. Si absent : expliquer une seule action utilisateur et utiliser le champ masqué de Setup.
4. Enregistrer avec le corps JSON `{service, token}` via `POST /api/starter/connections` sur l’origine locale. Services : `meta`, `slack`, `elevenlabs`, `openrouter`. Pour Meta, `version` est une version Graph API validée pour l’application utilisée. Pour OpenRouter, `model` est l’identifiant choisi par l’utilisateur.
5. Tester en lecture : `{action:"test",service}`. Succès = identité/clé acceptée, pas intégration métier complète. En cas d’échec, contrôler expiration, espace/compte et permissions ; ne pas répéter aveuglément.
6. Résumer les statuts et la prochaine action dans `.leadfactory/NEXT.md`, sans secret. Les services facultatifs ne bloquent pas les fonctions locales.

## IA personnelle

Le CLI transmet la mission à l’agent personnel connecté. Pour les rôles exécutés depuis les écrans de l’application : `{action:"ai",provider:"codex"|"claude"|"openrouter",model:"",automation:false}`. Le CLI personnel doit être installé et authentifié sur la machine ; OpenRouter requiert un token et un identifiant de modèle. Garder l’automatisation facultative. Ne pas remplacer les réglages de permissions ou de modèle du CLI de l’utilisateur.

## Meta

Le token doit appartenir au portefeuille et au compte visés. Le test du starter appelle l’identité du compte. Vérifier ensuite, en lecture avec les outils disponibles et autorisés, les actifs et permissions réellement nécessaires à la mission. Le partage d’actifs et le token d’API sont deux étapes distinctes ; ne pas annoncer que des campagnes ou leads sont synchronisés sur la seule base de ce test. Consulter le guide Meta du panneau et la documentation actuelle du service pour les permissions applicables.

## Slack externe

Le token appartient à l’espace où le bot est installé. Le test du starter est [`auth.test`](https://docs.slack.dev/reference/methods/auth.test/) : il vérifie l’authentification. Un canal avec un client nécessite aussi le bon canal partagé, une invitation/approbation si nécessaire, et l’accès du bot. Vérifier ces éléments via les outils autorisés ; n’inviter ni ne contacter un tiers sans autorisation. Un connecteur Slack de l’agent peut être utilisé sans que son token soit récupérable pour l’application.

Sources consultées le 15 octobre 2026 : [Slack Connect](https://docs.slack.dev/apis/slack-connect/), [guide Slack des organisations externes](https://slack.com/help/articles/115004151203-Slack-Connect-guide--Work-with-external-organizations). Ne pas déclarer une compatibilité Slack Connect complète sans tester le parcours réel.

## Contrat de confidentialité

Le serveur stocke les clés dans `full-app/.local-data/integrations.json`, permissions 0600, dossier exclu de Git. Ne pas écrire ce fichier directement pendant que l’application tourne : utiliser l’API. Les exports de données de l’agence excluent les connexions. Aucun secret dans les captures des SOP, les prompts copiés ou les rapports.
