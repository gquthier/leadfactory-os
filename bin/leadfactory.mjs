#!/usr/bin/env node
import {createInterface} from 'node:readline/promises';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs, findProject, cloneProject, loadProfile, saveProfile, contextForAgent,
  doctor, agentCommand, launchAgent, DEFAULT_PORT, RELEASE_REF} from '../lib/factory.mjs';
import {openBrowser, prepareApp} from '../lib/factory-runtime.mjs';
import {installSops} from '../lib/factory-sops.mjs';
import {createTerminalUI, selectOption} from '../lib/factory-ui.mjs';
import {detectAgents, preferredAgent} from '../lib/factory-detection.mjs';
import {startFactoryServices} from '../lib/factory-startup.mjs';
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
  --no-agent          Afficher le menu après le brief sans ouvrir le CEO
  --plain             Interface texte simple, sans animation ni menu à flèches
  --no-sops           Différer le téléchargement des vidéos (environ 1,1 Go)
  --target railway|supabase|podman  Destination du parcours de partage
  --check             Diagnostic de partage uniquement, sans agent ni déploiement
  --verify            Tester en lecture les sessions globales et le moteur Podman

Le serveur reste ouvert pendant la session. Quitter la Factory arrête seulement
le serveur qu'elle a démarré. Les données et la mémoire restent dans le projet.
`;

const GUIDE = `Votre parcours dans la Factory

1. Présentez l'agence : offre, cible et objectif. Ce brief reste dans le projet.
2. Codex et Claude Code sont détectés. Si les deux sont présents, choisissez votre assistant.
3. Le CEO s'ouvre avec votre brief ; le logiciel se prépare en arrière-plan.
   L'agent fait le setup : il trouve les accès autorisés et vous guide pour les clés manquantes.
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
  ['Start Here', '/admin/start-here'], ['Agents IA', '/admin/agents'],
  ['Dashboard', '/admin/dashboard'], ['Pipeline', '/admin/pipeline'],
  ['Onboarding', '/admin/onboarding'], ['Clients', '/admin/clients'],
  ['Résultats', '/admin/results'], ['Campagnes', '/admin/campaigns'],
  ['Leads', '/admin/leads'], ['CRM', '/admin/crm'], ['Team', '/admin/team'],
  ['Finance', '/admin/finances'], ['Activité', '/admin/activity'],
  ['Formations', '/admin/formations'], ['Meta Ads', '/admin/meta'],
  ['UGC Scripts', '/admin/ugc/montage'], ['Ressources', '/admin/resources'],
  ['Webhooks', '/admin/webhooks'], ['Paramètres', '/admin/settings'],
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

let input, services, detected, ui = createTerminalUI(), agentActive = false;
const interrupted = new AbortController();
function releaseInput() {const previous = input; input = null; previous?.close();}
function onSignal() {
  if (agentActive) return; // The foreground agent handles its own Ctrl-C.
  interrupted.abort(); releaseInput();
  void services?.stop().catch(() => {});
}
function onTerminate() {agentActive = false; onSignal();}
process.on('SIGINT', onSignal);
process.on('SIGTERM', onTerminate);

function terminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Ce menu nécessite un terminal. Pour un agent : onboard --profile FICHIER, context --json ou doctor --json.');
  if (!input) {
    const current = createInterface({input: process.stdin, output: process.stdout, terminal: ui.styled});
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
  if (ui.styled) {
    releaseInput();
    try {return await selectOption(title, options, {selected: defaultIndex, signal: interrupted.signal});}
    catch (error) {if (error.name === 'AbortError') onSignal(); throw error;}
  }
  console.log(`\n${title}`);
  options.forEach((option, index) => console.log(`  ${index + 1}. ${option}`));
  for (;;) {
    const answer = Number(await ask('Votre choix', String(defaultIndex + 1)));
    if (Number.isInteger(answer) && answer >= 1 && answer <= options.length) return answer - 1;
    console.log('Choisissez un numéro de la liste.');
  }
}

async function findAgents() {
  detected ??= await ui.task('Détection de vos assistants', () => detectAgents());
  for (const agent of detected) {
    const status = !agent.installed ? 'non installé' : agent.authentication === 'ready' ? 'session connectée'
      : agent.authentication === 'login_required' ? 'connexion nécessaire' : 'connexion à vérifier à l’ouverture';
    ui.note(`${agent.label}${agent.version ? ' ' + agent.version : ''} · ${status}${agent.model ? ' · modèle configuré : ' + agent.model : ''}`);
  }
  return detected;
}

async function chooseProvider(previous, explicit) {
  const agents = await findAgents();
  if (explicit) return explicit;
  const installed = agents.filter(agent => agent.installed);
  const preferred = preferredAgent(agents, previous);
  if (installed.length === 1 && previous !== 'manual') {
    ui.success(`${installed[0].label} sélectionné automatiquement`);
    return installed[0].id;
  }
  if (!installed.length) {
    ui.note('Installez Codex : https://developers.openai.com/codex/cli');
    ui.note('Ou Claude Code : https://code.claude.com/docs/en/setup');
    ui.note('Votre brief reste utilisable avec un autre assistant : le prompt sera affiché.');
    return 'manual';
  }
  const providers = [...installed.map(agent => agent.id), 'manual'];
  const selected = await choose('Votre assistant personnel', [
    ...installed.map(agent => `${agent.label}${agent.authentication === 'ready' ? ' · connecté' : ' · connexion à vérifier'}`),
    'Un autre assistant · copier le contexte',
  ], Math.max(0, providers.indexOf(preferred)));
  return providers[selected];
}

async function onboard(root, args) {
  if (args.profile) {
    const profile = await saveProfile(root, JSON.parse(await readFile(resolve(args.profile), 'utf8')));
    console.log(args.json ? JSON.stringify(profile, null, 2) : 'Contexte enregistré. Lancez npm run factory pour ouvrir votre agence.');
    return profile;
  }
  terminal();
  const previous = await loadProfile(root);
  ui.step(1, 'Votre assistant, déjà chez vous');
  const provider = await chooseProvider(previous?.provider, args.provider);
  ui.step(2, 'Présentez votre agence');
  ui.note('Quatre réponses. Entrée pour définir les détails avec votre CEO.');
  let agency = await ask('Nom de votre agence', previous?.agency);
  while (!agency) agency = await ask('Nom de votre agence (requis)');
  const offer = await ask('Votre offre', previous?.offer || 'À définir avec mon agent');
  const audience = await ask('Votre client idéal', previous?.audience || 'À définir avec mon agent');
  const objective = await ask('Votre premier objectif', previous?.objective || 'Préparer mon offre et mon premier dossier client');
  ui.step(3, 'Votre CEO reçoit le contexte');
  const profile = await saveProfile(root, {agency, offer, audience, objective, provider,
    language: previous?.language || 'fr', port: args.port ?? previous?.port ?? DEFAULT_PORT});
  ui.success('Brief, mémoire et prochaine action enregistrés dans votre projet');
  const context = await contextForAgent(root);
  ui.note(`${context.roles.length} rôles · ${context.skills.length} méthodes · les instructions du CEO sont prêtes`);
  return profile;
}

async function prepareServices(root, args) {
  const profile = await loadProfile(root), port = args.port ?? profile?.port ?? DEFAULT_PORT;
  if (services && (services.state.url !== `http://127.0.0.1:${port}` || ['error', 'stopped'].includes(services.state.app))) {
    await services.stop(); services = null;
  }
  services ??= await startFactoryServices(root, {port, noSops: !!args['no-sops'], noOpen: !!args['no-open'], signal: interrupted.signal});
  return services;
}

async function ensureApp(root, args, path = '/admin/start-here') {
  const job = await prepareServices(root, {...args, 'no-open': true});
  const url = job.state.app === 'ready' ? job.state.url : await ui.task('Préparation du dashboard · première installation parfois longue', () => job.ready);
  ui.success(`Factory ouverte : ${url}${path}`);
  if (!args['no-open'] && !openBrowser(url + path)) console.log('Ouvrez cette adresse dans votre navigateur.');
  return url;
}

async function runAgent(root, args) {
  const context = await contextForAgent(root, args);
  let provider = args.provider ?? context.profile?.provider;
  if (!provider) provider = args.print ? 'codex' : preferredAgent(await findAgents());
  if (args.print) {
    console.log(args.json ? JSON.stringify({provider, ...context}, null, 2) : context.prompt);
    return;
  }
  if (provider === 'manual') {
    if (!args['no-app']) await prepareServices(root, args);
    console.log(`\nContexte à transmettre à votre assistant :\n\n${context.prompt}`);
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Le lancement interactif nécessite un terminal. Utilisez agent --print --json pour préparer la mission sans appeler un modèle.');
  const agents = detected ?? await findAgents(), agent = agents.find(item => item.id === provider);
  if (!agent?.installed) throw new Error(`${provider} n'est pas installé. Installez-le puis relancez la Factory, ou changez d'assistant dans le menu. Le contexte reste disponible avec context.`);
  if (agent.authentication === 'login_required') ui.note(`${agent.label} demandera votre connexion à l’ouverture. Votre compte et ses permissions restent gérés par cet outil.`);
  if (!args['no-app']) {
    await prepareServices(root, args);
    ui.note('Le dashboard se prépare en arrière-plan. Les SOP se téléchargent ensuite.');
    ui.note('État pour votre CEO : .leadfactory/startup.json · Journal : .leadfactory/setup.log');
  }
  ui.step(4, `${agent.label} · votre CEO prend la main`);
  ui.note('Quittez sa session pour revenir à la Factory. Votre modèle et vos permissions sont conservés.');
  releaseInput();
  agentActive = true;
  try {await launchAgent(agentCommand(provider, root, context.prompt), {signal: interrupted.signal});}
  finally {agentActive = false; detected = null;}
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
  if (!await loadProfile(root)) {
    await onboard(root, args);
    if (!args['no-agent']) {
      try {await runAgent(root, args);}
      catch (error) {if (interrupted.signal.aborted) return; ui.note(error.message);}
    }
  }
  while (!interrupted.signal.aborted) {
    const profile = await loadProfile(root);
    if (services) ui.note(services.state.message);
    const option = await choose(`LeadFactory · ${profile.agency}`, [
      'Parler à mon CEO', 'Naviguer dans la Factory', 'Confier une mission à mon agent',
      'Modifier le brief de mon agence', 'Changer mon assistant', 'Partager mon dashboard / déploiement',
      'Vérifier mon installation', 'Copier le contexte de mon agent', 'Comprendre le parcours', 'Quitter',
    ]);
    try {
      if (option === 0) await runAgent(root, args);
      else if (option === 1) {
        const selected = await choose('Les menus de votre Factory', [...sections.map(([name]) => name), 'Revenir']);
        if (selected < sections.length) await ensureApp(root, args, sections[selected][1]);
      } else if (option === 2) {
        const selected = await choose('Quelle mission ?', [...missions.map(([name]) => name), 'Une autre mission', 'Revenir']);
        if (selected === missions.length + 1) continue;
        const [, role, task] = missions[selected] || ['', 'ceo', await ask('Décrivez la mission')];
        await runAgent(root, {...args, role, task});
      } else if (option === 3) await onboard(root, args);
      else if (option === 4) {
        detected = null;
        const agents = await findAgents();
        const installed = agents.filter(agent => agent.installed), providers = [...installed.map(agent => agent.id), 'manual'];
        const choice = await choose('Changer mon assistant', [...installed.map(agent => agent.label), 'Un autre assistant · copier le contexte'], Math.max(0, providers.indexOf(profile.provider)));
        await saveProfile(root, {...profile, provider: providers[choice]});
        delete args.provider;
      } else if (option === 5) await shareDashboard(root, args);
      else if (option === 6) await showDoctor(root, args);
      else if (option === 7) console.log((await contextForAgent(root, args)).prompt);
      else if (option === 8) console.log(GUIDE);
      else return;
    } catch (error) {
      if (interrupted.signal.aborted) return;
      console.error(`\n${error.message}\nVotre travail est conservé. Vous pouvez choisir une autre action.`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ui = createTerminalUI({plain: !!args.plain});
  if (args.help) {console.log(HELP); return;}
  if (args.command === 'guide') {console.log(GUIDE); return;}
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || major === 22 && minor < 12) throw new Error('Installez Node.js 22.12 ou plus récent pour la Factory.');
  let root;
  if (args.command === 'init') {
    ui.banner();
    root = await ui.task('Installation de LeadFactory open source', () => cloneProject(args.directory, {ref: args.ref || RELEASE_REF, stdio: ui.styled ? 'ignore' : 'inherit', signal: interrupted.signal}));
    console.log(`\nProjet et méthodes téléchargés dans ${root}`);
    if (args['no-onboard']) return;
    await menu(root, args); return;
  }
  root = await findProject(args.project || process.cwd());
  if (['menu', 'onboard', 'agent', 'start'].includes(args.command) && !args.json && !args.print && !args.profile && process.stdout.isTTY) ui.banner();
  if (args.command === 'doctor') await showDoctor(root, args);
  else if(args.command==='deploy')await shareDashboard(root,args);
  else if (args.command === 'context') {
    const context = await contextForAgent(root, args);
    console.log(args.json ? JSON.stringify(context, null, 2) : context.prompt);
  } else if (args.command === 'onboard') {
    await onboard(root, args);
    if (!args.profile && !args['no-agent']) await runAgent(root, args);
  }
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
  try {await services?.stop();} catch (error) {console.error(`Arrêt du logiciel : ${error.message}`); process.exitCode = 1;}
  process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onTerminate);
  if (interrupted.signal.aborted) process.exitCode = 130;
}
