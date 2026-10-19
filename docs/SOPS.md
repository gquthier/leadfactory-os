# Bibliothèque SOP dans Ressources

La page `/admin/resources` combine les ressources attribuées par l’équipe et une bibliothèque de tutoriels vidéo. Les catégories distinguent le logiciel et les procédures sans marque d’agence à transmettre aux clients. Chaque paquet local dispose d’une fiche, d’une piste de sous-titres et de chapitres ; le MP4 reste téléchargeable.

## Lecture YouTube et partage

Le lecteur accepte aussi les vidéos hébergées sur YouTube : lecture intégrée, **Copier le lien**, **Ouvrir sur YouTube**, et **Lire le MP4 local** lorsque les médias ont été téléchargés. Le lien copié est une adresse YouTube partageable ; aucune adresse `localhost` n’est proposée aux clients. Les vidéos YouTube apparaissent même sans les MP4 locaux. Les ressources personnelles conservent leur éditeur et leur duplication.

Le catalogue versionné `full-app/resources/sops-youtube.json` associe chaque SOP à son identifiant YouTube réel. Format : `{"version":1,"items":[{"id":"01","title":"Partager un accès Meta","audience":"client","durationSeconds":306,"youtubeVideoId":"IDENTIFIANT_REEL"}]}`. Remplacer la valeur illustrative par les 11 caractères de l’identifiant publié ; les URL complètes et les identifiants malformés sont refusés. Un même `id` fusionne la vidéo hébergée avec les téléchargements locaux, sans doublon. Le catalogue n’accepte aucune URL d’iframe arbitraire.

**État du 17 octobre 2026 :** intégration préparée ; catalogue YouTube vide tant que la publication sur la chaîne White Label n’est pas vérifiée. Aucune vidéo n’est présentée comme publiée sur YouTube. Les 15 vidéos restent distribuées par GitHub et lisibles après téléchargement.

Pour publier : utiliser le compte de la chaîne White Label, téléverser chaque MP4 avec titre français, description et chapitres réels, sous-titres français, autoriser l’intégration, choisir une visibilité publique ou non répertoriée et vérifier la lecture sans connexion. Inscrire ensuite les identifiants vérifiés dans le catalogue et livrer une nouvelle version de l’app. Une vidéo privée n’est pas un lien de partage utilisable par tous les clients. Les chapitres commencent à `00:00`, avec au moins trois entrées espacées de dix secondes minimum.

Références : [visibilité YouTube](https://support.google.com/youtube/answer/157177?hl=fr), [chapitres](https://support.google.com/youtube/answer/9884579?hl=fr), [lecteur intégré](https://developers.google.com/youtube/player_parameters).

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
