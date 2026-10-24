import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

const project = fileURLToPath(new URL('../', import.meta.url));
const windows = process.platform === 'win32';
const runtimes = [{ name: windows ? 'Windows' : 'Ubuntu', windows, wsl: false }];
if (windows && process.env.CODEX_SYNC_TEST_WSL_DISTRO) {
  runtimes.push({ name: 'Ubuntu (WSL)', windows: false, wsl: true });
}
const psQuote = (value) => `'${value.replaceAll("'", "''")}'`;
const shQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const output = (r) => `${r.error ?? ''}\n${r.stdout ?? ''}\n${r.stderr ?? ''}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', timeout: 60000, windowsHide: true, ...options,
  });
  assert.equal(result.error, undefined, output(result));
  assert.equal(result.signal, null, output(result));
  return result;
}
function ok(result) {
  assert.equal(result.status, 0, output(result));
}
function fixture(t, runtime) {
  const root = mkdtempSync(path.join(tmpdir(), 'codex-install test-'));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const home = path.join(root, 'user home');
  const source = path.join(root, 'source checkout', runtime.windows ? 'windows' : 'ubuntu');
  mkdirSync(home, { recursive: true });
  mkdirSync(source, { recursive: true });
  for (const file of runtime.windows ? ['install.ps1', 'codex-sync.ps1', 'codex-sync.cmd'] : ['install.sh', 'codex-sync']) {
    writeFileSync(path.join(source, file), readFileSync(path.join(project, runtime.windows ? 'windows' : 'ubuntu', file), 'utf8').replaceAll('\r\n', '\n'));
  }
  function platformPath(value) {
    if (!runtime.wsl) return value;
    const result = run('wsl.exe', ['-d', process.env.CODEX_SYNC_TEST_WSL_DISTRO, '--exec', 'wslpath', '-a', '-u', value]);
    ok(result);
    return result.stdout.trim();
  }
  const quote = runtime.windows ? psQuote : shQuote;
  const homePath = platformPath(home);
  const sourcePath = platformPath(source);
  const destination = runtime.windows ? `${homePath}\\bin\\codex-sync` : `${homePath}/.local/bin/codex-sync`;
  const install = runtime.windows ? `& ${quote(`${sourcePath}\\install.ps1`)}` : `bash ${quote(`${sourcePath}/install.sh`)}`;
  function shell(body) {
    if (runtime.windows) {
      // The child restores User PATH even when installation or an assertion throws.
      return run('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', `
        $ErrorActionPreference = 'Stop'
        Set-Variable HOME ${quote(homePath)} -Force
        $env:USERPROFILE = ${quote(homePath)}
        $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment')
        $savedPath = $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $savedKind = if ($null -ne $savedPath) { $key.GetValueKind('Path') } else { $null }
        try { ${body} } finally {
          if ($null -eq $savedPath) { $key.DeleteValue('Path', $false) }
          else { $key.SetValue('Path', $savedPath, $savedKind) }
          $key.Dispose()
        }
      `], { cwd: root });
    }
    if (runtime.wsl) {
      return run('wsl.exe', ['-d', process.env.CODEX_SYNC_TEST_WSL_DISTRO, '--exec', 'env',
        `HOME=${homePath}`, 'bash', '-euc', `cd /tmp; ${body}`]);
    }
    return run('bash', ['-euc', body], { cwd: root, env: { ...process.env, HOME: home } });
  }
  return { home, source, sourcePath, destination, quote, install, shell };
}

for (const runtime of runtimes) {
  describe(`${runtime.name} installation`, { concurrency: false }, () => {
    test('command runs through PATH and sees source updates without reinstalling', (t) => {
      const f = fixture(t, runtime);
      if (runtime.windows) {
        ok(f.shell(`
          ${f.install}
          if ((Get-Item -LiteralPath ${f.quote(f.destination)}).LinkType -ne 'Junction') { throw 'Not a junction' }
          $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
          if ($userPath.Split(';') -notcontains ${f.quote(f.destination)}) { throw 'Missing persistent PATH' }
          $childHome = pwsh.exe -NoProfile -Command '$HOME'
          if ($childHome -ne $HOME) { throw 'Child HOME must be isolated before running sync' }
          codex-sync
          if ($LASTEXITCODE -ne 1) { throw 'Missing repository must fail through cmd' }
          Set-Content -LiteralPath ${f.quote(path.join(f.source, 'codex-sync.ps1'))} -Value "Write-Output 'updated-source'; exit 23"
          $result = codex-sync
          if ($LASTEXITCODE -ne 23 -or $result -ne 'updated-source') { throw 'Source update or exit code lost' }
          if (Test-Path -LiteralPath (Join-Path $HOME 'dev')) { throw 'Installer created a sync repository' }
        `));
      } else {
        ok(f.shell(`
          ${f.install}
          test -L ${f.quote(f.destination)}
          test "$(readlink ${f.quote(f.destination)})" = ${f.quote(`${f.sourcePath}/codex-sync`)}
          . "$HOME/.profile"
          if codex-sync; then exit 91; fi
          printf '#!/usr/bin/env bash\\necho updated-source\\nexit 23\\n' > ${f.quote(`${f.sourcePath}/codex-sync`)}
          set +e
          result=$(codex-sync); status=$?
          set -e
          test "$result" = updated-source
          test "$status" -eq 23
          test ! -e "$HOME/dev"
          PATH=/usr/bin:/bin bash --noprofile --rcfile "$HOME/.bashrc" -ic 'command -v codex-sync'
        `));
      }
    });

    test('reinstallation preserves existing settings and does not duplicate PATH', (t) => {
      const f = fixture(t, runtime);
      if (runtime.windows) {
        ok(f.shell(`
          $key.SetValue('Path', '%USERPROFILE%\\existing-user-path', [Microsoft.Win32.RegistryValueKind]::ExpandString)
          ${f.install}
          $first = $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
          $processPath = $env:Path
          ${f.install}
          $second = $key.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
          if ($first -ne $second -or $env:Path -ne $processPath) { throw 'PATH duplicated' }
          if ($second.Split(';') -notcontains '%USERPROFILE%\\existing-user-path') { throw 'Existing PATH lost' }
          if ($key.GetValueKind('Path') -ne 'ExpandString') { throw 'Existing PATH type lost' }
        `));
      } else {
        writeFileSync(path.join(f.home, '.profile'), '# existing profile without trailing newline');
        writeFileSync(path.join(f.home, '.bashrc'), '# existing bashrc\n');
        ok(f.shell(`
          ${f.install}
          cp "$HOME/.profile" "$HOME/profile-before"
          cp "$HOME/.bashrc" "$HOME/bashrc-before"
          ${f.install}
          cmp "$HOME/.profile" "$HOME/profile-before"
          cmp "$HOME/.bashrc" "$HOME/bashrc-before"
          . "$HOME/.profile"
          first=$PATH
          . "$HOME/.profile"
          test "$PATH" = "$first"
          command -v codex-sync
        `));
        assert.ok(readFileSync(path.join(f.home, '.profile'), 'utf8').startsWith('# existing profile without trailing newline\n'));
        assert.ok(readFileSync(path.join(f.home, '.bashrc'), 'utf8').startsWith('# existing bashrc\n'));
      }
    });

    for (const kind of ['file', 'directory', 'other link', 'dangling link']) {
      test(`existing ${kind} is preserved without changing PATH`, (t) => {
        const f = fixture(t, runtime);
        if (runtime.windows) {
          const other = path.join(f.home, 'other target');
          const create = kind === 'file'
            ? `Set-Content -LiteralPath ${f.quote(f.destination)} -Value 'keep-me'`
            : kind === 'directory'
              ? `New-Item -ItemType Directory -Path ${f.quote(f.destination)} | Out-Null`
              : `New-Item -ItemType Directory -Path ${f.quote(other)} | Out-Null
                 New-Item -ItemType Junction -Path ${f.quote(f.destination)} -Target ${f.quote(other)} | Out-Null
                 ${kind === 'dangling link' ? `Remove-Item -LiteralPath ${f.quote(other)}` : ''}`;
          ok(f.shell(`
            New-Item -ItemType Directory -Path (Split-Path ${f.quote(f.destination)}) | Out-Null
            ${create}
            $before = Get-Item -LiteralPath ${f.quote(f.destination)} -Force
            $userBefore = [Environment]::GetEnvironmentVariable('Path', 'User')
            $processBefore = $env:Path
            $failed = $false
            try { ${f.install} } catch { $failed = $true }
            if (-not $failed) { throw 'Conflict accepted' }
            $after = Get-Item -LiteralPath ${f.quote(f.destination)} -Force
            if ($after.LinkTarget -ne $before.LinkTarget -or $after.LinkType -ne $before.LinkType) { throw 'Existing link replaced' }
            if (${kind === 'file' ? `$true -and (Get-Content -LiteralPath ${f.quote(f.destination)}) -ne 'keep-me'` : '$false'}) { throw 'Existing file overwritten' }
            if ([Environment]::GetEnvironmentVariable('Path', 'User') -ne $userBefore -or $env:Path -ne $processBefore) { throw 'Conflict changed PATH' }
          `));
        } else {
          const other = `${f.destination}-other`;
          const create = kind === 'file' ? `printf keep-me > ${f.quote(f.destination)}`
            : kind === 'directory' ? `mkdir ${f.quote(f.destination)}`
              : `${kind === 'other link' ? `mkdir ${f.quote(other)};` : ''} ln -s ${f.quote(other)} ${f.quote(f.destination)}`;
          ok(f.shell(`
            mkdir -p "$HOME/.local/bin"
            ${create}
            printf '# keep profile\\n' > "$HOME/.profile"
            printf '# keep bashrc\\n' > "$HOME/.bashrc"
            if ${f.install}; then exit 92; fi
            test "$(cat "$HOME/.profile")" = '# keep profile'
            test "$(cat "$HOME/.bashrc")" = '# keep bashrc'
            ${kind === 'file' ? `test "$(cat ${f.quote(f.destination)})" = keep-me`
              : kind === 'directory' ? `test -d ${f.quote(f.destination)}; test ! -L ${f.quote(f.destination)}`
                : `test "$(readlink ${f.quote(f.destination)})" = ${f.quote(other)}`}
          `));
        }
      });
    }
  });
}
