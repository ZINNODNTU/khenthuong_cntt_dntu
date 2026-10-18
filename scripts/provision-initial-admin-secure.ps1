$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$projectRef = 'nzoamsyazdafyqnsxkny'
$adminEmail = 'admin@dntu.edu.vn'
$credentialDir = Join-Path $env:LOCALAPPDATA 'CNTT-AwardReview'
$credentialFile = Join-Path $credentialDir 'admin-first-login.dpapi'

# Avoid silently changing the admin password during repeat executions.
if (Test-Path $credentialFile) {
  throw 'An encrypted first-login password already exists. Not resetting the account.'
}

$bytes = New-Object byte[] 24
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$password = 'Dntu!9' + ([BitConverter]::ToString($bytes)).Replace('-', '')
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
New-Item -ItemType Directory -Force -Path $credentialDir | Out-Null
$encrypted = ConvertFrom-SecureString $securePassword
[System.IO.File]::WriteAllText($credentialFile, $encrypted, [Text.Encoding]::UTF8)

try {
  # Uses the CLI's authenticated project scope to set the bootstrap secret
  # and the HTTPS admin Edge Function. Only status is printed, never password.
  & (Join-Path (Get-Location).Path 'CREATE_INITIAL_ADMIN.ps1') `
    -ProjectRef $projectRef `
    -Email $adminEmail `
    -FullName 'Quan tri he thong' `
    -Password $password `
    -NonInteractive
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    throw 'Admin bootstrap failed.'
  }
  Write-Host ''
  Write-Host 'ADMIN ACCOUNT PROVISIONED: admin@dntu.edu.vn' -ForegroundColor Green
  Write-Host 'Temporary password stored as Windows-user-encrypted DPAPI data.' -ForegroundColor Green
  Write-Host ('Credential path: ' + $credentialFile)
  Write-Host 'Reveal it LOCALLY using: .\scripts\show-admin-first-login.ps1'
} catch {
  Write-Host ('ADMIN BOOTSTRAP FAILED: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host ('Encrypted credential retained at: ' + $credentialFile)
  throw
} finally {
  $password = $null
  $securePassword = $null
  [Array]::Clear($bytes, 0, $bytes.Length)
}
