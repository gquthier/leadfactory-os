import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {get} from 'node:http';
import {mkdtemp, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {realpath} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

async function start(t) {
  await access('.next/BUILD_ID');
  const dataDir = await mkdtemp(join(tmpdir(), 'lf-http-'));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: {...process.env, LEADFACTORY_DATA_MODE: 'local', NEXT_PUBLIC_LEADFACTORY_DATA_MODE: 'local',
      LEADFACTORY_STARTER_DATA_DIR: dataDir, LEADFACTORY_ENABLE_EXTERNAL: '0', LEADFACTORY_CONNECT_DATABASE: '0'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; child.stdout.on('data', chunk => {output = (output + chunk).slice(-5000);});
  child.stderr.on('data', chunk => {output = (output + chunk).slice(-5000);});
  t.after(async () => {
    child.kill('SIGTERM');
    for (let i = 0; i < 30 && child.exitCode === null && child.signalCode === null; i++) await delay(100);
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGKILL'); await exited;
    }
    await rm(dataDir, {recursive: true, force: true});
  });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Local server exited: ${output}`);
    try {if ((await fetch(base + '/api/starter/export', {signal: AbortSignal.timeout(1000)})).ok) return base;} catch {}
    await delay(100);
  }
  throw new Error(`Local server did not start: ${output}`);
}
const post = (base, path, body) => fetch(base + path, {method: 'POST',
  headers: {'Content-Type': 'application/json', Origin: base}, body: JSON.stringify(body)});

test('built application opens every admin menu and refuses external access', {timeout: 60000}, async t => {
  const base = await start(t);
  const root = await fetch(base, {redirect: 'manual'});
  assert.equal(root.status, 307); assert.equal(root.headers.get('location'), '/admin/dashboard');
  for (const path of ['start-here', 'agents', 'dashboard', 'pipeline', 'onboarding', 'clients', 'results',
    'campaigns', 'leads', 'crm', 'team', 'finances', 'activity', 'formations', 'meta', 'chat',
    'ugc/montage', 'resources', 'webhooks', 'settings']) {
    const response = await fetch(`${base}/admin/${path}`);
    assert.equal(response.status, 200, path);
    assert.doesNotMatch(await response.text(), /Application error|Internal Server Error/);
  }
  assert.equal((await fetch(base + '/onboarding')).status, 200);
  assert.equal((await fetch(base + '/api/starter/schema')).status, 200);
  // Native fetch deliberately replaces Host. Use http.get to exercise the actual inbound header.
  const foreignHostStatus = await new Promise((resolve, reject) => {
    get(base + '/admin/dashboard', {headers: {host: 'foreign.example'}}, response => {
      response.resume(); response.once('end', () => resolve(response.statusCode));
    }).once('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await fetch(base + '/api/starter/export', {headers: {Origin: 'https://foreign.example'}})).status, 403);
  assert.equal((await fetch(base + '/api/meta/adaccounts')).status, 501);
});

test('HTTP export and restore preserve a client across independent installations', {timeout: 60000}, async t => {
  const source = await start(t), target = await start(t);
  const created = await post(source, '/api/admin/create-client', {full_name: 'Camille Fixture', company: 'Agence de test', email: 'camille@example.invalid'});
  assert.equal(created.status, 200); const client = await created.json();
  const exported = await fetch(source + '/api/starter/export');
  assert.equal(exported.status, 200); assert.match(exported.headers.get('content-disposition'), /attachment/);
  const snapshot = await exported.json();
  const restored = await post(target, '/api/starter/import', snapshot);
  assert.equal(restored.status, 200); assert.equal((await restored.json()).counts.clients, 1);
  const check = await (await fetch(target + '/api/starter/export')).json();
  assert.ok(check.database.tables.profiles.some(row => row.id === client.client_id));
  assert.equal(check.database.tables.client_tasks.length, 3);
  assert.equal((await post(target, '/api/starter/import', snapshot)).status, 409);
  const page = await (await fetch(`${target}/admin/clients/${client.client_id}`)).text();
  assert.match(page, /Agence de test/);
});

test('agent API journey records and retrieves a real draft deliverable', {timeout: 60000}, async t => {
  const base = await start(t);
  const health = await (await fetch(base + '/api/starter/health')).json();
  assert.equal(health.app, 'leadfactory');
  assert.equal(health.mode, 'local');
  assert.match(health.workspaceId, /^[a-f0-9]{24}$/);
  assert.equal(JSON.stringify(health).includes(await realpath(process.cwd())), false);
  const created = await (await post(base, '/api/admin/create-client', {
    full_name: 'Camille Agent', company: 'Client de test', email: 'agent@example.invalid',
  })).json();
  const clientId = created.client_id;
  assert.ok(clientId);
  const listed = await (await post(base, '/api/starter/local-query', {
    table: 'profiles', operations: [['select', ['id,company,full_name']], ['eq', ['role', 'client']]],
  })).json();
  assert.equal(listed.data[0].id, clientId);
  const brief = '# Brief fictif\n\nCible confirmée : PME.\nProchaine action : valider l’offre.';
  const response = await post(base, '/api/starter/local-query', {table: 'ai_deliverables', operations: [
    ['insert', [{client_id: clientId, deliverable_name: 'Brief — version 1', category: 'brief', file_type: 'md', mime_type: 'text/markdown', status: 'draft', source: 'personal-agent', content: brief}]],
    ['select', ['id,client_id,deliverable_name,status']],
  ]});
  assert.equal(response.status, 200);
  const saved = await response.json();
  const downloaded = await fetch(base + '/api/admin/ai-deliverables/download?id=' + saved.data[0].id);
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), brief);
  const task = await post(base, '/api/admin/tasks', {client_id: clientId, title: 'Valider le brief', description: 'Exemple de mission agent.'});
  assert.equal(task.status, 200);
  const tasks = await (await fetch(base + '/api/admin/tasks?client_id=' + clientId)).json();
  assert.ok(tasks.tasks.some(row => row.title === 'Valider le brief'));
});
