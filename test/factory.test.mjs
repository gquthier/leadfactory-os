import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseArgs, normalizeProfile, saveProfile, loadProfile, contextForAgent,
  agentCommand, launchAgent, findProject, cloneProject, doctor} from '../lib/factory.mjs';

const sample = {agency: 'Agence Exemple', offer: 'RDV B2B', audience: 'PME industrielles',
  objective: 'Préparer une première offre', provider: 'codex', language: 'fr', port: 14320};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'lf-factory-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  for (const dir of ['bin', 'docs', 'full-app/resources/agency-kit/agents', 'full-app/resources/agency-kit/skills/example']) {
    await mkdir(join(root, dir), {recursive: true});
  }
  await writeFile(join(root, 'package.json'), JSON.stringify({name: 'leadfactory-oss'}));
  await writeFile(join(root, 'full-app/package.json'), '{}');
  await writeFile(join(root, 'bin/leadfactory.mjs'), '');
  await writeFile(join(root, 'AGENTS.md'), '# Agent instructions');
  await writeFile(join(root, 'docs/AGENT-START.md'), '# Start');
  await writeFile(join(root, 'full-app/resources/agency-kit/agents/roster.json'), JSON.stringify({agents: [{slug: 'ceo', name: 'CEO', roleSource: 'agents/roles/ceo.md', coreSkills: ['example']}]}));
  await writeFile(join(root, 'full-app/resources/agency-kit/skills/example/SKILL.md'), '# Example');
  return realpath(root);
}

test('CLI arguments support agent automation and reject mistakes', () => {
  assert.deepEqual(parseArgs(['context', '--json', '--project', '/tmp/a b']), {command: 'context', json: true, project: '/tmp/a b'});
  assert.equal(parseArgs([]).command, 'menu');
  assert.equal(parseArgs(['init', 'my-agency', '--no-onboard']).directory, 'my-agency');
  assert.equal(parseArgs(['start', '--port', '14321']).port, 14321);
  for (const args of [['--wat'], ['start', '--port', '0'], ['agent', '--provider'], ['wat'], ['start', 'extra']]) {
    assert.throws(() => parseArgs(args));
  }
});

test('agency onboarding validates only business context and never stores unknown keys', () => {
  assert.equal(normalizeProfile(sample).agency, sample.agency);
  assert.equal(normalizeProfile({...sample, agency: '  Agence  '}).agency, 'Agence');
  for (const bad of [{...sample, agency: ''}, {...sample, provider: 'unknown'}, {...sample, port: -1},
    {...sample, apiKey: 'secret'}, {...sample, language: 'xx'}, {...sample, offer: 'x'.repeat(2001)}]) {
    assert.throws(() => normalizeProfile(bad));
  }
});

test('onboarding is resumable and preserves agent decisions and next action', async t => {
  const root = await fixture(t);
  assert.equal(await loadProfile(root), null);
  await saveProfile(root, sample);
  await writeFile(join(root, '.leadfactory/NEXT.md'), 'Deliver the reviewed offer.');
  await saveProfile(root, {...sample, agency: 'New name'});
  assert.equal((await loadProfile(root)).agency, 'New name');
  assert.equal(await readFile(join(root, '.leadfactory/NEXT.md'), 'utf8'), 'Deliver the reviewed offer.');
  assert.match(await readFile(join(root, '.leadfactory/CONTEXT.md'), 'utf8'), /New name/);
  await writeFile(join(root, '.leadfactory/profile.json'), '{broken');
  await assert.rejects(loadProfile(root), /profil|JSON/i);
});

test('onboarding refuses a workspace symlink instead of writing outside the project', async t => {
  const root = await fixture(t), other = await fixture(t);
  await symlink(other, join(root, '.leadfactory'), 'dir');
  await assert.rejects(saveProfile(root, sample), /symbolique/i);
});

test('agents receive an ordered context map, local agency and only the selected role', async t => {
  const root = await fixture(t);
  await saveProfile(root, sample);
  const context = await contextForAgent(root, {role: 'ceo', task: 'Préparer mon offre'});
  assert.equal(context.profile.agency, sample.agency);
  assert.equal(context.skills.length, 1);
  assert.equal(context.roles.length, 1);
  assert.match(context.prompt, /AGENTS.md/);
  assert.match(context.prompt, /docs\/AGENT-START.md/);
  assert.match(context.prompt, /Préparer mon offre/);
  assert.match(context.prompt, /agents\/roles\/ceo.md/);
  await assert.rejects(contextForAgent(root, {role: '../../outside'}), /Rôle/);
});

test('default agent mission is the same setup prompt as the interface; custom tasks stay explicit', async t => {
  const {setupPrompt} = await import('../full-app/runtime/setup-prompt.mjs');
  const root = await fixture(t);
  const context = await contextForAgent(root);
  assert.ok(context.prompt.includes(setupPrompt()));
  const custom = await contextForAgent(root, {task: 'Mon livrable précis'});
  assert.ok(!custom.prompt.includes(setupPrompt()));
  assert.match(custom.prompt, /Mon livrable précis/);
});

test('agent arguments keep hostile text literal and preserve user permission/model settings', () => {
  const prompt = 'Read $(touch /tmp/no) `echo no` ; --dangerously-skip-permissions';
  assert.deepEqual(agentCommand('codex', '/tmp/a b', prompt), {command: 'codex', args: ['-C', '/tmp/a b', prompt], cwd: '/tmp/a b'});
  assert.deepEqual(agentCommand('claude', '/tmp/a b', prompt).args, [prompt]);
  assert.throws(() => agentCommand('other', '/tmp', prompt));
});

test('agent handoff launches an executable in the project and propagates failure', async t => {
  const root = await fixture(t);
  const stub = join(root, 'fake-agent.mjs');
  await writeFile(stub, `import fs from 'node:fs';fs.writeFileSync('handoff.json',JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));process.exit(Number(process.env.FIXTURE_EXIT||0));`);
  await launchAgent({command: process.execPath, args: [stub, 'literal $HOME'], cwd: root}, {stdio: 'ignore'});
  const saved = JSON.parse(await readFile(join(root, 'handoff.json'), 'utf8'));
  assert.equal(saved.cwd, root);
  assert.deepEqual(saved.args, ['literal $HOME']);
  await assert.rejects(launchAgent({command: process.execPath, args: [stub], cwd: root}, {stdio: 'ignore', env: {...process.env, FIXTURE_EXIT: '7'}}), /7/);
  await assert.rejects(launchAgent({command: join(root, 'missing'), args: [], cwd: root}, {stdio: 'ignore'}), /introuvable|ENOENT/);
});

test('project discovery works from a subdirectory and refuses an unrelated folder', async t => {
  const root = await fixture(t);
  assert.equal(await findProject(join(root, 'full-app')), root);
  await assert.rejects(findProject(tmpdir()), /projet|LeadFactory/);
});

test('init downloads a repository with its context and refuses overwriting a directory', async t => {
  const root = await fixture(t), parent = await mkdtemp(join(tmpdir(), 'lf-clone-'));
  t.after(() => rm(parent, {recursive: true, force: true}));
  const git = args => {
    const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
  };
  git(['init', '-b', 'main']); git(['add', '.']);
  git(['-c', 'user.email=test@example.invalid', '-c', 'user.name=Fixture', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture']);
  const target = join(parent, 'my agency');
  await cloneProject(target, {source: root, stdio: 'ignore'});
  assert.match(await readFile(join(target, 'AGENTS.md'), 'utf8'), /instructions/);
  await assert.rejects(cloneProject(target, {source: root, stdio: 'ignore'}), /existe/);
  await assert.rejects(cloneProject(join(parent, 'bad'), {ref: '--upload-pack=bad', source: root}), /révision/);
});

test('doctor reports missing prerequisites without launching inference', async t => {
  const root = await fixture(t);
  const called = [];
  const report = await doctor(root, {version: '22.11.0', probe: command => {called.push(command); return null;}});
  assert.equal(report.node.ok, false);
  assert.equal(report.agents.codex.installed, false);
  assert.equal(report.dependencies.installed, false);
  assert.deepEqual(called.sort(), ['claude', 'codex', 'git']);
});

test('public CLI supports onboarding and handoff as JSON without starting a model', async t => {
  const root = await fixture(t);
  const bin = fileURLToPath(new URL('../bin/leadfactory.mjs', import.meta.url));
  const profileFile = join(root, 'input.json');
  await writeFile(profileFile, JSON.stringify(sample));
  const cli = (...args) => spawnSync(process.execPath, [bin, ...args, '--project', root], {encoding: 'utf8'});
  const onboard = cli('onboard', '--profile', profileFile, '--json');
  assert.equal(onboard.status, 0, onboard.stderr);
  assert.equal(JSON.parse(onboard.stdout).agency, sample.agency);
  const handoff = cli('agent', '--provider', 'claude', '--print', '--json', '--port', '14321');
  assert.equal(handoff.status, 0, handoff.stderr);
  const output = JSON.parse(handoff.stdout);
  assert.equal(output.provider, 'claude');
  assert.match(output.prompt, /127\.0\.0\.1:14321/);
  assert.match(output.prompt, /AGENT-START/);
  const nonInteractive = cli('menu');
  assert.equal(nonInteractive.status, 1);
  assert.match(nonInteractive.stderr, /terminal/);
  const malformed = cli('start', '--port', '0');
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /port/);
  const context = cli('context', '--json');
  assert.equal(context.status, 0, context.stderr);
  assert.equal(JSON.parse(context.stdout).profile.agency, sample.agency);
  const check = cli('doctor', '--json');
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).context.roles, 1);
  assert.equal(cli('--help').status, 0);
  assert.match(cli('guide').stdout, /offre|agence/);
});

test('terminating a Factory session can abort its foreground agent', async t => {
  const root = await fixture(t), controller = new AbortController();
  const running = launchAgent({command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], cwd: root}, {stdio: 'ignore', signal: controller.signal});
  const timer = setTimeout(() => controller.abort(), 30);
  t.after(() => clearTimeout(timer));
  await assert.rejects(running, /aborted|abort/i);
});
