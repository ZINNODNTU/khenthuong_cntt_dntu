# Supabase CLI interactive authorization. No tokens or passwords stored in this file.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$projectRef = 'nzoamsyazdafyqnsxkny'

Write-Host ''
Write-Host 'CONNECT SUPABASE CLI -- CNTT AWARD REVIEW' -ForegroundColor Cyan
Write-Host ('Workspace: ' + (Get-Location).Path)
Write-Host ('Project ref: ' + $projectRef) -ForegroundColor Cyan
Write-Host ''
Write-Host '1. CLI login: verify in Supabase browser using YOUR own account.' -ForegroundColor Yellow
Write-Host '   Copy the verification code from Supabase browser into THIS terminal.'
Write-Host '   Do not paste password, access token, database password in ChatGPT.'
Write-Host ''
& pnpm dlx supabase@latest login
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Login was not completed. No database changes were made.' -ForegroundColor Red
  return
}
Write-Host ''
Write-Host '2. Linking the specific requested project...' -ForegroundColor Yellow
& pnpm dlx supabase@latest link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Login succeeded, but linking failed. Check your project permissions.' -ForegroundColor Red
  return
}
Write-Host ''
Write-Host 'CONNECTED: Supabase CLI linked to ' -NoNewline -ForegroundColor Green
Write-Host $projectRef -ForegroundColor Green
Write-Host '3. The assistant can now inspect the project and plan non-destructive migrations.'
Write-Host '   This script does NOT push migrations or reset data.' -ForegroundColor Yellow
Write-Host ''
