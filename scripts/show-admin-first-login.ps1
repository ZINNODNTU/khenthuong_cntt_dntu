$ErrorActionPreference = 'Stop'
$credentialFile = Join-Path $env:LOCALAPPDATA 'CNTT-AwardReview\admin-first-login.dpapi'
if (-not (Test-Path $credentialFile)) {
  Write-Host 'Khong tim thay mat khau tam. Lien he quan tri Supabase de dat lai mat khau.' -ForegroundColor Red
  exit 1
}
try {
  $secureValue = (Get-Content -Raw -Encoding UTF8 $credentialFile).Trim() | ConvertTo-SecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    Write-Host ''
    Write-Host 'DANG NHAP HE THONG XET KHEN THUONG' -ForegroundColor Cyan
    Write-Host 'Email: admin@dntu.edu.vn'
    Write-Host ('Mat khau TAM: ' + $plainText) -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Sau khi dang nhap, hay doi mat khau ngay; xoa file luu mat khau tam khi da doi.' -ForegroundColor Yellow
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
} catch {
  Write-Host 'Khong mo duoc mat khau tam. Hay chay bang cung tai khoan Windows da tao tai khoan admin.' -ForegroundColor Red
  exit 1
}
