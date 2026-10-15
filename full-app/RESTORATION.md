> Archive de la préparation du 1er octobre 2026. Pour le statut de la version publique du 15 octobre, lire [la notice](NOTICE.md) et [les vérifications de release](../docs/RELEASE.md). Les résultats ci-dessous concernent uniquement la révision historique décrite.

# Reprise de l'interface — 15 octobre 2026

Demande : reprendre l'UX, l'UI et les menus de `https://app.leadfactory.my/` dans le projet à distribuer.

- Source originale : `gquthier/leadfactory-app`, commit `e909784b7a28982825b3a1b4d7ee0ff8b27e9bf1` ; tête GitHub vérifiée le 15 octobre 2026.
- Copie locale assainie réutilisée : `gquthier/leadfactory-oss`, branche `preview/leadfactory-open-agency-20261002`, commit `924f14fda5c4803ad26a1a1c8ce5a6cb63893f4f`.
- Base de la branche de livraison : `main`, commit `542f4cc17a890c97533f88fc34ccf8a2130a626f`.

La page Dashboard et la configuration de thème sont identiques à la source originale. La feuille de styles conserve les règles originales et sert désormais les deux polices localement. Les adaptations de stockage et d'accès de la copie du 1er octobre sont conservées. La barre latérale conserve l'ordre des 18 menus d'origine ; Start Here et Agents IA sont ajoutés avant eux. Une erreur d'insertion plaçant Team/Finance avant Leads/CRM dans l'ancienne copie a été corrigée.

Pour rendre ce dossier autonome, les huit prompts et 39 méthodes sont placés dans `resources/agency-kit/` et les quatre modules nécessaires à l'IA dans `runtime/`. Les imports et fixtures d'intégration sont adaptés à ces emplacements. Aucun modèle, connexion ou mission IA n'est activé à l'installation.

Deux détails de navigation sont corrigés : le lien Slack factice devient un bouton indisponible « espace non configuré », et « Retour admin » revient à la fiche du client prévisualisé au lieu d'ouvrir celle de l'administrateur.

Les notices historiques `VALIDATION.md`, `CONFIDENTIALITY.md` et `PROVENANCE.json` documentent la préparation du 1er octobre ; elles ne remplacent pas les vérifications du 15 octobre. Les données, bases et fichiers d'environnement de l'agence d'origine n'ont pas été copiés. La notice de licence privée est conservée.

Polices : `google/fonts`, familles `ofl/spacegrotesk` et `ofl/intertight`, téléchargées le 15 octobre 2026 ; fichiers et licences SIL OFL sous `public/fonts/`.
