# Revert the dsh-klee-theme install
#
# Restores the desktop profile's manifest and lockfile from the snapshots the
# install took, and removes the copied plugin directory. Run with:
#
#   pwsh -File "D:\study\dsh-genshin-klee-theme\dsh-klee-theme\scripts\uninstall.ps1"
#
# Nothing here touches anything else in the profile.

$ErrorActionPreference = 'Stop'

$profile = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$backup = Join-Path $profile '.klee-theme-backup'
$installed = Join-Path $profile 'node_modules\dsh-klee-theme'

if (-not (Test-Path $backup)) { throw "no backup directory at $backup — nothing to revert" }

foreach ($pair in @(@('package.json', 'package.json.bak'), @('pnpm-lock.yaml', 'pnpm-lock.yaml.bak'))) {
  $from = Join-Path $backup $pair[1]
  if (Test-Path $from) {
    Copy-Item -LiteralPath $from -Destination (Join-Path $profile $pair[0]) -Force
    Write-Host "restored $($pair[0]) from $($pair[1])"
  }
}

if (Test-Path $installed) {
  Remove-Item -LiteralPath $installed -Recurse -Force
  Write-Host "removed $installed"
}

Write-Host ''
Write-Host 'Reverted. Restart DSH to drop the theme from the running composition.'
