import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createFactoryApp, workspaceIdentity} from '../lib/factory-runtime.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'lf-runtime-')));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, 'full-app/node_modules/next/dist/bin'), {recursive: true});
  await writeFile(join(root, 'full-app/node_modules/next/dist/bin/next'), `
    const http = require('node:http');
    const crypto = require('node:crypto');
    const path = require('node:path');
    const id = crypto.createHash('sha256').update(process.cwd()+'\\0'+path.resolve(process.env.LEADFACTORY_STARTER_DATA_DIR)).digest('hex').slice(0,24);
    const server = http.createServer((req,res) => {
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({app:'leadfactory',mode:process.env.LEADFACTORY_DATA_MODE,workspaceId:id,external:process.env.LEADFACTORY_ENABLE_EXTERNAL,command:process.argv[2]}));
    });
    server.listen(Number(process.argv[process.argv.indexOf('-p')+1]),'127.0.0.1');
    process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
  `);
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return {root, port};
}

test('Factory starts locally, verifies its identity, reuses only itself and stops its own child', async t => {
  const {root, port} = await fixture(t);
  const app = createFactoryApp(root, {port, timeout: 10000, onMessage() {}, prepare:async()=>{}});
  t.after(() => app.stop());
  const first = await app.start();
  assert.equal(first.owned, true);
  const health = await (await fetch(first.url + '/api/starter/health')).json();
  assert.equal(health.workspaceId, await workspaceIdentity(root));
  assert.equal(health.mode, 'local');
  assert.equal(health.external, '0');
  assert.equal(health.command, 'start');
  const second = createFactoryApp(root, {port, timeout: 1000, onMessage() {}, prepare:async()=>{}});
  assert.equal((await second.start()).owned, false);
  await second.stop();
  assert.equal((await fetch(first.url)).status, 200, 'reused server must not be killed');
  await app.stop();
  await assert.rejects(fetch(first.url));
});

test('Factory refuses another project on the port instead of opening its data', async t => {
  const {root, port} = await fixture(t);
  const server = createServer((req, res) => res.end(JSON.stringify({app: 'leadfactory', mode: 'local', workspaceId: 'someone-else'})));
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const app = createFactoryApp(root, {port, timeout: 1000, onMessage() {}, prepare:async()=>{}});
  await assert.rejects(app.start(), /port|autre/i);
  assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
});

test('Factory reports a failed startup and retains its log instead of waiting forever', async t => {
  const {root, port} = await fixture(t);
  await writeFile(join(root, 'full-app/node_modules/next/dist/bin/next'), 'process.stderr.write("fixture failure"); process.exit(9);');
  const app = createFactoryApp(root, {port, timeout: 3000, onMessage() {}, prepare:async()=>{}});
  t.after(() => app.stop());
  await assert.rejects(app.start(), /app.log|arrêt/i);
});
