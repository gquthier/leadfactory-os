import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

const bin = fileURLToPath(new URL('../bin/leadfactory.mjs', import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'lf-autostart-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  for (const folder of ['bin', 'docs', 'fake-bin', 'full-app/node_modules/next/dist/bin', 'full-app/resources/agency-kit/agents']) await mkdir(join(root, folder), {recursive: true});
  for (const file of ['AGENTS.md', 'docs/AGENT-START.md', 'bin/leadfactory.mjs']) await writeFile(join(root, file), 'fixture');
  await writeFile(join(root, 'package.json'), '{"name":"leadfactory-os"}');
  await writeFile(join(root, 'full-app/package.json'), '{}');
  await writeFile(join(root, 'full-app/package-lock.json'), '{}');
  await writeFile(join(root, 'full-app/resources/agency-kit/agents/roster.json'), '{"agents":[]}');
  // Real child processes and HTTP server; no dependency download or desktop browser in CI.
  await writeFile(join(root, 'npm.cjs'), `require('node:fs').appendFileSync('../npm-calls',process.argv.slice(2).join(' ')+'\\n');`);
  await writeFile(join(root, 'full-app/node_modules/next/dist/bin/next'), `
    const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
    if(process.argv[2]==='build'){fs.mkdirSync('.next',{recursive:true});fs.writeFileSync('.next/BUILD_ID','fixture');process.exit(0);}
    const app=fs.realpathSync('.'),workspaceId=crypto.createHash('sha256').update(app+'\\0'+path.join(app,'.local-data')).digest('hex').slice(0,24);
    const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'leadfactory',mode:'local',workspaceId}));});
    server.listen(Number(process.argv[process.argv.indexOf('-p')+1]),'127.0.0.1');
    process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
  `);
  for (const command of ['open', 'xdg-open']) await writeFile(join(root, 'fake-bin', command), `#!${process.execPath}
    const fs=require('node:fs');
    fetch(process.argv[2]).then(async response=>{if(!response.ok)process.exit(2);fs.appendFileSync(process.env.QA_BROWSER_FILE,JSON.stringify({url:process.argv[2],ready:await response.json()})+'\\n');}).catch(()=>process.exit(3));
  `, {mode: 0o755});
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return {root, port};
}
async function run(t, options = []) {
  const {root, port} = await fixture(t), browser = join(root, 'browser.json');
  const child = spawn(process.execPath, [bin, 'install', '--project', root, '--no-sops', '--port', String(port), ...options], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, PATH: join(root, 'fake-bin') + delimiter + process.env.PATH, npm_execpath: join(root, 'npm.cjs'), QA_BROWSER_FILE: browser},
  });
  let output = '';
  child.stdout.on('data', data => {output += data;}); child.stderr.on('data', data => {output += data;});
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({code, signal})));
  t.after(async () => {if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM'); await exited;});
  async function until(check) {
    for (let i = 0; i < 150; i++) {
      if (await check()) return;
      assert.equal(child.exitCode, null, `Factory exited before opening the software:\n${output}`);
      await delay(50);
    }
    assert.fail('Software did not start:\n' + output);
  }
  return {root, port, browser, child, exited, until};
}

test('install starts the software, opens a healthy page once and keeps it running', {skip: process.platform === 'win32'}, async t => {
  const session = await run(t);
  await session.until(() => readFile(session.browser).catch(() => null));
  const opened = JSON.parse(await readFile(session.browser));
  assert.equal(opened.url, `http://127.0.0.1:${session.port}/admin/start-here`);
  assert.equal(opened.ready.app, 'leadfactory');
  assert.equal(session.child.exitCode, null);
  assert.equal(await readFile(join(session.root, 'npm-calls'), 'utf8'), 'ci\n');
  session.child.kill('SIGTERM');
  assert.equal((await session.exited).code, 130);
  await assert.rejects(fetch(opened.url));
});

test('install --no-open runs the software without launching a browser', async t => {
  const session = await run(t, ['--no-open']);
  await session.until(async () => {try {return (await fetch(`http://127.0.0.1:${session.port}/api/starter/health`)).ok;} catch {return false;}});
  assert.equal(await readFile(session.browser).catch(() => null), null);
});

test('install --no-app remains a finite build-only command for automation', async t => {
  const session = await run(t, ['--no-app']);
  assert.equal((await session.exited).code, 0);
  assert.equal(await readFile(session.browser).catch(() => null), null);
  await assert.rejects(fetch(`http://127.0.0.1:${session.port}/api/starter/health`));
});
