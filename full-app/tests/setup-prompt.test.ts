import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPrompt, SETUP_TASK} from '../runtime/setup-prompt.mjs';

test('one agent setup prompt covers local configuration, Meta and external Slack without exposing secrets', () => {
  const prompt = setupPrompt();
  assert.match(SETUP_TASK, /setup/i);
  for (const text of ['AGENTS.md', 'docs/AGENT-SETUP.md', 'Meta', 'Slack Connect', '/api/starter/connections', 'NE PAS afficher', 'NEXT.md']) assert.ok(prompt.includes(text), text);
  assert.ok(!prompt.includes('http://127.0.0.1:14320'));
  assert.match(setupPrompt('slack'), /Connexion ciblée : Slack/);
  assert.match(setupPrompt('meta'), /Connexion ciblée : Meta/);
  assert.throws(() => setupPrompt('unknown'), /inconnu/);
});
