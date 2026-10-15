#!/usr/bin/env python3
"""Real PTY checks on macOS/Linux. Fake providers never call an AI service."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pty
import re
import select
import shutil
import signal
import socket
import struct
import sys
import tempfile
import termios
import time

REPO = Path(__file__).resolve().parents[1]
NODE = shutil.which('node')
ANSI = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')
PROVIDER = '''#!/usr/bin/env node
import fs from 'node:fs';
const id=process.argv[1].split('/').pop(),args=process.argv.slice(2);
if(!process.env.QA_PROVIDERS.split(',').includes(id))process.exit(127);
if(args[0]==='--version'){console.log(id+' 1.2.3');process.exit(0);}
if(args[0]==='login'){console.log('Logged in using fixture');process.exit(0);}
if(args[0]==='auth'){console.log(JSON.stringify({loggedIn:true}));process.exit(0);}
fs.writeFileSync('handoff.json',JSON.stringify({id,cwd:process.cwd(),args}));
console.log('QA_CEO_OWNS_TERMINAL');
process.stdin.resume();process.stdin.once('data',()=>process.exit(Number(process.env.QA_AGENT_EXIT||0)));
'''


def scenario(providers, *, plain=False, no_agent=False, cancel=False, failed=False, background=False):
    with tempfile.TemporaryDirectory(prefix='lf-terminal-') as directory:
        root = Path(directory).resolve()
        for name in ['bin', 'docs', 'full-app/resources/agency-kit/agents', 'full-app/resources/agency-kit/skills', 'fake-bin']:
            (root / name).mkdir(parents=True, exist_ok=True)
        for name in ['AGENTS.md', 'docs/AGENT-START.md', 'bin/leadfactory.mjs']:
            (root / name).write_text('Fixture')
        (root / 'package.json').write_text('{"name":"leadfactory-os"}')
        (root / 'full-app/package.json').write_text('{}')
        (root / 'full-app/resources/agency-kit/agents/roster.json').write_text(json.dumps({'agents': [{'slug': 'ceo', 'name': 'CEO', 'roleSource': 'agents/roles/ceo.md'}]}))
        for name in ['codex', 'claude']:
            path = root / 'fake-bin' / name
            path.write_text(PROVIDER)
            path.chmod(0o755)
        os.symlink(NODE, root / 'fake-bin/node')
        if background:
            (root / 'full-app/package-lock.json').write_text('{}')
            fake_next = root / 'full-app/node_modules/next/dist/bin/next'
            fake_next.parent.mkdir(parents=True)
            fake_next.write_text("const fs=require('node:fs');fs.writeFileSync('../build-started',String(process.pid));process.on('SIGTERM',()=>{fs.writeFileSync('../build-stopped','yes');process.exit(0)});setInterval(()=>{},1000);")
            (root / 'full-app/node_modules/.leadfactory-lock').write_text(hashlib.sha256(b'{}').hexdigest())
        env = {**os.environ, 'PATH': str(root / 'fake-bin'), 'TERM': 'xterm-256color', 'QA_PROVIDERS': providers,
               'QA_AGENT_EXIT': '7' if failed else '0', 'CODEX_HOME': str(root / 'no-codex'), 'CLAUDE_CONFIG_DIR': str(root / 'no-claude')}
        env.pop('NO_COLOR', None)
        args = [NODE, str(REPO / 'bin/leadfactory.mjs'), '--project', str(root), '--no-app', '--no-open']
        if background:
            args.remove('--no-app')
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', 0))
                port = probe.getsockname()[1]
            args.extend(['--no-sops', '--port', str(port)])
        if plain:
            args.append('--plain')
        if no_agent:
            args.append('--no-agent')
        pid, fd = pty.fork()
        if pid == 0:
            os.execve(NODE, args, env)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 110, 0, 0))
        raw, offset, reaped = b'', 0, False

        def wait_for(text):
            nonlocal raw, offset
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                clean = ANSI.sub('', raw.decode(errors='replace'))
                position = clean.find(text, offset)
                if position >= 0:
                    offset = position + len(text)
                    return
                if select.select([fd], [], [], 0.1)[0]:
                    try:
                        chunk = os.read(fd, 65536)
                    except OSError:
                        break
                    if not chunk:
                        break
                    raw += chunk
            raise AssertionError('Missing ' + repr(text) + '\n' + ANSI.sub('', raw.decode(errors='replace'))[-5000:])

        def send(value):
            os.write(fd, value)

        try:
            expected = 'claude' if providers == 'codex,claude' else providers
            if providers == 'codex,claude':
                wait_for('Votre assistant personnel')
                send(b'\x1b[B\r' if not plain else b'2\r')
            wait_for('Nom de votre agence')
            send(b'Agence QA\r')
            for question in ['Votre offre', 'Votre client idéal', 'Votre premier objectif']:
                wait_for(question)
                send(b'\r')
            if providers and not no_agent:
                wait_for('QA_CEO_OWNS_TERMINAL')
                handoff = json.loads((root / 'handoff.json').read_text())
                assert handoff['id'] == expected, handoff
                assert handoff['cwd'] == str(root), handoff
                prompt = handoff['args'][-1]
                assert 'Tu es le CEO' in prompt and 'Agence QA' in prompt and 'startup.json' in prompt
                assert 'AGENT-START.md' in prompt and 'setup' in prompt
                if background:
                    deadline = time.monotonic() + 10
                    while not (root / 'build-started').exists() and time.monotonic() < deadline:
                        time.sleep(0.05)
                    assert (root / 'build-started').exists(), 'Background build was not started'
                    assert json.loads((root / '.leadfactory/startup.json').read_text())['app'] == 'preparing'
                send(b'finish\r')
                if failed:
                    wait_for("s'est arrêté (7)")
            wait_for('Parler à mon CEO')
            if cancel:
                send(b'\x03')
            elif plain:
                send(b'10\r')
            else:
                # Scroll from first to final item, then select Quitter.
                send(b'\x1b[A\r')
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                done, status = os.waitpid(pid, os.WNOHANG)
                if done:
                    reaped = True
                    assert os.waitstatus_to_exitcode(status) == (130 if cancel else 0), status
                    break
                if select.select([fd], [], [], 0.05)[0]:
                    try:
                        raw += os.read(fd, 65536)
                    except OSError:
                        pass
            assert reaped, 'Factory did not exit'
            if plain:
                assert b'\x1b[' not in raw, 'ANSI present in --plain mode'
            if not providers or no_agent:
                assert not (root / 'handoff.json').exists()
            if background:
                assert (root / 'build-stopped').read_text() == 'yes', 'Build worker survived Factory shutdown'
                assert not (root / '.leadfactory/install.lock').exists()
                assert json.loads((root / '.leadfactory/startup.json').read_text())['app'] == 'stopped'
            print('PASS', 'background' if background else '', providers or 'manual', 'plain' if plain else 'styled', 'cancel' if cancel else '', 'no-agent' if no_agent else '', 'provider-failure' if failed else '')
        finally:
            if not reaped:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
            os.close(fd)
            if background and (root / 'build-started').exists() and not (root / 'build-stopped').exists():
                try:
                    os.kill(int((root / 'build-started').read_text()), signal.SIGKILL)
                except ProcessLookupError:
                    pass


if __name__ == '__main__':
    scenario('codex')
    scenario('claude')
    scenario('codex,claude')
    scenario('codex,claude', plain=True)
    scenario('')
    scenario('codex', no_agent=True)
    scenario('codex', cancel=True)
    scenario('codex', failed=True)

    scenario('codex', background=True)
