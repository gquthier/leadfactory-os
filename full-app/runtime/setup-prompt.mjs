export const SETUP_TASK = 'Faire le setup de cette installation et connecter les outils utiles.';
const labels = {meta: 'Meta', slack: 'Slack et Slack Connect externe', elevenlabs: 'ElevenLabs', openrouter: 'OpenRouter'};

export function setupPrompt(service) {
  if (service !== undefined && !Object.hasOwn(labels, service)) throw new Error('Service inconnu.');
  return `Fais le setup de cette installation LeadFactory, étape par étape.${service ? `\nConnexion ciblée : ${labels[service]}.` : '\nPriorité : Meta et Slack externe ; ElevenLabs et OpenRouter seulement si utiles.'}

1. Lis AGENTS.md, docs/AGENT-SETUP.md et docs/AGENT-START.md. Retrouve le projet, son contexte .leadfactory et l’adresse de l’application de cette session. Vérifie ce qui est déjà connecté avec GET /api/starter/connections.
2. Cherche les accès nécessaires dans l’environnement de CE projet et les connexions de mon agent déjà autorisées. Réutilise seulement les accès appartenant à cette installation et à mes comptes. NE PAS afficher les secrets dans le chat, les logs ou les prompts. Ne copie pas de clés d’un autre projet. Un connecteur de l’agent ne fournit pas forcément un token réutilisable par l’application.
3. Configure les accès trouvés avec POST /api/starter/connections, puis teste-les en lecture. Si un accès manque, donne-moi le lien exact et une seule action à faire à la fois ; je renseigne la clé dans Setup. Vérifie la documentation officielle actuelle si les étapes ou permissions ont changé.
4. Pour Meta, vérifie le portefeuille, le compte publicitaire et les permissions correspondant à la mission. Pour Slack externe, distingue le token de mon espace Slack de l’accès au canal partagé Slack Connect ; vérifie l’installation du bot, le canal et les permissions nécessaires. Un test d’identité réussi ne prouve pas la synchronisation ou l’envoi.
5. Rends un état simple : connecté et testé / clé enregistrée / action utilisateur nécessaire / facultatif. Mets à jour .leadfactory/NEXT.md avec les preuves et la prochaine action, sans aucun secret. Réalise les actions locales déjà autorisées ; respecte le périmètre existant pour les invitations, messages, publications et dépenses. Ne déclare une intégration opérationnelle qu’après vérification de son usage réel.

Commence maintenant par l’état des connexions et avance jusqu’à la prochaine action qui nécessite réellement mon intervention.`;
}
