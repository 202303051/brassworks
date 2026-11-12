$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$targetRoot = Join-Path $toolsRoot 'postgres-17.11-5'
$psql = Join-Path $targetRoot 'pgsql\bin\psql.exe'
$installedMarker = Join-Path $targetRoot 'install-complete.sha256'
if ((Test-Path -LiteralPath $psql) -and (Test-Path -LiteralPath $installedMarker)) {
    & $psql --version
    if ($LASTEXITCODE -ne 0) { throw 'The existing PostgreSQL runtime could not start.' }
    Write-Host 'Local PostgreSQL tools are ready. Run npm run test:database.'
    exit 0
}
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
$archiveName = 'postgresql-17.11-5-windows-x64-binaries.zip'
$archivePath = Join-Path $toolsRoot $archiveName
$url = "https://get.enterprisedb.com/postgresql/$archiveName"
$checksumPath = "$archivePath.sha256"
Write-Host 'Downloading official PostgreSQL 17 binaries for isolated local database checks...'
Invoke-WebRequest -UseBasicParsing -Uri "$url.sha256" -OutFile $checksumPath
$match = [regex]::Match((Get-Content -LiteralPath $checksumPath -Raw), '(?i)\b[a-f0-9]{64}\b')
if (!$match.Success) { throw 'The official PostgreSQL checksum was not found.' }
$complete = (Test-Path -LiteralPath $archivePath) -and ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -eq $match.Value)
if (!$complete) {
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        & curl.exe --fail --location --continue-at - --silent --show-error --output $archivePath $url
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL download failed; rerun to resume it.' }
    } else {
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $archivePath
    }
}
$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
if ($actualHash -ne $match.Value) { throw 'PostgreSQL archive checksum mismatch. Nothing was executed.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
$verifiedRoot = [System.IO.Path]::GetFullPath($targetRoot) + [System.IO.Path]::DirectorySeparatorChar
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -notmatch '^pgsql/(bin|lib|share)/' -or $entry.FullName.EndsWith('/')) { continue }
        $destination = [System.IO.Path]::GetFullPath((Join-Path $targetRoot $entry.FullName))
        if (!$destination.StartsWith($verifiedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive path.' }
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
    }
} finally {
    $archive.Dispose()
}
& $psql --version
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL tools could not start.' }
[System.IO.File]::WriteAllText($installedMarker, $actualHash)
Write-Host 'Installed only project-local PostgreSQL tools. No Windows service or firewall rule was created.'
Write-Host 'Run npm run test:database from Brassworks-Terminal.cmd.'
