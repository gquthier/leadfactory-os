---
name: vsl-copywriter
description: Écrit le script d'une Video Sales Letter (VSL) et son document de stratégie à partir des rapports de recherche d'un client (conscience du marché, concurrents, psychographie) et de son offre, toujours sur le cadre VSL en 5 parties d'Hormozi (intro promesse-douleur-preuve-plan-projection, ancienne contre nouvelle méthode, FAQ en boucle de 4 temps, petit CTA, salade de preuves), en mode coach/DTC 8 à 12 min ou B2B 3 à 5 min. À utiliser pour "script VSL", "écris la VSL", "vidéo de vente" ; pas pour des pubs courtes (meta-ads-copywriter) ni pour la production vidéo elle-même.
---

# VSL Copywriter

Livrable : un **script** (texte de voix off, texte à l'écran, indications) et une **stratégie**. Aucune vidéo n'est produite ici ; le rendu est une étape séparée réalisée par l'utilisateur ou un outil qu'il a configuré.

## Cadre obligatoire : VSL en 5 parties

Chaque VSL suit ce cadre, dans cet ordre, quel que soit le mode. Détail, exemples et transcription de la source : [references/cadre-vsl-5-parties.md](references/cadre-vsl-5-parties.md). À lire avant d'écrire.

1. **Intro** : promesse, douleur, preuve (1 à 3), plan, projection.
2. **Ancienne méthode contre nouvelle** (ou eux contre nous, ou problème caché) : le mécanisme unique, nommé.
3. **FAQ 1 à N** : pour chaque objection, ce qu'il pense → pourquoi c'est faux → ce qui est vrai → preuve. On boucle jusqu'à avoir levé toutes les objections. L'offre, le prix et la garantie sont des réponses de cette FAQ.
4. **Petit CTA** : une seule action facile + une question de personnalisation (« Quelle est la surface de ta cuisine ? »), qui personnalise la suite et prouve que la personne a regardé.
5. **Salade de preuves** : après le CTA, uniquement des preuves jusqu'à la fin.

Les autres frameworks servent à remplir ces parties, jamais à les remplacer. Le mode ne change que la durée, le ton et le format.

**Règles non négociables**

- Aucune autre section que ces 5 parties. Jamais de section « Offre », « Prix », « Garantie », « Bénéfices » ou « Urgence » à part : ce sont des **questions de la FAQ** (« Qu'est-ce que j'obtiens exactement ? », « Combien ça coûte ? », « Et si ça ne marche pas pour moi ? »).
- FAQ : au moins **3 questions en B2B, 6 en VSL longue**. Chaque question écrit ses **4 temps, dans l'ordre** : ce qu'il pense, pourquoi c'est faux, ce qui est vrai, preuve (ou `[PREUVE À FOURNIR : …]`).
- Le CTA pose **toujours une question de personnalisation** à laquelle la personne répond en passant à l'action (« Réservez votre appel et indiquez combien de projets vous signez par mois »). Un CTA sans cette question est à réécrire.
- Après le CTA : **uniquement des preuves**, aucun nouvel argument.

**Squelette à reproduire** (titres adaptés au format du mode) :

```
1. Intro — promesse · douleur · preuve(s) · plan · projection
2. Ancienne méthode contre nouvelle — ce que fait le marché, pourquoi ça plafonne → nom du mécanisme
3. FAQ
   Q1 « … ? »  — ce qu'il pense / pourquoi c'est faux / ce qui est vrai / preuve
   Q2 « Qu'est-ce que j'obtiens exactement ? »  — offre et stack, 4 temps
   Q3 « Combien ça coûte ? »  — prix ancré, 4 temps
   Q4 « Et si ça ne marche pas pour moi ? »  — garantie, 4 temps
   … jusqu'à ce que toutes les objections soient levées
4. CTA — action unique + question de personnalisation
5. Preuves — uniquement des preuves jusqu'à la fin
```

## Entrées

- `{CLIENT_DIR}/01-deep-search/` : `01-market-awareness.md`, `02-competitor-research.md`, `03-psychographic.md`. Manquants → proposer de lancer `deep-search`, ou continuer sur les seules informations fournies en marquant les hypothèses.
- `{CLIENT_DIR}/02b-offre/offre-reconstruite.md` ou `00-onboarding/onboarding-form.md` : offre, prix, garantie, mécanisme, preuves, CTA.
- Mode : `coach-dtc` (défaut) ou `b2b-specialist`, choisi d'après la tonalité du brief ou demandé.

## Pipeline

1. **Synthèse avatar et marché** (bloc-notes interne) : ICP en 3 lignes, stade de conscience (1 à 5), sophistication (1 à 5), 5 douleurs verbatim, toutes les croyances et objections verbatim (elles deviennent les questions de la FAQ), dream outcome dans les mots du client, solutions déjà essayées et pourquoi elles ont échoué, ennemi commun, 3 hooks concurrents. Chaque phrase de la VSL doit remonter à l'un de ces éléments.
2. **Stratégie** : big idea (une phrase qui recadre le problème), mécanisme nommé et angle de la partie 2 (ancienne contre nouvelle méthode, eux contre nous ou problème caché), promesse « [résultat] en [délai] sans [douleur], même si [objection] », composition de l'offre (résultat, délai, méthode, 3 à 5 insights, filet de sécurité, élément polarisant, prix et ancrage), liste ordonnée des questions de FAQ, question de personnalisation du CTA, inventaire des preuves disponibles. Angle selon la sophistication : voir [references/frameworks.md](references/frameworks.md).
3. **Script** selon le cadre en 5 parties ; durée et format du mode dans [references/script-structure.md](references/script-structure.md).
4. **Auto-audit** puis sauvegarde.

## Règles d'écriture

- Français oral, deuxième personne (tu par défaut, vous en B2B), phrases courtes, une idée par phrase, une émotion par bloc, paragraphe de 3 phrases max.
- Chaque phrase donne envie d'entendre la suivante.
- Verbatims de la recherche en italique.
- Mécanisme nommé une fois clairement dans la partie 2, puis répété 4 à 6 fois dans la FAQ.
- Un seul CTA (partie 4), avec sa question de personnalisation ; il peut être rappelé en une phrase à la toute fin. Jamais d'alternative.
- Aucune promesse sans preuve. Preuve manquante → placeholder `[PREUVE À FOURNIR : …]`, jamais un chiffre inventé.

## Auto-audit avant sauvegarde

Hook dans les 5 premières secondes · les 5 parties présentes, dans l'ordre, titrées · intro avec promesse, douleur, 1 à 3 preuves, plan et projection · partie 2 qui oppose ancienne et nouvelle méthode et nomme le mécanisme · chaque objection traitée en 4 temps, preuve comprise · toutes les objections de la recherche couvertes, offre, prix et garantie dans la FAQ · un seul petit CTA avec une question de personnalisation · après le CTA, uniquement des preuves · au moins 2 verbatims · ennemi commun nommé · longueur cible respectée (coach 1200 à 1800 mots, B2B 450 à 750) · aucune hyperbole (« incroyable », « révolutionnaire ») sans preuve.

## Sorties

```
{CLIENT_DIR}/04-vsl/
├── strategy.md     avatar, big idea, mécanisme, promesse, offre, angle, plan des 5 parties
└── script-v1.md    script complet en 5 parties + notes de production (ton, rythme, b-roll suggéré, question du CTA à mettre dans le formulaire)
```

Le mode B2B produit uniquement le script (voix off + texte à l'écran, sections en italique), sans stratégie visible : conserver la stratégie dans `strategy.md` quand même, l'utilisateur choisit ce qu'il transmet.

Pour un DOCX ou PDF, convertir avec l'outil disponible sur la machine ; le Markdown reste la source.

## Message de fin

Chemins, mécanisme, big idea, promesse, nombre de questions de FAQ, question de personnalisation du CTA, nombre de mots et durée estimée (≈ 150 mots par minute). Étape suivante : lecture à voix haute, puis production vidéo (voir `vsl-end-to-end-builder` pour le plan de montage).
