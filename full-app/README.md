# LeadFactory — application locale de LeadFactory OS

Cette application reprend le logiciel interne **`gquthier/leadfactory-app`**, révision **`e909784b7a28982825b3a1b4d7ee0ff8b27e9bf1`** : dashboard, recrutement et gestion de l’équipe, clients, onboarding, campagnes, CRM, résultats, finances, ressources, formations et outils créatifs. La copie a été préparée pour fonctionner localement sans les données ni les connexions de l’agence d’origine. Version publique : **15 octobre 2026**.

Stack : **Next.js 15.5.28**, React et TypeScript, Node.js **22.12+**. Le dossier est autonome : les agents et skills sont dans `resources/agency-kit/`, les adaptateurs dans `runtime/`.

Voir également la [revue de confidentialité et des accès clients](CONFIDENTIALITY.md), qui précise les corrections et les limites de la première vérification.

## Démarrer

Depuis la racine du pack :

```sh
npm run factory
```

Ouvrir **http://127.0.0.1:14320/admin/dashboard**. Aucun fichier `.env` ni compte fournisseur n’est nécessaire pour découvrir les écrans. Le [Start Here complet](docs/START-HERE.md) explique chaque connexion.

La base locale JSON démarre vide, hormis un **administrateur fictif** qui permet de parcourir le logiciel. Elle est conservée dans `.local-data/db.json`, exclu de Git. Créer ses propres fiches de démonstration ; aucune fiche client, liste de prospects, formation privée, campagne historique ou preuve de résultats n’est préchargée. Les vues client sont des aperçus locaux, pas des sessions de clients authentifiés.

## Agents et connexions

Dans **Start Here → IA personnelle**, choisir **Codex CLI**, **Claude Code CLI** ou OpenRouter. Pour un CLI déjà connecté sur cette machine, aucune clé API à saisir : cliquer **Vérifier et connecter mon IA**. L’adaptateur embarqué est directement appelé par ce logiciel. Le fournisseur traite les textes ; exécution locale ne signifie pas IA hors ligne.

Dans **Agents**, recruter les rôles, choisir le client, ajouter les sources autorisées et lancer une mission de rédaction. Les huit templates de rôles sont inclus. L’option explicite d’automatisation du Start Here déclenche après un onboarding terminé **Onboarding → Creative Strategist → Media Buyer → Communication client**, quatre exécutions maximum. La proposition est enregistrée pour relecture ; elle n’envoie aucun message et ne lance aucune campagne. L’ordinateur et le serveur doivent rester ouverts.

Les tokens personnels Slack, Meta, ElevenLabs et OpenRouter se saisissent dans **Mes connexions personnelles**. Ils sont conservés côté serveur dans `.local-data/integrations.json`, avec permissions **0600**, jamais renvoyés dans les réponses de lecture du cockpit et exclus de Git. Ils ne sont pas chiffrés au repos : la protection du compte système et du disque reste nécessaire. **Tester l’accès en lecture** vérifie uniquement l’identité ou l’accès au compte : aucun message Slack, aucune campagne Meta ni génération vocale. Une réussite ne prouve pas les permissions métier.

## SQL fourni, sans connexion

Le [schéma SQL](database/schema.sql) contient **50 tables**, sans données métier, compte ni secret. Il peut aussi être téléchargé dans l’interface via **`/api/starter/schema`**. Aucune base existante n’est consultée ou connectée. L’importation reste manuelle, dans un **projet Supabase personnel vide**, selon le [guide base de données](database/README.md).

Le mode distant est distinct. Il nécessite ensemble `LEADFACTORY_DATA_MODE=supabase`, `LEADFACTORY_CONNECT_DATABASE=1`, `NEXT_PUBLIC_LEADFACTORY_DATA_MODE=supabase` et les clés de son propre projet. Les anciennes API externes demandent aussi `LEADFACTORY_ENABLE_EXTERNAL=1`. Le fichier [env.example](env.example) laisse tous les secrets vides et les modes locaux par défaut. Le moteur d’agents et ses connexions Start Here restent locaux ; ils ne sont pas synchronisés automatiquement vers le schéma distant.

## Périmètre réel

Ce mode est un **atelier administratif local**, lié à l’interface loopback `127.0.0.1:14320`, avec identité locale fictive. **Ne pas le publier derrière un tunnel ou un proxy public.** Son mode local n’est pas une authentification de production.

Le code des anciens adaptateurs est fourni pour configuration et recette ultérieures ; leur présence ne prouve pas qu’ils sont prêts avec un compte tiers. Le SQL applique des accès RLS plus stricts que l’historique : certaines anciennes requêtes, notamment les sélections larges de profils, nécessitent une adaptation. Le mode Supabase et le déploiement public ne sont **pas certifiés pour la production** ; recetter Auth, droits serveur, RLS, Storage et séparation client sur sa propre installation avant tout usage réel.

Aucune connexion, synchronisation, campagne, publication, email, cron ou agent permanent n’est activé par l’installation. Les vérifications de compte et les missions IA demandent une action ou une option explicite de l’utilisateur.

## Vérifier le code

```sh
npm run typecheck
npm test
npm run build
npm run test:http
npm audit --omit=dev
```

Ces commandes ne certifient pas les connexions fournisseur. Les tests et leurs limites se lisent avec le compte rendu de livraison. Pour les droits sur cette copie et les dépendances, voir [NOTICE.md](NOTICE.md) : le code original publié de cette adaptation est sous MIT ; les licences des dépendances sont conservées.

## Sauvegarder et restaurer

Dans **Start Here → Sauvegarde des données de l’agence**, télécharger le JSON. Il contient les 38 tables locales de clients, campagnes, briefs, tâches, ressources, livrables et autres données administratives. Les connexions et tokens (`integrations.json`) ainsi que les recrutements, sources et historiques des agents (`agents.json`) ne sont pas inclus. Les contenus saisis par l’utilisateur peuvent être confidentiels : conserver le fichier en privé.

Sur une installation vide, choisir ce fichier, cocher la confirmation puis **Restaurer mes données**. Les identifiants et liens entre données sont conservés. Le serveur refuse un fichier mal formé, contenant des champs de connexion, trop volumineux ou susceptible de contourner l’éditeur de ressources. Il refuse aussi de remplacer une installation qui contient déjà des données. Aucune connexion ni mission IA n’est réactivée.

Pour archiver également l’historique des agents et les connexions sur la même machine, arrêter le serveur puis sauvegarder le dossier `.local-data/` dans son ensemble, dans un emplacement privé protégé. Cette copie contient alors les tokens en clair : elle n’est pas un export à partager. La restauration de ce dossier complet n’est pas assurée par le bouton d’import des données d’agence.
