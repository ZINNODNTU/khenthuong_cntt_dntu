# Run interactively on the authorized CNTT Windows workstation.
# No credentials are accepted as command-line arguments or printed to output.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host ""
Write-Host "CNTT DNTU - Direct admin password reset" -ForegroundColor Cyan
Write-Host "Project: nzoamsyazdafyqnsxkny"
Write-Host "Account: admin@dntu.edu.vn"
Write-Host "This uses Supabase Admin API directly; NO recovery email."
Write-Host ""
Write-Host "Obtain the existing SECRET KEY in Supabase Dashboard > Project Settings > API Keys > Secret keys."
Write-Host "It must only be pasted into this local terminal, not into chat or files." -ForegroundColor Yellow
$approval = Read-Host "Type RESET to confirm changing this specific admin account"
if ($approval -cne "RESET") { Write-Host "Cancelled. No changes made."; exit 2 }
$key = Read-Host "Paste Supabase secret key (hidden input)" -AsSecureString
$password = Read-Host "Enter the new admin password (hidden input)" -AsSecureString
function Reveal-SecureString([Security.SecureString]$value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
try {
  $env:CNTT_RESET_SUPABASE_SECRET = Reveal-SecureString $key
  $env:CNTT_RESET_ADMIN_PASSWORD = Reveal-SecureString $password
  if (-not ($env:CNTT_RESET_SUPABASE_SECRET.StartsWith("sb_secret_") -or $env:CNTT_RESET_SUPABASE_SECRET.StartsWith("eyJ"))) {
    throw "Supabase secret key format invalid. Did you paste a publishable key instead?"
  }
  & node (Join-Path $PSScriptRoot "reset-admin-password-direct.mjs")
  if ($LASTEXITCODE -ne 0) { throw "The administrative password change failed. Review the non-secret error above." }
} finally {
  Remove-Item Env:CNTT_RESET_SUPABASE_SECRET -ErrorAction SilentlyContinue
  Remove-Item Env:CNTT_RESET_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $key.Dispose()
  $password.Dispose()
}
