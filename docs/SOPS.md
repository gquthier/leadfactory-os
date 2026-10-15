# Bibliothèque SOP dans Ressources

La page `/admin/resources` combine les ressources attribuées par l’équipe et une bibliothèque locale de tutoriels vidéo. Les catégories distinguent le logiciel et les procédures sans marque d’agence à transmettre aux clients. Chaque vidéo dispose d’une fiche, d’une piste de sous-titres et de chapitres ; le MP4 reste téléchargeable.

Les ressources personnelles restent éditables, conformément à la demande du 15 octobre : le propriétaire (super administrateur) dispose de **Nouvelle ressource** et **Gérer mes ressources** directement sur cette page. L'éditeur d'origine conserve le titre, le type SOP/ressource, le lien Loom, le document, le texte et l'attribution aux membres. **Vos ressources** affiche aussi ses brouillons et ses contenus non attribués. Les autres membres gardent la lecture des ressources publiées qui leur sont attribuées.

**Dupliquer** ouvre une copie éditable d'une ressource ajoutée par l'agence, avec un nouvel identifiant à l'enregistrement. Elle commence en brouillon, sans attribution héritée ; modifier la copie ne modifie pas l'original. Le même éditeur et la duplication sont disponibles dans Team. La bibliothèque des 15 MP4 fournis reste accessible à côté de ces contenus.

Le lot du 15 octobre 2026 comprend **15 vidéos françaises (47 min 01 s)** : 7 tutoriels logiciel/équipe et 8 procédures clients, dont le partage Meta. Sept modèles de documents clients à copier ou imprimer complètent les vidéos. Les MP4 ont été contrôlés visuellement et techniquement, copiés sur le Bureau et installés dans Ressources sur les copies locales de recette. Les médias sont distribués séparément dans la release GitHub v0.4.0, avec un manifeste SHA-256 versionné.

Les vidéos sont des fichiers de livraison séparés, exclus de Git dans `full-app/public/sops/`. Le champ facultatif `files.model` relie le modèle de document utilisé dans la démonstration, accessible par **Ouvrir le document**. Le catalogue utilise des chemins relatifs, donc il fonctionne quel que soit le port local :

```json
{
  "version": 1,
  "items": [{
    "id": "01",
    "title": "Partager un accès Meta",
    "audience": "client",
    "durationSeconds": 306.33,
    "files": {
      "video": "01-meta/video.mp4",
      "captions": "01-meta/captions.vtt",
      "chapters": "01-meta/chapters.vtt",
      "guide": "01-meta/FICHE.md",
      "poster": "01-meta/apercu.png"
    }
  }]
}
```

Enregistrer ce fichier sous `full-app/public/sops/catalog.json`, avec les médias indiqués. `audience` vaut `client` ou `agency`. Le serveur refuse les chemins externes et n’affiche que les entrées dont les fichiers requis sont présents et non vides. L’API est `GET /api/starter/sops`. Un catalogue absent donne une bibliothèque vide ; les ressources d’équipe restent accessibles. Un catalogue invalide affiche une erreur distincte.

Le CLI installe automatiquement les médias au premier lancement, sauf avec `--no-sops`. La commande `npm run factory -- sops` vérifie les empreintes et reprend les fichiers manquants. Aucun fichier modifié par l’utilisateur n’est écrasé ; déplacer ce fichier si l’on souhaite réinstaller la version distribuée. Un clone Git seul ne contient pas les MP4. L’export métier JSON ne contient pas ces fichiers vidéo : conserver aussi le dossier `public/sops` ou réinstaller le paquet.

Les captures représentent la version locale observée le 15 octobre 2026 ; vérifier les libellés après une évolution du logiciel. Les procédures clients montrent, selon le sujet, une interface réelle ou un modèle de document fourni et explicitement présenté comme tel.

## Nature des démonstrations

Les vidéos 02, 04, 05, 06, 07 et 08 montrent des captures de l’application locale. La vidéo 01 montre Meta. La vidéo 03 est un guide du CLI avec transcriptions illustrées. Les vidéos 09 à 15 montrent des modèles de procédures et documents fournis, pas une capture d’un logiciel tiers. Elles portent le suffixe « modèle de procédure » dans la bibliothèque. Ces modèles ne remplacent pas des tutoriels pas à pas des connexions externes ou des notifications réelles ; ceux-ci restent à réaliser et à vérifier sur le logiciel concerné.
