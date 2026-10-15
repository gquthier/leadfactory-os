import {open, writeFile, rename} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {workspace, DEFAULT_PORT} from './factory.mjs';
import {createFactoryApp, openBrowser} from './factory-runtime.mjs';
import {installSops} from './factory-sops.mjs';

/** Prepare the dashboard quietly while the user's foreground CEO owns the terminal. */
export async function startFactoryServices(root, {
  port = DEFAULT_PORT, noSops = false, noOpen = true, signal,
  createApp = createFactoryApp, installMedia = installSops,
} = {}) {
  const directory = await workspace(root);
  const log = await open(join(directory, 'setup.log'), constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const state = {version: 1, pid: process.pid, app: 'preparing', sops: noSops ? 'deferred' : 'pending',
    url: `http://127.0.0.1:${port}`, message: 'Préparation du logiciel en arrière-plan.', log: '.leadfactory/setup.log'};
  const save = async () => {
    const file = join(directory, 'startup.json'), temporary = file + '.' + randomUUID();
    await writeFile(temporary, JSON.stringify({...state, updatedAt: new Date().toISOString()}, null, 2), {mode: 0o600, flag: 'wx'});
    await rename(temporary, file);
  };
  const onMessage = message => {void log.write(String(message) + '\n').catch(() => {});};
  let app;
  try {
    if (!(await log.stat()).isFile()) throw new Error('Le journal de setup doit être un fichier normal.');
    await log.chmod(0o600);
    app = createApp(root, {port, signal: combined, prepareStdio: ['ignore', log.fd, log.fd], onMessage});
    await save();
  } catch (error) {await log.close(); throw error;}
  let stopping, readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {readyResolve = resolve; readyReject = reject;});
  ready.catch(() => {});
  const done = (async () => {
    try {
      combined.throwIfAborted();
      await app.start();
      combined.throwIfAborted();
      state.app = 'ready'; state.message = 'Logiciel disponible.';
      await save();
      if (!noOpen) openBrowser(state.url + '/admin/start-here');
      if (!noSops) {state.sops = 'downloading'; state.message = 'Logiciel disponible ; téléchargement des SOP.';}
      readyResolve(state.url);
      if (!noSops) {
        await save();
        await installMedia(root, {signal: combined, onMessage});
        state.sops = 'ready'; state.message = 'Logiciel et ressources disponibles.';
        await save();
      }
    } catch (error) {
      readyReject(error);
      if (combined.aborted) {
        if (state.app !== 'ready') state.app = 'stopped';
        if (state.sops === 'downloading') state.sops = 'interrupted';
        state.message = 'Préparation interrompue ; relancer la Factory pour reprendre.';
      } else {
        if (state.app === 'ready') {state.sops = 'error'; state.message = 'Logiciel disponible ; SOP à reprendre avec npm run factory -- sops.';}
        else {state.app = 'error'; state.message = 'Préparation du logiciel interrompue. Voir .leadfactory/setup.log.';}
        onMessage(error.message);
      }
      await save();
    } finally {await log.close();}
  })();
  // Observe background errors even when a foreground agent is still running.
  done.catch(() => {});
  return {state, ready, done, app, stop() {
    return stopping ??= (async () => {
      controller.abort(); await app.stop(); await done.catch(() => {});
      state.app = 'stopped'; await save();
    })();
  }};
}
