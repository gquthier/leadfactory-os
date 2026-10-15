#!/usr/bin/env node
import {createInterface} from 'node:readline/promises';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs, findProject, cloneProject, loadProfile, saveProfile, contextForAgent,
  doctor, probeVersion, agentCommand, launchAgent, DEFAULT_PORT, RELEASE_REF} from '../lib/factory.mjs';
import {createFactoryApp, openBrowser, prepareApp} from '../lib/factory-runtime.mjs';
import {installSops} from '../lib/factory-sops.mjs';
import {SETUP_TASK} from '../full-app/runtime/setup-prompt.mjs';
import {deploymentCheck, deploymentPrompt} from '../lib/factory-deploy.mjs';

const HELP = `LeadFactory — votre agence, son contexte et votre agent.

  npm run factory                       Onboarding puis menu de la Factory
  node bin/leadfactory.mjs init DOSSIER  Télécharger une nouvelle installation
  npm run factory -- start              Ouvrir l'application locale
  npm run factory -- agent              Lancer votre assistant avec le contexte
  npm run factory -- context --json     Carte du projet pour un agent
  npm run factory -- doctor --json      Vérifier l'installation sans appel IA
  npm run factory -- onboard            Présenter ou modifier votre agence
  npm run factory -- guide              Comprendre le parcours
  npm run factory -- install            Réinstaller les dépendances verrouillées
  npm run factory -- sops               Installer / vérifier la bibliothèque vidéo
  npm run factory -- deploy             Préparer le partage avec votre agent
  npm run factory -- deploy --check --json  Détecter les outils et configurations

Options :
  --project CHEMIN     Choisir l'installation
  --provider codex|claude|manual
  --role ROLE          Rôle du roster (ceo par défaut)
  --task TEXTE         Mission à confier à l'agent
  --port PORT          Port local, 14320 par défaut
  --profile FICHIER    Profil JSON pour un onboarding sans questions
  --print             Préparer le lancement d'agent sans l'exécuter
  --json              Sortie structurée (context, doctor, onboard, agent --print)
  --no-open           Ne pas ouvrir le navigateur
  --no-app            Agent sans démarrer l'application
  --ref REVISION       Révision à télécharger avec init (version publiée par défaut)
  --no-onboard        Télécharger uniquement avec init
  --no-sops           Différer le téléchargement des vidéos (environ 1,1 Go)
  --target railway|supabase|podman  Destination du parcours de partage
  --check             Diagnostic de partage uniquement, sans agent ni déploiement
  --verify            Tester en lecture les sessions globales et le moteur Podman

Le serveur reste ouvert pendant la session. Quitter la Factory arrête seulement
le serveur qu'elle a démarré. Les données et la mémoire restent dans le projet.
`;

const GUIDE = `Votre parcours dans la Factory

1. Présentez l'agence : offre, cible et objectif. Ce brief reste dans le projet.
2. Choisissez votre assistant personnel. Il reçoit le brief et la carte des méthodes.
3. L'agent fait le setup : il trouve les accès autorisés et vous guide pour les clés manquantes.
4. L'agent complète le brief, prépare la campagne et enregistre les livrables.
5. Consultez le résultat dans la Factory, puis confiez la prochaine mission.

Le dossier .leadfactory contient le contexte de l'agence, les décisions et
la prochaine action. L'agent charge seulement les méthodes utiles à sa mission.
Les données des écrans sont dans full-app/.local-data ; le cockpit léger de
la racine utilise un autre dossier. Aucune copie de vos identifiants IA.

Guide utilisateur : docs/FACTORY.md
Point d'entrée de votre agent : docs/AGENT-START.md
API locales et exemples : docs/AGENT-API.md
`;

const sections = [
  ['Démarrer et connecter mes outils', '/admin/start-here'], ['Vue de mon agence', '/admin/dashboard'],
  ['Clients et briefs', '/admin/clients'], ['Campagnes', '/admin/campaigns'],
  ['Leads et CRM', '/admin/crm'], ['Résultats', '/admin/results'], ['Agents et équipe', '/admin/agents'],
  ['Ressources et SOP', '/admin/resources'], ['Finances', '/admin/finances'],
];
const missions = [
  ['Faire le setup et connecter mes outils', 'ceo', SETUP_TASK],
  ['Préparer mon offre et ma prospection', 'acquisition', 'Préparer mon offre et un plan de prospection sourcé en brouillon.'],
  ['Onboarder un client', 'onboarding', 'Identifier le client concerné, reprendre son dossier, compléter les informations manquantes et préparer son brief.'],
  ['Préparer une campagne', 'media-buyer', 'Reprendre le client et son brief validé, puis préparer une campagne en brouillon avec budget et sources.'],
  ['Créer un livrable créatif', 'creative-strategist', 'Reprendre le brief du client concerné et produire le livrable créatif demandé avec ses preuves.'],
  ['Faire le point sur les livraisons', 'delivery', 'Vérifier les livraisons du client concerné, les résultats disponibles et la prochaine action.'],
  ['Reprendre la dernière mission', 'ceo', 'Reprendre .leadfactory/NEXT.md, constater ce qui est déjà fait puis réaliser la prochaine action autorisée.'],
];

let input, app, agentActive = false;
const interrupted = new AbortController();
function releaseInput() {const previous = input; input = null; previous?.close();}
function onSignal() {
  if (agentActive) return; // The foreground agent handles its own Ctrl-C.
  interrupted.abort(); releaseInput();
  void app?.stop();
}
function onTerminate() {agentActive = false; onSignal();}
process.on('SIGINT', onSignal);
process.on('SIGTERM', onTerminate);

function terminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Ce menu nécessite un terminal. Pour un agent : onboard --profile FICHIER, context --json ou doctor --json.');
  if (!input) {
    const current = createInterface({input: process.stdin, output: process.stdout});
    input = current;
    current.once('close', () => {if (input === current) onSignal();});
  }
  return input;
}
async function ask(label, fallback = '') {
  const answer = await terminal().question(`${label}${fallback ? ` [${fallback}]` : ''} : `, {signal: interrupted.signal});
  return answer.trim() || fallback;
}
async function choose(title, options, defaultIndex = 0) {
  console.log(`\n${title}`);
  options.forEach((option, index) => console.log(`  ${index + 1}. ${option}`));
  for (;;) {
    const answer = Number(await ask('Votre choix', String(defaultIndex + 1)));
    if (Number.isInteger(answer) && answer >= 1 && answer <= options.length) return answer - 1;
    console.log('Choisissez un numéro de la liste.');
  }
}

async function onboard(root, args) {
  if (args.profile) {
    const profile = await saveProfile(root, JSON.parse(await readFile(resolve(args.profile), 'utf8')));
    console.log(args.json ? JSON.stringify(profile, null, 2) : 'Contexte enregistré. Lancez npm run factory pour ouvrir votre agence.');
    return profile;
  }
  terminal();
  const previous = await loadProfile(root);
  console.log('\nLEADFACTORY — Faisons connaissance\nVotre agent s’appuiera sur ce brief pour vous aider à démarrer.');
  let agency = await ask('Nom de votre agence', previous?.agency);
  while (!agency) agency = await ask('Nom de votre agence (requis)');
  const offer = await ask('Votre offre', previous?.offer || 'À définir avec mon agent');
  const audience = await ask('Votre client idéal', previous?.audience || 'À définir avec mon agent');
  const objective = await ask('Votre premier objectif', previous?.objective || 'Préparer mon offre et mon premier dossier client');
  const codex = probeVersion('codex'), claude = probeVersion('claude');
  const providers = ['codex', 'claude', 'manual'];
  const defaultProvider = previous?.provider || (codex ? 'codex' : claude ? 'claude' : 'manual');
  const selected = args.provider || providers[await choose('Votre assistant personnel', [
    `Codex ${codex ? '— installé' : '— à installer'}`, `Claude Code ${claude ? '— installé' : '— à installer'}`, 'Un autre assistant — recevoir le contexte',
  ], providers.indexOf(defaultProvider))];
  const profile = await saveProfile(root, {agency, offer, audience, objective, provider: selected,
    language: previous?.language || 'fr', port: args.port ?? previous?.port ?? DEFAULT_PORT});
  console.log('\nVotre contexte est prêt. Il sera retrouvé à chaque nouvelle mission.');
  return profile;
}

async function ensureApp(root, args, path = '/admin/start-here') {
  if (!args['no-sops']) await installSops(root,{signal:interrupted.signal});
  const profile = await loadProfile(root);
  const port = args.port ?? profile?.port ?? DEFAULT_PORT;
  if (app && app.url !== `http://127.0.0.1:${port}`) {await app.stop(); app = null;}
  app ??= createFactoryApp(root, {port,signal:interrupted.signal});
  let started;
  try {started = await app.start();}
  catch (error) {app = null; throw error;}
  const {url} = started;
  console.log(`\nFactory ouverte : ${url}${path}`);
  if (!args['no-open'] && !openBrowser(url + path)) console.log('Ouvrez cette adresse dans votre navigateur.');
  return url;
}

async function runAgent(root, args) {
  const context = await contextForAgent(root, args);
  const provider = args.provider ?? context.profile?.provider ?? 'codex';
  if (args.print || provider === 'manual') {
    if (provider === 'manual' && !args.print && !args['no-app']) await ensureApp(root, args);
    console.log(args.json ? JSON.stringify({provider, ...context}, null, 2) : `\nContexte à transmettre à votre assistant :\n\n${context.prompt}`);
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Le lancement interactif nécessite un terminal. Utilisez agent --print --json pour préparer la mission sans appeler un modèle.');
  if (!probeVersion(provider)) throw new Error(`${provider} n'est pas installé. Voir docs/FACTORY.md ; le contexte reste disponible avec context. Aucun assistant de remplacement n'a été lancé.`);
  if (!args['no-app']) await ensureApp(root, args);
  console.log(`\n${provider} démarre dans votre projet. Quittez sa session pour revenir au menu Factory.\n`);
  releaseInput();
  agentActive = true;
  try {await launchAgent(agentCommand(provider, root, context.prompt), {signal: interrupted.signal});}
  finally {agentActive = false;}
}

async function showDoctor(root, args) {
  const report = await doctor(root);
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`\nInstallation : ${root}\nNode ${report.node.version} : ${report.node.ok ? 'prêt' : '22.12+ requis'}\nGit : ${report.git.installed ? 'prêt' : 'absent'}\nApplication : ${report.dependencies.installed ? 'dépendances présentes' : 'installation automatique au premier lancement'}\nContexte inclus : ${report.context.roles} rôles, ${report.context.skills} méthodes\nAgence : ${report.profile ? 'brief enregistré' : 'à présenter'}`);
    for (const [name, value] of Object.entries(report.agents)) console.log(`${name} : ${value.version || 'non installé'} (connexion au compte non testée)`);
  }
  if (!report.node.ok) process.exitCode = 1;
}

async function shareDashboard(root,args) {
  const report=await deploymentCheck(root,{verify:!!args.verify});
  if(args.check){console.log(args.json?JSON.stringify(report,null,2):formatDeployment(report));return;}
  if(!args.target&&(!process.stdin.isTTY||args.print))throw new Error('Choisissez --target railway, supabase ou podman ; --check --json affiche le diagnostic seul.');
  if(!args.print)console.log(formatDeployment(report));
  const target=args.target||['railway','supabase','podman'][await choose('Comment voulez-vous utiliser le dashboard ?',[
    'Le partager en ligne — préparer Railway et une base Supabase',
    'Préparer ma base, les comptes et le stockage — Supabase',
    'Le garder sur ma machine dans un conteneur — Podman',
  ])];
  if(!args.print&&!args.target){
    const next=await choose('Prochaine étape', ['Confier la préparation à mon agent','Afficher le prompt à copier','Revenir au menu']);
    if(next===2)return;
    if(next===1)args={...args,print:true};
  }
  await runAgent(root,{...args,'no-app':true,task:deploymentPrompt(target,report)});
}

function formatDeployment(report) {
 const labels={verified:'vérifié',not_checked:'non testé',not_installed:'outil absent',unavailable:'à vérifier'};
 return `\nPARTAGER MON DASHBOARD — diagnostic\n${['supabase','railway','podman'].map(name=>`${name} : ${report[name].installed?'installé':'absent'} · ${labels[report[name].account??report[name].engine]}`).join('\n')}\nConfigurations présentes : Supabase ${report.supabase.projectConfig?'oui':'non'}, Railway ${report.railway.projectConfig?'oui':'non'}, fichier d’environnement ${report.environmentFilePresent?'oui':'non'}.\nPour vérifier les connexions globales : npm run factory -- deploy --check --verify\nLe mode local fonctionne sur votre machine. Le partage Internet nécessite encore la recette d’accès décrite dans docs/DEPLOYMENT.md.\n`;
}

async function menu(root, args) {
  terminal();
  if (!await loadProfile(root)) await onboard(root, args);
  while (!interrupted.signal.aborted) {
    const profile = await loadProfile(root);
    const option = await choose(`\n┌─ LEADFACTORY · ${profile.agency}\n│  ${root}\n└─ Votre agence et votre agent, au même endroit`, [
      'Ouvrir ma Factory et lancer mon agent', 'Naviguer dans la Factory', 'Confier une mission à mon agent',
      'Comprendre le parcours', 'Modifier le brief de mon agence', 'Vérifier mon installation',
      'Afficher le contexte de mon agent', 'Quitter', 'Partager mon dashboard / préparer le déploiement',
    ]);
    try {
      if (option === 0) await runAgent(root, args);
      else if (option === 1) {
        const selected = await choose('Où voulez-vous aller ?', sections.map(([name]) => name));
        await ensureApp(root, args, sections[selected][1]);
      } else if (option === 2) {
        const selected = await choose('Quelle mission ?', [...missions.map(([name]) => name), 'Une autre mission']);
        const [, role, task] = missions[selected] || ['', 'ceo', await ask('Décrivez la mission')];
        await runAgent(root, {...args, role, task});
      } else if (option === 3) console.log(GUIDE);
      else if (option === 4) await onboard(root, args);
      else if (option === 5) await showDoctor(root, args);
      else if (option === 6) console.log((await contextForAgent(root, args)).prompt);
      else if (option === 8) await shareDashboard(root,args);
      else return;
    } catch (error) {
      if (interrupted.signal.aborted) return;
      console.error(`\n${error.message}\nVotre travail est conservé. Vous pouvez choisir une autre action.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {console.log(HELP); return;}
  if (args.command === 'guide') {console.log(GUIDE); return;}
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || major === 22 && minor < 12) throw new Error('Installez Node.js 22.12 ou plus récent pour la Factory.');
  let root;
  if (args.command === 'init') {
    root = await cloneProject(args.directory, {ref: args.ref || RELEASE_REF});
    console.log(`\nProjet et méthodes téléchargés dans ${root}`);
    if (args['no-onboard']) return;
    await menu(root, args); return;
  }
  root = await findProject(args.project || process.cwd());
  if (args.command === 'doctor') await showDoctor(root, args);
  else if(args.command==='deploy')await shareDashboard(root,args);
  else if (args.command === 'context') {
    const context = await contextForAgent(root, args);
    console.log(args.json ? JSON.stringify(context, null, 2) : context.prompt);
  } else if (args.command === 'onboard') await onboard(root, args);
  else if (args.command === 'agent') await runAgent(root, args);
  else if (args.command === 'sops') await installSops(root,{signal:interrupted.signal});
  else if (args.command === 'install') {await prepareApp(root,{force:true,signal:interrupted.signal});if(!args['no-sops'])await installSops(root,{signal:interrupted.signal});}
  else if (args.command === 'start') {
    await ensureApp(root, args);
    console.log('Gardez ce terminal ouvert. Ctrl-C arrête cette session locale.');
    if (!interrupted.signal.aborted) await new Promise(done => interrupted.signal.addEventListener('abort', done, {once: true}));
  } else await menu(root, args);
}

try {await main();}
catch (error) {
  if (!interrupted.signal.aborted) {console.error(`LeadFactory : ${error.message}`); process.exitCode = 1;}
} finally {
  releaseInput();
  await app?.stop();
  process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onTerminate);
  if (interrupted.signal.aborted) process.exitCode = 130;
}
