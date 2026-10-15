# Contribuer

Ouvrez une issue décrivant le problème, ou une pull request avec une modification ciblée et sa vérification. Le cockpit utilise les modules natifs Node.js et du JavaScript navigateur. Gardez le démarrage simple et les données portables.

Le logiciel original se trouve dans `full-app/` (Next.js, Node 22.12+). Après `npm run app:install`, vérifier une modification avec `npm run app:test`, `npm run app:build`, `npm run app:typecheck`, puis `npm run test:http --prefix full-app`. Les tests HTTP démarrent leurs propres serveurs et bases fictives temporaires ; ils ne doivent jamais réutiliser une base personnelle. Le cockpit léger conserve son contrôle indépendant `npm test`.

Vérifier les dépendances avec `npm audit --prefix full-app` et consulter [les alertes résiduelles](docs/DEPENDENCIES.md). Pour un problème de sécurité, suivre [SECURITY.md](SECURITY.md).

Pour un skill : précisez son déclencheur, les informations nécessaires, la méthode, le livrable observable et les limites des outils. Préservez l'attribution des ressources adaptées. Un résultat commercial d'exemple doit être fictif et étiqueté, ou étayé par une source autorisée.

Pour un connecteur : documentez la configuration utilisateur, les coûts éventuels et les actions réellement effectuées. Une instruction de skill n'accorde pas une nouvelle permission. Ne déclenchez pas de campagnes, d'envois ou de dépenses pendant les tests.

Ne soumettez pas de données clients, identifiants, secrets, exports de production ou médias dont les droits ne permettent pas la redistribution. Les fixtures doivent être synthétiques, avec des domaines d'exemple.
