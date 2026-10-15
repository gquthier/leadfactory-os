# API locales pour les agents

Ces contrats concernent l'application complète en mode local, pas le cockpit racine. Source : `full-app/src/lib/starter-local-api.ts`, `starter-local-client.ts` et `starter-local-store.ts`. Le serveur doit rester démarré via `node bin/leadfactory.mjs start --no-open`.

Utiliser l'URL de la session. Les exemples utilisent `http://127.0.0.1:14320`. Envoyer `Content-Type: application/json` pour les écritures. Le middleware accepte uniquement un hôte local ; une origine étrangère est refusée. Une réponse HTTP 501 signifie que l'action est déconnectée et **n'a pas été exécutée**.

## Opérations supportées

| But | Méthode et route | Corps ou résultat |
| --- | --- | --- |
| Identifier l'instance | `GET /api/starter/health` | `app`, `mode`, empreinte `workspaceId` ; aucun chemin privé |
| Lire les clients | `POST /api/starter/local-query` | Table `profiles`, filtre `role = client` |
| Créer une fiche client | `POST /api/admin/create-client` | `full_name`, `company`, `email`, `phone` facultatif ; retourne `client_id` |
| Modifier une fiche | `PATCH /api/admin/update-client` | `client_id` puis champs autorisés dans le handler |
| Créer une tâche | `POST /api/admin/tasks` | `client_id`, `title`, `description` |
| Lire les tâches | `GET /api/admin/tasks?client_id=ID` | `tasks` |
| Lire les livrables | `GET /api/admin/ai-deliverables?client_id=ID` | Métadonnées `deliverables` |
| Télécharger le texte d'un livrable | `GET /api/admin/ai-deliverables/download?id=ID` | Texte réellement enregistré |
| Enregistrer un livrable texte | `POST /api/starter/local-query` | `insert` dans `ai_deliverables` avec le `client_id` confirmé |
| Lire/écrire une proposition | `GET` / `PATCH /api/admin/campaign-proposal` | GET `?campaign_id=ID` ; PATCH `campaign_id`, `proposal_markdown` |
| Sauvegarder le métier | `GET /api/starter/export` | Archive JSON téléchargeable ; connexions secrètes exclues |
| Restaurer dans une installation vide | `POST /api/starter/import` | Archive complète validée ; une cible non vide est refusée |
| Voir les connexions configurées | `GET /api/starter/connections` | États sans tokens ; configuré n'implique pas testé |

Créer un client ne crée pas de compte distant ni d'email d'invitation. La soumission du formulaire complet `/api/onboarding/submit` est un autre parcours : elle crée client **et** campagne. Ne pas l'appeler après une création de fiche pour le même client sans examiner le comportement, sous peine de doublon. Les champs de ce questionnaire sont dans `full-app/src/types/onboarding.ts` et ses pages.

## Requête locale et exemple de lecture

Le format est `{table, operations}` ; chaque opération est `[nom, [arguments]]`. Les filtres courants sont `eq`, `in`, `order`, `limit`. Les mutations sont `insert`, `update`, `upsert`, `delete` ; une seule par requête. `update` et `delete` exigent des filtres explicites. L'administrateur local est protégé. Les champs contenant des secrets sont refusés.

```js
const base = 'http://127.0.0.1:14320'; // adapter au port annoncé
async function api(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {'Content-Type': 'application/json'},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(JSON.stringify(result.error || result));
  return result;
}
const clients = await api('/api/starter/local-query', 'POST', {
  table: 'profiles',
  operations: [['select', ['id,company,full_name']], ['eq', ['role', 'client']]],
});
console.log(clients.data);
```

Choisir le bon `client_id` dans cette réponse. Si la fiche n'existe pas et que sa création fait partie de la mission, appeler `/api/admin/create-client`, puis relire la ligne retournée par son identifiant. Ne pas lancer la création à chaque reprise de session.

## Enregistrer et vérifier un livrable

Après avoir confirmé le client et réellement rédigé le texte :

```js
const saved = await api('/api/starter/local-query', 'POST', {
  table: 'ai_deliverables',
  operations: [['insert', [{
    client_id: clientId,
    deliverable_name: 'Brief — version 1',
    category: 'brief',
    file_type: 'md',
    mime_type: 'text/markdown',
    status: 'draft',
    source: 'personal-agent',
    content: writtenBrief,
  }]], ['select', ['id,client_id,deliverable_name,status']]],
});
const id = saved.data[0].id;
const downloaded = await fetch(base + '/api/admin/ai-deliverables/download?id=' + encodeURIComponent(id));
if (!downloaded.ok || await downloaded.text() !== writtenBrief) throw new Error('Livrable non vérifié');
```

Ces variables sont les valeurs réelles de la mission, pas des identifiants à copier littéralement. Pour actualiser un livrable existant, conserver son identifiant et utiliser `update` avec `eq('id', id)` et `eq('client_id', clientId)`. Consigner l'identifiant et la vérification dans le dossier du client et `NEXT.md`.

Les routes d'agents internes (`/api/starter/agents`) peuvent déclencher des rédactions facturées par le compte configuré. Elles ne sont pas nécessaires pour qu'un assistant CLI travaille via les API locales. Ne pas confondre la préparation d'un livrable avec une campagne publiée ou un message envoyé.

## CRM local et aperçu client

Sélectionner le client avec `POST /api/admin/preview-client` et `{client_id}`, puis conserver le cookie HTTP renvoyé (`lf_preview_client_id`) pour les appels suivants. Le navigateur le fait en cliquant sur **Vue client**. Sans aperçu valide, les routes ci-dessous renvoient 403. Les identifiants d'un autre client sont refusés ; `client_id` fourni dans le corps ne change pas le périmètre de l'aperçu.

| But | Méthode et route | Corps ou résultat |
| --- | --- | --- |
| Lire le pipeline | `GET /api/client/pipeline-stages` | `stages` ; initialise les sept étapes par défaut une seule fois |
| Configurer le pipeline | `POST /api/client/pipeline-stages`, `PATCH` / `DELETE /api/client/pipeline-stages/ID` | `name`, `color`, `display_order`, `is_won`, `is_lost` ; une étape contenant des leads ne peut pas être supprimée |
| Lire les leads | `GET /api/client/leads` | `leads`, `total` ; paramètres `status`, `offset`, `limit` (maximum 1 000) |
| Ajouter un lead | `POST /api/client/leads` | `full_name` obligatoire ; email, téléphone, campagne, étape, source et notes facultatifs ; retourne `lead` et un éventuel `warning` de doublon |
| Lire / modifier un lead | `GET` / `PATCH /api/client/leads/ID` | Coordonnées, `status`, `quality_score` (0–5), `next_follow_up`, `notes`, étape et montants ; seul le client sélectionné est accessible |
| Consigner une activité | `GET` / `POST /api/client/leads/ID/activities` | POST : `activity_type`, `title`, `description` facultative ; journalisation locale uniquement |
| Supprimer un lead | `DELETE /api/client/leads/ID` | Supprime aussi ses activités ; réserver aux missions qui autorisent cette suppression |
| Préférences de notification | `GET` / `PATCH /api/client/preferences/notifications` | Préférences mémorisées localement ; aucun email envoyé |

Relire le lead et ses activités après modification pour vérifier la persistance. Ajouter une activité « appel », « email » ou « SMS » consigne une action déclarée : cela n'appelle personne et n'envoie rien. L'import CSV et les intégrations distantes restent déconnectés (501). Le bouton d'export CSV du CRM télécharge les données affichées dans le navigateur.

Ce périmètre empêche les mélanges accidentels entre clients dans le CRM local. Le cookie d'aperçu n'est pas une authentification de production : l'opérateur local conserve l'accès administrateur, notamment via `local-query`. Ne pas exposer ce mode directement sur Internet.
