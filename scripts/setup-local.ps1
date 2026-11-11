param([string]$NodeVersion = '24.22.1')

$ErrorActionPreference = 'Stop'
if ($NodeVersion -notmatch '^24\.\d+\.\d+$') {
    throw 'Choose an exact Node 24 LTS version.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$packageName = "node-v$NodeVersion-win-$architecture"
$runtimeRoot = Join-Path $toolsRoot $packageName
$nodeExecutable = Join-Path $runtimeRoot 'node.exe'
$npmCli = Join-Path $runtimeRoot 'node_modules\npm\bin\npm-cli.js'
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null

if (!(Test-Path -LiteralPath $nodeExecutable) -or !(Test-Path -LiteralPath $npmCli)) {
    $archiveName = "$packageName.zip"
    $archivePath = Join-Path $toolsRoot $archiveName
    $checksumPath = Join-Path $toolsRoot "node-v$NodeVersion-SHASUMS256.txt"
    $downloadRoot = "https://nodejs.org/dist/v$NodeVersion"
    Write-Host "Downloading Node $NodeVersion and npm from nodejs.org..."
    Invoke-WebRequest -UseBasicParsing -Uri "$downloadRoot/SHASUMS256.txt" -OutFile $checksumPath
    Invoke-WebRequest -UseBasicParsing -Uri "$downloadRoot/$archiveName" -OutFile $archivePath
    $escapedName = [regex]::Escape($archiveName)
    $checksumLine = Get-Content -LiteralPath $checksumPath | Where-Object { $_ -match "^[a-fA-F0-9]{64}\s+\*?$escapedName$" }
    if (@($checksumLine).Count -ne 1) { throw 'The official checksum entry was not found.' }
    $expectedHash = ($checksumLine.Trim() -split '\s+')[0]
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
    if ($actualHash -ne $expectedHash) { throw 'Node download checksum mismatch. Nothing was installed.' }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsRoot -Force
}

$actualVersion = & $nodeExecutable --version
if ($LASTEXITCODE -ne 0 -or $actualVersion -ne "v$NodeVersion") {
    throw 'The installed Node runtime did not pass its version check.'
}
$env:PATH = "$runtimeRoot;$env:PATH"
# Use the Windows trust store without disabling TLS certificate validation.
$env:NODE_USE_SYSTEM_CA = '1'
Push-Location -LiteralPath $projectRoot
try {
    & $nodeExecutable $npmCli ci --cache (Join-Path $toolsRoot 'npm-cache')
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
} finally {
    Pop-Location
}
Write-Host "Ready: Node $actualVersion, npm and locked app dependencies are installed in .tools."
Write-Host 'Double-click Start-Brassworks.cmd to open the app at http://localhost:5173.'
