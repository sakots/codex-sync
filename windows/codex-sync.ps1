$ErrorActionPreference = "Stop"

$Repo = Join-Path $HOME "dev\codex-history"
$Targets = @(
    @{
        Local = Join-Path $HOME ".codex\sessions"
        Repo = Join-Path $Repo "sessions"
        Path = "sessions"
    }
)
if (Test-Path (Join-Path $HOME ".omp\agent") -PathType Container) {
    $Targets += @{
        Local = Join-Path $HOME ".omp\agent\sessions"
        Repo = Join-Path $Repo "omp\sessions"
        Path = "omp/sessions"
    }
}

Write-Host "== Session sync =="

if (-not (Test-Path (Join-Path $Repo ".git"))) {
    Write-Host "ERROR: repo not found: $Repo" -ForegroundColor Red
    exit 1
}

foreach ($Target in $Targets) {
    New-Item -ItemType Directory -Force -Path $Target.Local, $Target.Repo | Out-Null
}

Push-Location $Repo

try {

Write-Host ""
Write-Host "[1/5] Pull remote changes"
git pull --rebase
if ($LASTEXITCODE -ne 0) {
    throw "git pull failed"
}

Write-Host ""
Write-Host "[2/5] Import repository sessions"

foreach ($Target in $Targets) {
    robocopy $Target.Repo $Target.Local /E /XO /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy import failed for $($Target.Path): $LASTEXITCODE"
    }
}

Write-Host ""
Write-Host "[3/5] Export local sessions"

foreach ($Target in $Targets) {
    robocopy $Target.Local $Target.Repo /E /XO /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy export failed for $($Target.Path): $LASTEXITCODE"
    }
}

Write-Host ""
Write-Host "[4/5] Commit changes"

git add -- ($Targets | ForEach-Object { $_.Path })

git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "No new session changes."
}
else {
    $HostName = $env:COMPUTERNAME
    $Now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    git commit -m "Sync sessions from $HostName at $Now"
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
