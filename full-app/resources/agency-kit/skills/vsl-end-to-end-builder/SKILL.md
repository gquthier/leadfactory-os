---
name: vsl-end-to-end-builder
description: Conduit un projet de Video Sales Letter de bout en bout — brief, benchmark, stratégie validée, script, plan de production et plan de diffusion — en produisant cinq documents Markdown dans le dossier client, avec un script toujours construit sur le cadre VSL en 5 parties d'Hormozi (intro, ancienne contre nouvelle méthode, FAQ en boucle, petit CTA, salade de preuves). À utiliser pour "faire une VSL de A à Z", "refonte de VSL", "vidéo de vente longue" ; pour un script seul à partir de rapports de recherche existants, préférer vsl-copywriter.
---

# VSL End-to-End Builder

Ce skill produit des **documents** : brief, stratégie, script, plan de production, plan de diffusion. La vidéo elle-même est tournée, montée ou générée par l'utilisateur avec ses propres outils. Ne jamais présenter le script ou le plan de montage comme une vidéo rendue ; si un outil de génération vidéo est configuré et utilisé, indiquer le fichier réellement produit et ce qui reste à faire.

## Cadre obligatoire : VSL en 5 parties

Toute VSL produite par ce skill suit ce cadre, dans cet ordre. Détail, exemples et transcription de la source : [references/cadre-vsl-5-parties.md](references/cadre-vsl-5-parties.md). À lire avant la stratégie.

1. **Intro** : promesse, douleur, preuve (1 à 3), plan, projection.
2. **Ancienne méthode contre nouvelle** (ou eux contre nous, ou problème caché) : le mécanisme unique, nommé.
3. **FAQ 1 à N** : pour chaque objection, ce qu'il pense → pourquoi c'est faux → ce qui est vrai → preuve, en boucle jusqu'à avoir levé toutes les objections. Offre, prix, garantie et urgence sont des réponses de cette FAQ.
4. **Petit CTA** : une seule action facile + une question de personnalisation, qui personnalise la suite et prouve que la personne a regardé.
5. **Salade de preuves** : après le CTA, uniquement des preuves jusqu'à la fin.

Les autres références (Schwartz, Sugarman, Halbert, Brunson…) servent à remplir ces parties, jamais à les remplacer.

## Sorties

```
{CLIENT_DIR}/04-vsl/
├── 00-brief.md
├── 01-strategy.md
├── 02-script.md
├── 03-production.md
└── 04-deployment.md
```

## Étapes

1. **Brief** (`00-brief.md`). Demander ce qui manque, en une seule salve : offre (produit, prix, modèle, garanties) ; ICP (persona, douleur n°1, désir n°1, stade de conscience, sophistication) ; objectif (CTA : appel / opt-in / achat, KPI cible, durée cible, plateforme) ; assets (témoignages, preuves chiffrées et leurs sources, footage existant, charte) ; contraintes (mentions légales, claims interdits, deadline). Si `{CLIENT_DIR}/01-deep-search/` existe, s'en servir.
2. **Benchmark** : 2 à 3 VSL de référence sur le même marché (fournies par l'utilisateur ou trouvées avec l'outil de recherche disponible) ; extraire hook, big idea, mécanisme, structure, durée ; identifier ce qui n'a pas encore été dit.
3. **Stratégie** (`01-strategy.md`) : big idea, promesse (résultat + délai + sans), mécanisme nommé et sa raison logique, angle (contrarien, nouveau, personnel, données, autorité), plan du cadre en 5 parties : les 5 P de l'intro, l'angle de la partie 2 (ancienne contre nouvelle méthode, eux contre nous ou problème caché), la liste ordonnée des questions de FAQ avec la preuve prévue pour chacune, la question de personnalisation du CTA, l'inventaire des preuves de la salade finale. **Faire valider avant d'écrire le script.**
4. **Architecture en 5 parties** (≈ 10 à 15 % · 15 à 20 % · 40 à 50 % · 5 % · 15 à 25 % de la durée) : intro (hook sous 10 s, promesse, douleur, 1 à 3 preuves, plan, projection) · ancienne méthode contre nouvelle (problème, coût de l'inaction, fausses solutions sans attaquer, mécanisme nommé) · FAQ en boucles de 4 temps (offre et stack de valeur, prix ancré, renversement du risque, urgence légitime y sont des réponses) · petit CTA unique avec question de personnalisation · salade de preuves jusqu'à la fin.
5. **Script** (`02-script.md`) : les 5 parties titrées dans l'ordre, chaque question de FAQ en sous-titre ; dans chaque partie, `[TIMESTAMP] [VISUEL / B-ROLL] — voix off`. Phrases courtes, ton parlé, une idée par phrase, transitions verbales fortes, CTA unique rappelé en une phrase à la toute fin. Durée ≈ 150 mots par minute. Hook sous 10 secondes, pas de jargon avant les preuves, stack de 3 à 7 éléments avec ancrage explicite, un seul CTA.
6. **Revue** : auto-audit du cadre (5 parties dans l'ordre, intro complète, mécanisme nommé, chaque objection en 4 temps avec preuve, petit CTA avec question de personnalisation, uniquement des preuves après le CTA) ; le hook fonctionne sans le son ; compréhensible à la première écoute ; chaque minute apporte une info ou une émotion ; mécanisme nommé ; toutes les objections traitées ; CTA sans ambiguïté ; durée dans ±15 % de la cible ; aucune preuve inventée.
7. **Production** (`03-production.md`) : plans et b-roll par segment, notes de ton et rythme, éléments graphiques (lower thirds, chiffres, logos), musique, montage des preuves de la salade finale (CTA affiché à l'écran pendant ce temps), plan de tournage ou, si génération IA prévue, liste des prompts et des outils choisis par l'utilisateur.
8. **Diffusion** (`04-deployment.md`) : page hôte (titre, sous-titre, CTA, champ du formulaire qui pose la question de personnalisation du CTA), tracking (pixel, UTM, événements), distribution (ads, organique, email, retargeting), tests prévus (hooks, miniatures, durées).

## Références

Cadre VSL en 5 parties d'Hormozi (ossature obligatoire). Pour remplir les parties : Schwartz (conscience), Sugarman (chaque phrase fait lire la suivante), Halbert (voix du client), Belcher/Brunson (hook → histoire → offre), Hormozi (stack, garantie, rareté). Une seule promesse principale par VSL.
