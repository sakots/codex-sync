#Requires -Version 7.0
$ErrorActionPreference = "Stop"

$Source = [IO.Path]::TrimEndingDirectorySeparator([IO.Path]::GetFullPath($PSScriptRoot))
$Bin = Join-Path $HOME "bin"
$Link = Join-Path $Bin "codex-sync"

try {
    $Existing = Get-Item -LiteralPath $Link -Force
}
catch [System.Management.Automation.ItemNotFoundException] {
    $Existing = $null
}
if ($null -ne $Existing) {
    if ($Existing.LinkType -ne "Junction" -or
        [IO.Path]::TrimEndingDirectorySeparator($Existing.LinkTarget) -ne $Source) {
        throw "Refusing to overwrite existing path: $Link"
    }
}
else {
    New-Item -ItemType Directory -Force -Path $Bin | Out-Null
    New-Item -ItemType Junction -Path $Link -Target $Source | Out-Null
}

$EnvironmentKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Environment")
try {
    $UserPath = $EnvironmentKey.GetValue("Path", $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    if (($UserPath -split ';') -notcontains $Link) {
        $Kind = if ($null -eq $UserPath) { [Microsoft.Win32.RegistryValueKind]::ExpandString } else { $EnvironmentKey.GetValueKind("Path") }
        $NewPath = if ([string]::IsNullOrEmpty($UserPath)) { $Link } else { "$Link;$UserPath" }
        $EnvironmentKey.SetValue("Path", $NewPath, $Kind)
    }
}
finally {
    $EnvironmentKey.Dispose()
}
if (($env:Path -split ';') -notcontains $Link) {
    $env:Path = "$Link;$env:Path"
}

Write-Host "Installed: $Link -> $Source"
Write-Host 'Run codex-sync in this PowerShell. Other applications may need sign out/sign in to reload User PATH.'
Write-Host 'If launched with pwsh -File, run this in the calling PowerShell:'
Write-Host '$env:Path = "$HOME\bin\codex-sync;$env:Path"'
