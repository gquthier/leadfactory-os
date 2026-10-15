# Les huit agents de l’agence

**Templates privés, prêts à configurer.** Aucun agent n’est lancé par ces fichiers. Chaque prompt contient mission, déroulé opérationnel, compétences, outils effectifs, limites, critères de fin et passation.

| Agent | Prompt système | Compétence dominante |
|---|---|---|
| CEO | [Ouvrir](prompts/ceo.system.md) | Priorités, offre, marge/capacité, qualité et orchestration |
| Acquisition client | [Ouvrir](prompts/acquisition.system.md) | Offre inspirée des concepts Hormozi, vente one-to-many, pipeline de l’agence |
| Onboarding | [Ouvrir](prompts/onboarding.system.md) | Engagements, dossier client, inputs et accès |
| Delivery | [Ouvrir](prompts/delivery.system.md) | Production, recette, délais, retours et relation client |
| Media Buyer | [Ouvrir](prompts/media-buyer.system.md) | Setup, tracking, campagne en pause/activation mandatée, optimisation |
| Cold Email | [Ouvrir](prompts/cold-email.system.md) | Recherche, vérification, délivrabilité, séquences, envoi et réponses |
| Créatif stratégiste | [Ouvrir](prompts/creative-strategist.system.md) | Recherche, concepts, statiques, VSL, montage, motion, UGC et tests |
| Communication client | [Ouvrir](prompts/client-communication.system.md) | Propositions viables, messages et retours client |

## Utiliser les fichiers

- Copiez le **contenu complet** du prompt dans le champ d’instructions de l’agent de votre outil, puis fournissez le dossier de travail et les accès adaptés. Aucun format d’import universel de plateforme n’est présumé.
- Installez les skills Agency avec `node scripts/install-skills.mjs --target <dossier>` ; l’option `--only` permet de sélectionner ceux d’un rôle. Les 12 modules du créatif s’installent séparément avec `--pack creative`. La sélection de skills ne crée pas les outils externes.

Premier brief : « Lis le contexte de l’agence et [dossier]. Ton objectif est [résultat], avec [périmètre/outils/budget autorisés]. Livre [artefact] ; considère terminé si [critère vérifiable]. »

## Maintenir sans divergence

Modifier `common.md`, `roles/*.md` et `roster.json`, puis :

```sh
npm run templates:build
npm run agents:check
npm run templates:check
```

Le générateur produit les prompts, leurs copies du vault, les associations de skills et le roster natif ; il refuse les noms/chemins absents. Les prompts ne chargent pas tous les skills à chaque message.

## Handoff et validation


L’acquisition des clients de l’agence reste distincte du delivery de campagnes pour les clients. Aucun résultat financier, envoi, création d’agent ou capacité de connecteur n’est établi par un prompt seul.
