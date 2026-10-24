import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

const project = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';
const runtimes = [{ name: windows ? 'Windows' : 'Ubuntu', wsl: false }];
if (windows && process.env.CODEX_SYNC_TEST_WSL_DISTRO) {
  runtimes.push({ name: 'Ubuntu (WSL)', wsl: true });
}
const remoteFile = '2026/10/24/remote.jsonl';
const localFile = '2026/10/24/local.jsonl';
const remoteContent = '{"message":"remote"}\n';
const localContent = '{"message":"local session with more content"}\n';
const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;

function output(result) {
  return `${result.error ?? ''}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

function fixture(t, runtime) {
  const root = mkdtempSync(path.join(tmpdir(), 'codex-sync test-'));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const globalConfig = path.join(root, 'gitconfig');
  writeFileSync(globalConfig, '');
  Object.assign(env, {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_ALLOW_PROTOCOL: 'file',
    GIT_TERMINAL_PROMPT: '0',
  });
  function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
      encoding: 'utf8', timeout: 60000, windowsHide: true, env, ...options,
    });
    assert.equal(result.error, undefined, output(result));
    assert.equal(result.signal, null, output(result));
    return result;
  }
  function git(cwd, ...args) {
    const result = run('git', ['-C', cwd, ...args]);
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${output(result)}`);
    return result.stdout.trim();
  }
  const linuxPaths = new Map();
  function linuxPath(nativePath) {
    if (!linuxPaths.has(nativePath)) {
      const result = run('wsl.exe', ['-d', process.env.CODEX_SYNC_TEST_WSL_DISTRO,
        '--exec', 'wslpath', '-a', '-u', nativePath]);
      assert.equal(result.status, 0, output(result));
      linuxPaths.set(nativePath, result.stdout.trim());
    }
    return linuxPaths.get(nativePath);
  }
  let wslScript;
  if (runtime.wsl) {
    wslScript = path.join(root, 'codex-sync');
    writeFileSync(wslScript, readFileSync(path.join(project, 'ubuntu/codex-sync'), 'utf8').replaceAll('\r\n', '\n'));
  }
  function sync(home) {
    const script = path.join(project, windows && !runtime.wsl ? 'windows/codex-sync.ps1' : 'ubuntu/codex-sync');
    if (runtime.wsl) {
      return run('wsl.exe', ['-d', process.env.CODEX_SYNC_TEST_WSL_DISTRO, '--exec', 'env',
        `HOME=${linuxPath(home)}`, 'GIT_CONFIG_NOSYSTEM=1', 'GIT_CONFIG_GLOBAL=/dev/null',
        'GIT_ALLOW_PROTOCOL=file', 'GIT_TERMINAL_PROMPT=0', 'bash', linuxPath(wslScript)]);
    }
    if (windows) {
      return run('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `& { Set-Variable -Name HOME -Value ${quotePowerShell(home)} -Force; & ${quotePowerShell(script)}; exit $LASTEXITCODE }`]);
    }
    return run('bash', [script], { env: { ...env, HOME: home } });
  }
  const write = (base, relative, content) => {
    const target = path.join(base, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };
  const bare = path.join(root, 'remote.git');
  mkdirSync(bare);
  git(bare, 'init', '--bare', '--initial-branch=main', '--template=');
  const seed = path.join(root, 'seed');
  mkdirSync(seed);
  git(seed, 'init', '--initial-branch=main', '--template=');
  function identity(repo) {
    git(repo, 'config', 'user.name', 'Codex Sync Test');
    git(repo, 'config', 'user.email', 'codex-sync@example.invalid');
    git(repo, 'config', 'core.autocrlf', 'false');
  }
  identity(seed);
  write(seed, `sessions/${remoteFile}`, remoteContent);
  git(seed, 'add', 'sessions');
  git(seed, 'commit', '-m', 'Seed session');
  git(seed, 'remote', 'add', 'origin', bare);
  git(seed, 'push', '-u', 'origin', 'main');
  function machine(name, clone = true) {
    const home = path.join(root, name);
    const repo = path.join(home, 'dev/codex-history');
    mkdirSync(home, { recursive: true });
    if (clone) {
      mkdirSync(path.dirname(repo), { recursive: true });
      git(root, 'clone', '--template=', bare, repo);
      identity(repo);
      // WSL Git needs a Linux remote path; the fixture itself remains on the host.
      if (runtime.wsl) git(repo, 'remote', 'set-url', 'origin', linuxPath(bare));
    }
    return { home, repo, sessions: path.join(home, '.codex/sessions') };
  }
  return { root, bare, git, write, machine, sync };
}

for (const runtime of runtimes) {
  describe(runtime.name, () => {
    test('missing repository fails before creating local sessions', (t) => {
      const f = fixture(t, runtime);
      const machine = f.machine('missing', false);
      const result = f.sync(machine.home);
      assert.notEqual(result.status, 0, output(result));
      assert.equal(existsSync(machine.sessions), false);
    });

    test('first import creates sessions without committing unchanged data', (t) => {
      const f = fixture(t, runtime);
      const machine = f.machine('first');
      const before = f.git(f.bare, 'rev-parse', 'main');
      assert.equal(existsSync(machine.sessions), false);
      const result = f.sync(machine.home);
      assert.equal(result.status, 0, output(result));
      assert.equal(readFileSync(path.join(machine.sessions, remoteFile), 'utf8'), remoteContent);
      assert.equal(f.git(machine.repo, 'rev-parse', 'HEAD'), before);
      assert.equal(f.git(f.bare, 'rev-parse', 'main'), before);
    });

    test('two machines exchange nested sessions through the remote', (t) => {
      const f = fixture(t, runtime);
      const a = f.machine('machine a');
      const b = f.machine('machine b');
      f.write(a.sessions, localFile, localContent);
      const first = f.sync(a.home);
      assert.equal(first.status, 0, output(first));
      assert.equal(readFileSync(path.join(a.sessions, remoteFile), 'utf8'), remoteContent);
      assert.equal(f.git(f.bare, 'show', `main:sessions/${localFile}`), localContent.trim());
      const replyFile = '2026/10/25/reply.jsonl';
      const reply = '{"message":"second machine"}\n';
      f.write(b.sessions, replyFile, reply);
      const second = f.sync(b.home);
      assert.equal(second.status, 0, output(second));
      assert.equal(readFileSync(path.join(b.sessions, localFile), 'utf8'), localContent);
      const third = f.sync(a.home);
      assert.equal(third.status, 0, output(third));
      assert.equal(readFileSync(path.join(a.sessions, replyFile), 'utf8'), reply);
      assert.equal(f.git(f.bare, 'show', `main:sessions/${remoteFile}`), remoteContent.trim());
      assert.equal(f.git(f.bare, 'show', `main:sessions/${replyFile}`), reply.trim());
      assert.equal(f.git(a.repo, 'status', '--porcelain'), '');
      assert.equal(f.git(b.repo, 'status', '--porcelain'), '');
    });

    test('no changes succeed even when the push destination is unavailable', (t) => {
      const f = fixture(t, runtime);
      const machine = f.machine('unchanged');
      const before = f.git(f.bare, 'rev-parse', 'main');
      f.git(machine.repo, 'remote', 'set-url', '--push', 'origin', path.join(f.root, 'absent.git'));
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = f.sync(machine.home);
        assert.equal(result.status, 0, output(result));
      }
      assert.equal(f.git(machine.repo, 'rev-parse', 'HEAD'), before);
      assert.equal(f.git(f.bare, 'rev-parse', 'main'), before);
    });

    test('same-name files preserve the existing OS-specific overwrite rule', (t) => {
      const f = fixture(t, runtime);
      const machine = f.machine('overwrite');
      const repoFile = path.join(machine.repo, 'sessions', remoteFile);
      const localPath = f.write(machine.sessions, remoteFile, localContent);
      utimesSync(repoFile, new Date('2020-01-01Z'), new Date('2020-01-01Z'));
      utimesSync(localPath, new Date('2021-01-01Z'), new Date('2021-01-01Z'));
      const result = f.sync(machine.home);
      assert.equal(result.status, 0, output(result));
      const expected = windows && !runtime.wsl ? localContent : remoteContent;
      assert.equal(readFileSync(localPath, 'utf8'), expected);
      assert.equal(readFileSync(repoFile, 'utf8'), expected);
      assert.equal(f.git(f.bare, 'show', `main:sessions/${remoteFile}`), expected.trim());
    });

    test('pull failure prevents both copy directions and any new commit', (t) => {
      const f = fixture(t, runtime);
      const machine = f.machine('pull failure');
      const before = f.git(machine.repo, 'rev-parse', 'HEAD');
      f.write(machine.sessions, localFile, localContent);
      f.git(machine.repo, 'remote', 'set-url', 'origin', path.join(f.root, 'absent.git'));
      const result = f.sync(machine.home);
      assert.notEqual(result.status, 0, output(result));
      assert.equal(existsSync(path.join(machine.sessions, remoteFile)), false);
      assert.equal(existsSync(path.join(machine.repo, 'sessions', localFile)), false);
      assert.equal(readFileSync(path.join(machine.sessions, localFile), 'utf8'), localContent);
      assert.equal(f.git(machine.repo, 'rev-parse', 'HEAD'), before);
      assert.equal(f.git(f.bare, 'rev-parse', 'main'), before);
    });
  });
}
