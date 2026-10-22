param(
  [switch]$Force,        # db push --accept-data-loss
  [switch]$ForceReset,   # db push --force-reset (XOA SACH DU LIEU)
  [switch]$NoPause       # khong cho bam Enter o cuoi (dung khi chay tu dong)
)

$ErrorActionPreference = "Stop"

# ===== CAU HINH =====
$AppDir      = "C:\quyhdp\nkdd-report\bvkhanhhoi_dieuduong"
$ServiceName = "NKDD-Report"
$Port        = 5433
$LogDir      = "C:\quyhdp\logs"
# ====================

function Invoke-Step {
  param([string]$Name, [scriptblock]$Cmd)
  Write-Host ">> $Name" -ForegroundColor Cyan
  & $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Loi o buoc '$Name' (exit code $LASTEXITCODE)"
  }
}

# Phai chay quyen Administrator de dieu khien service
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Hay mo PowerShell bang 'Run as administrator' roi chay lai." -ForegroundColor Red
  if (-not $NoPause) { Read-Host "Nhan Enter de dong" }
  exit 1
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Start-Transcript -Path "$LogDir\deploy_$stamp.log" | Out-Null

$ok = $false
try {
  # Chon co cho db push
  $pushArgs = @("")
  if ($ForceReset) {
    Write-Host "CANH BAO: --force-reset se XOA SACH toan bo du lieu database!" -ForegroundColor Red
    if ((Read-Host "Go RESET de xac nhan") -ne "RESET") { throw "Huy: chua xac nhan." }
    $pushArgs += "--force-reset"
  }
  elseif ($Force) {
    $pushArgs += "--accept-data-loss"
  }

  # Kiem tra service ton tai
  if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
    throw "Khong tim thay service '$ServiceName'."
  }

  Set-Location $AppDir

  Invoke-Step "git fetch" { git fetch origin main }
  Invoke-Step "git reset" { git reset --hard origin/main }
  git log -1 --format="Commit: %h %s"

  Write-Host ">> Dung service $ServiceName" -ForegroundColor Cyan
  Stop-Service $ServiceName -ErrorAction SilentlyContinue
  (Get-Service $ServiceName).WaitForStatus("Stopped", [TimeSpan]::FromSeconds(30))

  Invoke-Step "npm ci"          { npm ci }
  Invoke-Step "prisma generate" { npx prisma generate }
  Invoke-Step "prisma db push"  { npx prisma db push @pushArgs }
  Invoke-Step "prisma db seed"  { npx prisma db seed }
  Invoke-Step "npm run build"   { npm run build }

  $ok = $true
}
catch {
  Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
  if ($ok) {
    Start-Service $ServiceName
    Start-Sleep -Seconds 5
    $st = (Get-Service $ServiceName).Status
    if ($st -eq "Running") {
      Write-Host "Deploy OK, $ServiceName dang $st" -ForegroundColor Green
      netstat -ano | findstr ":$Port"
    }
    else {
      Write-Host "Deploy xong nhung $ServiceName dang $st. Xem log cua service." -ForegroundColor Red
    }
  }
  else {
    Write-Host "Deploy LOI, $ServiceName van dang TAT. Xem log: $LogDir\deploy_$stamp.log" -ForegroundColor Red
  }
  Stop-Transcript | Out-Null
  if (-not $NoPause) { Read-Host "Nhan Enter de dong cua so" }
}