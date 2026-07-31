# Deploys the custom `ocl` binary (built from this fork) into npm's global bin
# directory, so `ocl` works from any shell / any directory and coexists with the
# official `opencode`.
#
# Runs:  1. link cached current-platform native deps (so --skip-install works)
#        2. bun run build --single --skip-install  (compile the current platform)
#        3. remove any stale launcher shims (ocl / ocl.cmd / ocl.ps1)
#        4. copy the freshly built ocl binary to the npm global bin dir
#
# Re-run this after `git rebase origin/dev` to refresh the deployed binary.
#
# Why --skip-install: build.ts's default install step fetches native deps for
# ALL platforms (--os="*" --cpu="*") for cross-compilation, which is slow and
# network-flaky. We only build the current platform, so we link the already-
# cached current-platform native packages and skip the global install.
$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$pkgDir = Join-Path $repo "packages\opencode"

# 1. Link cached current-platform native deps into package node_modules.
$cache = Join-Path $repo "node_modules\.bun"
$dstBase = Join-Path $pkgDir "node_modules\@opentui"
$nativePkgs = @(
  @{ pkg = "core-win32-x64"; ver = $null }
)
foreach ($p in $nativePkgs) {
  # resolve the latest cached version for this package
  $pattern = "@opentui+$($p.pkg)@*"
  $cached = Get-ChildItem (Join-Path $cache $pattern) -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
  if (-not $cached) { Write-Host "no cache for $($p.pkg), skipping link"; continue }
  $src = Join-Path $cached.FullName "node_modules\@opentui\$($p.pkg)"
  $dst = Join-Path $dstBase $p.pkg
  if (Test-Path $src) {
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    New-Item -ItemType Junction -Path $dst -Target $src -Force | Out-Null
    Write-Host "linked $($p.pkg) -> $($cached.Name)"
  }
}

# 2. Build a single binary for the current platform, skipping the cross-platform install.
#    Use a local models.dev snapshot when present (script/models-dev.json) so the
#    build does not depend on a live network fetch of models.dev/api.json.
$modelsCache = Join-Path $pkgDir "script\models-dev.json"
if (Test-Path $modelsCache) { $env:MODELS_DEV_API_JSON = $modelsCache }
& bun run --cwd $pkgDir build --single --skip-install
if ($LASTEXITCODE -ne 0) { throw "build failed" }

# 3. Locate the produced binary.
$binary = Get-ChildItem (Join-Path $pkgDir "dist\*\bin\ocl*") -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $binary) { throw "build produced no ocl binary under dist/*/bin" }

# 4. Deploy to the npm global bin dir (already on PATH), replacing stale shims.
$npmRoot = (npm config get prefix).Trim()
$dest = Join-Path $npmRoot $binary.Name
Remove-Item (Join-Path $npmRoot "ocl"), (Join-Path $npmRoot "ocl.cmd"), (Join-Path $npmRoot "ocl.ps1") -ErrorAction SilentlyContinue

# Check for a running ocl that would lock the deployed binary. Do NOT kill it
# automatically — surface the conflict so the user can close it deliberately.
$running = Get-Process ocl -ErrorAction SilentlyContinue
if ($running) {
  $ids = ($running | ForEach-Object { $_.Id }) -join ", "
  throw "ocl.exe is in use (PID $ids). Close the running ocl (e.g. its TUI window) and re-run this script."
}
Copy-Item $binary.FullName $dest -Force

Write-Host ""
Write-Host "Deployed $($binary.FullName) -> $(Join-Path $npmRoot $binary.Name)"
Write-Host "Version: $(& ocl --version)"
