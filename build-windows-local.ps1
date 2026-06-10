#Requires -Version 7
param(
    [switch]$SkipFrontend,
    [switch]$SkipSuwayomi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Need($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Required tool not found: $cmd"
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Step "Reading nix/versions.nix"
$nix = Get-Content "$Root\nix\versions.nix" -Raw
$MOKU_VERSION = if ($nix -match 'moku\s*=\s*"([^"]+)"')        { $Matches[1] } else { Write-Error "moku version not found" }
$SUWA_VERSION = if ($nix -match 'version\s*=\s*"([^"]+)"')     { $Matches[1] } else { Write-Error "suwayomi version not found" }
$SUWA_HASH    = if ($nix -match 'windowsHash\s*=\s*"([^"]+)"') { $Matches[1] } else { Write-Error "windowsHash not found" }
Write-Host "  moku=$MOKU_VERSION  suwayomi=$SUWA_VERSION"

Need "pnpm"; Need "cargo"; Need "node"

if (-not $SkipFrontend) {
    Step "pnpm install"
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Write-Error "pnpm install failed" }

    Step "Frontend build"
    $env:MOKU_TARGET = "static"
    pnpm build:static
    if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed" }
}

$BundleDir  = "$Root\src-tauri\binaries\suwayomi-bundle"
$ZipPath    = "$env:TEMP\suwayomi-windows-$SUWA_VERSION.zip"
$ExtractDir = "$env:TEMP\suwayomi-extracted-$SUWA_VERSION"

if (-not $SkipSuwayomi) {
    Step "Downloading Suwayomi v$SUWA_VERSION"
    $ZipUrl = "https://github.com/Suwayomi/Suwayomi-Server-preview/releases/download/v${SUWA_VERSION}/Suwayomi-Server-v${SUWA_VERSION}-windows-x64.zip"

    if (-not (Test-Path $ZipPath)) {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing
    }

    $actual = (Get-FileHash $ZipPath -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $SUWA_HASH.ToLower()) {
        Write-Error "Hash mismatch`n  expected: $SUWA_HASH`n  got:      $actual"
    }

    Step "Staging bundle"
    if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir

    $topDirs  = @(Get-ChildItem $ExtractDir -Directory)
    $topFiles = @(Get-ChildItem $ExtractDir -File)
    $SrcDir = if ($topDirs.Count -eq 1 -and $topFiles.Count -eq 0) { $topDirs[0].FullName } else { $ExtractDir }

    if (Test-Path $BundleDir) { Remove-Item $BundleDir -Recurse -Force }
    Copy-Item $SrcDir $BundleDir -Recurse

    $java = Get-ChildItem $BundleDir -Recurse -Filter "java.exe" | Where-Object { $_.FullName -match "jre.bin" } | Select-Object -First 1
    $jar  = Get-ChildItem $BundleDir -Recurse -Filter "Suwayomi-Server.jar" | Select-Object -First 1
    if (-not $java) { Write-Error "java.exe not found in staged bundle" }
    if (-not $jar)  { Write-Error "Suwayomi-Server.jar not found in staged bundle" }
    Write-Host "  java: $($java.FullName)"
    Write-Host "  jar:  $($jar.FullName)"
} elseif (-not (Test-Path $BundleDir)) {
    Write-Error "Bundle dir missing at $BundleDir — run without -SkipSuwayomi first"
}

Step "Patching tauri.conf.json"
$tauriConf = "$Root\src-tauri\tauri.conf.json"
$original  = Get-Content $tauriConf -Raw
Set-Content $tauriConf ($original -replace '"beforeBuildCommand":\s*"pnpm build"', '"beforeBuildCommand": ""') -NoNewline

Step "Tauri build"
$env:TAURI_SKIP_DEVSERVER_CHECK = "true"
pnpm tauri build --target x86_64-pc-windows-msvc --config src-tauri/tauri.windows.conf.json
$buildExit = $LASTEXITCODE

Set-Content $tauriConf $original -NoNewline

if ($buildExit -ne 0) { Write-Error "Tauri build failed (exit $buildExit)" }

Step "Artifacts"
$out = "$Root\src-tauri\target\x86_64-pc-windows-msvc\release\bundle"
$msi = Get-ChildItem "$out\msi"  -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
$exe = Get-ChildItem "$out\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "`nDone — Moku $MOKU_VERSION" -ForegroundColor Green
if ($msi) { Write-Host "  MSI: $($msi.FullName)" -ForegroundColor Yellow }
if ($exe) { Write-Host "  EXE: $($exe.FullName)" -ForegroundColor Yellow }
if (-not $msi -and -not $exe) { Write-Host "  No artifacts found in $out" -ForegroundColor Red }
