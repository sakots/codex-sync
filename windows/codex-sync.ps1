$ErrorActionPreference = "Stop"

$Repo = Join-Path $HOME "dev\codex-history"
$Local = Join-Path $HOME ".codex\sessions"
$RepoSessions = Join-Path $Repo "sessions"

Write-Host "== Codex session sync =="

if (-not (Test-Path (Join-Path $Repo ".git"))) {
    Write-Host "ERROR: repo not found: $Repo" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force $Local | Out-Null
New-Item -ItemType Directory -Force $RepoSessions | Out-Null

Push-Location $Repo

try {

Write-Host ""
Write-Host "[1/5] Pull remote changes"
git pull --rebase
if ($LASTEXITCODE -ne 0) {
    throw "git pull failed"
}

Write-Host ""
Write-Host "[2/5] Import repo sessions -> .codex"

robocopy `
    $RepoSessions `
    $Local `
    /E `
    /XO `
    /R:2 `
    /W:1 `
    /NFL `
    /NDL `
    /NJH `
    /NJS `
    /NP | Out-Null

if ($LASTEXITCODE -ge 8) {
    throw "robocopy import failed: $LASTEXITCODE"
}

Write-Host ""
Write-Host "[3/5] Export .codex sessions -> repo"

robocopy `
    $Local `
    $RepoSessions `
    /E `
    /XO `
    /R:2 `
    /W:1 `
    /NFL `
    /NDL `
    /NJH `
    /NJS `
    /NP | Out-Null

if ($LASTEXITCODE -ge 8) {
    throw "robocopy export failed: $LASTEXITCODE"
}

Write-Host ""
Write-Host "[4/5] Commit changes"

git add sessions

git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "No new session changes."
}
else {
    $HostName = $env:COMPUTERNAME
    $Now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    git commit -m "Sync Codex sessions from $HostName at $Now"
    if ($LASTEXITCODE -ne 0) {
        throw "git commit failed"
    }

    Write-Host ""
    Write-Host "[5/5] Push"

    git push
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed"
    }
}

    Write-Host ""
    Write-Host "Done."
}
finally {
    Pop-Location
}
