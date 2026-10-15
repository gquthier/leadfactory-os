import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localTransaction, LOCAL_ADMIN_ID} from '../src/lib/starter-local-store';
import {exportLocalData, importLocalData} from '../src/lib/starter-backup';

async function fixture(t: any) {
  const dataDir = await mkdtemp(join(tmpdir(), 'lf-backup-'));
  t.after(() => rm(dataDir, {recursive: true, force: true}));
  return {dataDir};
}
const request = (data: unknown, headers = {}) => new Request('http://localhost:14320/api/starter/import', {
  method: 'POST', headers: {'Content-Type': 'application/json', origin: 'http://localhost:14320', ...headers},
  body: JSON.stringify(data),
});
const exportRequest = () => new Request('http://localhost:14320/api/starter/export');
async function seed(options: {dataDir: string}) {
  await localTransaction(db => {
    db.tables.profiles.push({id: 'client-fixture', role: 'client', company: 'Agence fictive'});
    db.tables.campaigns.push({id: 'campaign-fixture', client_id: 'client-fixture', name: 'Brouillon'});
    db.tables.client_tasks.push({id: 'task-fixture', client_id: 'client-fixture', title: 'Relire', is_completed: false});
  }, options);
}

test('download restores all agency tables into a fresh installation without connection files', async t => {
  const source = await fixture(t), target = await fixture(t);
  await seed(source);
  await writeFile(join(source.dataDir, 'integrations.json'), JSON.stringify({token: 'SYNTHETIC_CONNECTION_ONLY'}));
  await writeFile(join(source.dataDir, 'agents.json'), JSON.stringify({jobs: ['SYNTHETIC_HISTORY_ONLY']}));
  const response = await exportLocalData(exportRequest(), source);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition')!, /attachment; filename="leadfactory-data-.*\.json"/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const text = await response.text(), snapshot = JSON.parse(text);
  assert.ok(!text.includes('SYNTHETIC_CONNECTION_ONLY'));
  assert.ok(!text.includes('SYNTHETIC_HISTORY_ONLY'));
  const restored = await importLocalData(request(snapshot), target);
  assert.equal(restored.status, 200);
  assert.deepEqual(await localTransaction(db => db.tables.campaigns, target, false), snapshot.database.tables.campaigns);
  assert.equal((await localTransaction(db => db.tables.client_tasks, target, false))[0].client_id, 'client-fixture');
  assert.equal(JSON.parse(await readFile(join(target.dataDir, 'db.json'), 'utf8')).tables.profiles[0].id, LOCAL_ADMIN_ID);
});

test('restoration never overwrites an existing installation, including simultaneous imports', async t => {
  const source = await fixture(t), target = await fixture(t);
  await seed(source);
  const snapshot = await (await exportLocalData(exportRequest(), source)).json();
  const results = await Promise.all([importLocalData(request(snapshot), target), importLocalData(request(snapshot), target)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const before = await readFile(join(target.dataDir, 'db.json'), 'utf8');
  assert.equal((await importLocalData(request(snapshot), target)).status, 409);
  assert.equal(await readFile(join(target.dataDir, 'db.json'), 'utf8'), before);
});

test('invalid formats, credentials, duplicate ids and unknown tables leave the target empty', async t => {
  const source = await fixture(t), target = await fixture(t);
  await seed(source);
  const snapshot = await (await exportLocalData(exportRequest(), source)).json();
  const invalid = [
    {...snapshot, version: 99}, {...snapshot, format: 'other-app'},
    {...snapshot, database: {...snapshot.database, tables: {}}},
  ];
  for (const alter of [
    (x: any) => { x.database.tables.tokens = []; },
    (x: any) => { x.database.tables.client_tasks.push(null); },
    (x: any) => { x.database.tables.client_tasks.push({...x.database.tables.client_tasks[0]}); },
    (x: any) => { x.database.tables.client_tasks[0].credentials = {value: 'SYNTHETIC'}; },
    (x: any) => { x.database.tables.profiles[0].role = 'client'; },
    (x: any) => { x.database.tables.profiles = x.database.tables.profiles.slice(1); },
    (x: any) => { x.database.tables.client_tasks[0].id = ''; },
  ]) {const copy = structuredClone(snapshot); alter(copy); invalid.push(copy);}
  for (const data of invalid) assert.equal((await importLocalData(request(data), target)).status, 400);
  assert.equal((await localTransaction(db => db.tables.profiles, target, false)).length, 1);
  const malformed = new Request('http://localhost:14320/api/starter/import', {method: 'POST', body: '{'});
  assert.equal((await importLocalData(malformed, target)).status, 400);
});

test('foreign origins, hosts, cross-site requests and remote mode cannot export or import', async t => {
  const options = await fixture(t);
  const snapshot = await (await exportLocalData(exportRequest(), options)).json();
  const foreignHeaders: Record<string, string>[] = [{origin: 'https://foreign.example'}, {host: 'foreign.example'}, {'sec-fetch-site': 'cross-site'}];
  for (const headers of foreignHeaders) {
    assert.equal((await importLocalData(request(snapshot, headers), options)).status, 403);
    assert.equal((await exportLocalData(new Request(exportRequest(), {headers}), options)).status, 403);
  }
  const previous = process.env.LEADFACTORY_DATA_MODE;
  process.env.LEADFACTORY_DATA_MODE = 'supabase';
  try {
    assert.equal((await exportLocalData(exportRequest(), options)).status, 403);
    assert.equal((await importLocalData(request(snapshot), options)).status, 403);
  } finally {if (previous === undefined) delete process.env.LEADFACTORY_DATA_MODE; else process.env.LEADFACTORY_DATA_MODE = previous;}
});

test('oversized input is refused before any persistence, with and without content length', async t => {
  const options = await fixture(t);
  assert.equal((await importLocalData(request({}, {'content-length': '25000001'}), options)).status, 413);
  const huge = new Request('http://localhost:14320/api/starter/import', {method: 'POST', body: ' '.repeat(25000001)});
  assert.equal((await importLocalData(huge, options)).status, 413);
  assert.equal((await localTransaction(db => db.tables.client_tasks, options, false)).length, 0);
});

test('resource HTML and links are validated before accepting a backup', async t => {
  const source = await fixture(t), target = await fixture(t);
  const snapshot = await (await exportLocalData(exportRequest(), source)).json();
  const resource = {id: 'resource-fixture', title: 'Guide', body_text: 'Brief & review', body_html: '<p>Brief &amp; review</p>', document_url: 'https://example.com/guide'};
  snapshot.database.tables.team_resources.push(resource);
  const attack = structuredClone(snapshot); attack.database.tables.team_resources[0].body_html = '<img src=x onerror=alert(1)>';
  assert.equal((await importLocalData(request(attack), target)).status, 400);
  const badLink = structuredClone(snapshot); badLink.database.tables.team_resources[0].document_url = 'javascript:alert(1)';
  assert.equal((await importLocalData(request(badLink), target)).status, 400);
  assert.equal((await importLocalData(request(snapshot), target)).status, 200);
});
