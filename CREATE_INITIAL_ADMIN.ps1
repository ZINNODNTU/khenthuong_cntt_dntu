param(
  [string]$ProjectRef = "",
  [string]$Email = "",
  [string]$FullName = "",
  [string]$Password = "",
  [string]$BootstrapSecret = "",
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function ConvertFrom-SecureStringPlainText {
  param(
    [Parameter(Mandatory = $true)]
    [Security.SecureString]$SecureValue
  )

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $SecureValue
  )

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Normalize-ProjectRef {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $inputValue = $Value.Trim().TrimEnd("/")

  if ($inputValue -match "dashboard/project/([a-z0-9]+)") {
    return $Matches[1]
  }

  if ($inputValue -match "^https?://([a-z0-9]+)\.supabase\.co") {
    return $Matches[1]
  }

  if ($inputValue -match "^[a-z0-9]{10,}$") {
    return $inputValue
  }

  throw "Invalid Project Ref."
}

function New-RandomHex {
  param([int]$ByteLength = 32)

  $bytes = New-Object byte[] $ByteLength
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($bytes)
  }
  finally {
    $rng.Dispose()
  }

  return -join (
    $bytes | ForEach-Object { $_.ToString("x2") }
  )
}

function Invoke-SupabaseCli {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase @Arguments
  }
  elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
    & pnpm dlx supabase@latest @Arguments
  }
  else {
    throw "Supabase CLI or pnpm was not found."
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI command failed."
  }
}

if (-not $NonInteractive) {
  if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
    $ProjectRef = Read-Host "Enter Supabase Project Ref or URL"
  }

  if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = Read-Host "Enter admin email @dntu.edu.vn"
  }

  if ([string]::IsNullOrWhiteSpace($FullName)) {
    $FullName = Read-Host "Enter admin full name"
  }

  if ([string]::IsNullOrWhiteSpace($Password)) {
    $securePassword = Read-Host `
      "Enter admin password" `
      -AsSecureString

    $Password = ConvertFrom-SecureStringPlainText `
      -SecureValue $securePassword
  }
}

$ProjectRef = Normalize-ProjectRef -Value $ProjectRef
$Email = $Email.Trim().ToLowerInvariant()
$FullName = $FullName.Trim()

if (-not $Email.EndsWith("@dntu.edu.vn")) {
  throw "Admin email must use @dntu.edu.vn."
}

if ($FullName.Length -lt 2) {
  throw "Full name is invalid."
}

if (
  $Password.Length -lt 10
  -or $Password -notmatch "[A-Za-z]"
  -or $Password -notmatch "\d"
) {
  throw "Password must contain at least 10 characters, letters and numbers."
}

if ([string]::IsNullOrWhiteSpace($BootstrapSecret)) {
  $BootstrapSecret = New-RandomHex -ByteLength 32
}

Write-Host ""
Write-Host "Initial admin" -ForegroundColor Cyan
Write-Host "  Project Ref : $ProjectRef"
Write-Host "  Email       : $Email"
Write-Host "  Full name   : $FullName"
Write-Host ""

if (-not $NonInteractive) {
  $confirmation = Read-Host "Type Y to continue"
  if ($confirmation.ToUpperInvariant() -ne "Y") {
    throw "Operation cancelled."
  }
}

Invoke-SupabaseCli -Arguments @("projects", "list")

Invoke-SupabaseCli -Arguments @(
  "secrets",
  "set",
  "ADMIN_BOOTSTRAP_SECRET=$BootstrapSecret",
  "ALLOWED_REVIEWER_DOMAIN=dntu.edu.vn",
  "--project-ref",
  $ProjectRef
)

Invoke-SupabaseCli -Arguments @(
  "functions",
  "deploy",
  "bootstrap-admin",
  "--no-verify-jwt",
  "--project-ref",
  $ProjectRef
)

$payload = @{
  email = $Email
  password = $Password
  fullName = $FullName
}

$body = $payload | ConvertTo-Json -Depth 5
$bodyBytes = [Text.Encoding]::UTF8.GetBytes($body)

$result = Invoke-RestMethod `
  -Method Post `
  -Uri "https://$ProjectRef.supabase.co/functions/v1/bootstrap-admin" `
  -Headers @{
    "x-bootstrap-secret" = $BootstrapSecret
  } `
  -ContentType "application/json; charset=utf-8" `
  -Body $bodyBytes

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "Login email: $Email" -ForegroundColor Green
$result | ConvertTo-Json -Depth 8
