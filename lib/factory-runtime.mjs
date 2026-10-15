import {open, realpath, readFile, writeFile, readdir, lstat, mkdir, rmdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {spawn, spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {exists, workspace, launchAgent, validPort, DEFAULT_PORT} from './factory.mjs';

export async function workspaceIdentity(root) {
  const app = await realpath(join(root, 'full-app'));
  return createHash('sha256').update(`${app}\0${join(app, '.local-data')}`).digest('hex').slice(0, 24);
}

export async function installApp(root, {signal,stdio} = {}) {
  const npm = process.env.npm_execpath;
  const command = npm && await exists(npm) ? {command: process.execPath, args: [npm, 'ci']} : {command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['ci']};
  await launchAgent({...command, cwd: join(root, 'full-app')}, {env: localEnvironment(root),signal,stdio,processGroup:true});
}

function localEnvironment(root){return {...process.env,PUPPETEER_SKIP_DOWNLOAD:'true',LEADFACTORY_DATA_MODE:'local',NEXT_PUBLIC_LEADFACTORY_DATA_MODE:'local',LEADFACTORY_STARTER_DATA_DIR:join(root,'full-app/.local-data'),LEADFACTORY_ENABLE_EXTERNAL:'0',LEADFACTORY_CONNECT_DATABASE:'0',NEXT_TELEMETRY_DISABLED:'1'};}

export async function appFingerprint(root){
  const hash=createHash('sha256').update(`${process.platform}-${process.arch}-${process.versions.node.split('.')[0]}`),app=join(root,'full-app');
  async function add(relative){const file=join(app,relative);let info;try{info=await lstat(file);}catch(e){if(e.code==='ENOENT')return;throw e;}if(info.isSymbolicLink())throw new Error(`Source de compilation symbolique refusée : ${relative}`);if(info.isDirectory()){for(const name of (await readdir(file)).sort())await add(join(relative,name));}else{hash.update(relative);hash.update(await readFile(file));}}
  for(const name of ['src','runtime','package.json','package-lock.json','next.config.mjs','postcss.config.mjs','tailwind.config.ts','tsconfig.json'])await add(name);
  return hash.digest('hex');
}

export async function prepareApp(root,{onMessage=console.log,force=false,signal,stdio}={}){
  signal?.throwIfAborted();
  const dir=await workspace(root),lock=join(dir,'install.lock');
  try{await mkdir(lock,{mode:0o700});}catch(e){if(e.code==='EEXIST')throw new Error('Une installation est en cours. Si elle a été interrompue, retirez le dossier vide .leadfactory/install.lock puis relancez.');throw e;}
  try{
    const app=join(root,'full-app'),next=join(app,'node_modules/next/dist/bin/next'),lockHash=createHash('sha256').update(await readFile(join(app,'package-lock.json'))).digest('hex');
    const stamp=join(app,'node_modules/.leadfactory-lock');
    const recorded=await readFile(stamp,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    if(force||!await exists(next)||recorded!==lockHash){onMessage('Installation des dépendances verrouillées…');await installApp(root,{signal,stdio});await writeFile(stamp,lockHash);}
    const fingerprint=await appFingerprint(root),buildStamp=join(app,'.next/leadfactory-build.sha256');
    const built=await readFile(buildStamp,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    if(force||built!==fingerprint||!await exists(join(app,'.next/BUILD_ID'))){
      onMessage('Préparation du logiciel pour le premier lancement (compilation de production)…');
      await launchAgent({command:process.execPath,args:[next,'build'],cwd:app},{env:localEnvironment(root),signal,stdio,processGroup:true});
      await writeFile(buildStamp,fingerprint);
    }
  }finally{await rmdir(lock);}
}

async function health(url) {
  try {
    const response = await fetch(url + '/api/starter/health', {signal: AbortSignal.timeout(1200), redirect: 'error'});
    return response.ok ? await response.json() : null;
  } catch {return null;}
}

async function portAvailable(port) {
  const socket = createServer();
  return new Promise(resolvePromise => {
    socket.once('error', () => resolvePromise(false));
    socket.listen(port, '127.0.0.1', () => socket.close(() => resolvePromise(true)));
  });
}

export function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
  const result = spawnSync(command, [url], {stdio: 'ignore', timeout: 5000, shell: false});
  return !result.error && result.status === 0;
}

export function createFactoryApp(root, {port = DEFAULT_PORT, timeout = 120000, onMessage = console.log, prepare = prepareApp, signal, prepareStdio} = {}) {
  port = validPort(port);
  const url = `http://127.0.0.1:${port}`;
  let child, stopping, stopped = false;
  const alive = () => child && child.exitCode === null && child.signalCode === null;
  const app = {
    url,
    async start() {
      const identity = await workspaceIdentity(root);
      const matches = data => data?.app === 'leadfactory' && data.mode === 'local' && data.workspaceId === identity;
      if (matches(await health(url))) return {url, owned: Boolean(alive())};
      if (!await portAvailable(port)) throw new Error(`Le port ${port} est utilisé par une autre instance ou application. Réessayez avec --port ${port + 1}.`);
      const next = join(root, 'full-app/node_modules/next/dist/bin/next');
      await prepare(root,{onMessage,signal,stdio:prepareStdio});
      if (stopped) throw new Error('Démarrage annulé.');
      const dir = await workspace(root), logPath = join(dir, 'app.log');
      const log = await open(logPath, 'a', 0o600);
      const appRoot = await realpath(join(root, 'full-app'));
      child = spawn(process.execPath, [next, 'start', '-H', '127.0.0.1', '-p', String(port)], {
        cwd: appRoot, stdio: ['ignore', log.fd, log.fd], detached: process.platform !== 'win32', shell: false,
        env: {...process.env, LEADFACTORY_DATA_MODE: 'local', NEXT_PUBLIC_LEADFACTORY_DATA_MODE: 'local',
          LEADFACTORY_STARTER_DATA_DIR: join(appRoot, '.local-data'), LEADFACTORY_ENABLE_EXTERNAL: '0',
          LEADFACTORY_CONNECT_DATABASE: '0', NEXT_TELEMETRY_DISABLED: '1'},
      });
      let failure;
      child.on('error', error => {failure = error;});
      await log.close();
      onMessage(`Ouverture de la Factory… Journal : ${logPath}`);
      const deadline = Date.now() + timeout;
      try {
        while (Date.now() < deadline) {
          if (stopped || failure || !alive()) throw new Error(`Le serveur s'est arrêté. Consultez ${logPath}${failure ? ` (${failure.message})` : ''}.`);
          if (matches(await health(url))) return {url, owned: true};
          await delay(200);
        }
        throw new Error(`Démarrage trop long. Consultez ${logPath}, puis relancez la Factory.`);
      } catch (error) {await app.stop(); throw error;}
    },
    stop() {
      if (stopping) return stopping;
      stopped = true;
      stopping = (async () => {
      if (!alive()) return;
      const signal = name => {
        try {if (process.platform === 'win32') child.kill(name); else process.kill(-child.pid, name);}
        catch (error) {if (error.code !== 'ESRCH') throw error;}
      };
      signal('SIGTERM');
      for (let i = 0; i < 30 && alive(); i++) await delay(100);
      if (alive()) {
        const exit = new Promise(resolvePromise => child.once('exit', resolvePromise));
        signal('SIGKILL'); await exit;
      }
      })();
      return stopping;
    },
  };
  return app;
}
