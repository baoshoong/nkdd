$ErrorActionPreference = "Stop"

$AppDir      = "C:\quyhdp\nkdd-report\bvkhanhhoi_dieuduong"
$ServiceName = "NKDD-Report"

function Invoke-Step {
  param([string]$Name, [scriptblock]$Cmd)
  Write-Host ">> $Name" -ForegroundColor Cyan
  & $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Loi o buoc '$Name' (exit code $LASTEXITCODE)"
  }
}

Set-Location $AppDir

Invoke-Step "git fetch"  { git fetch origin main }
Invoke-Step "git reset"  { git reset --hard origin/main }
git log -1 --format="Commit: %h %s"

sc.exe stop $ServiceName | Out-Null
Start-Sleep -Seconds 5

$ok = $false
try {
  Invoke-Step "npm ci"                  { npm ci }
  Invoke-Step "prisma generate"  { npx prisma generate }
  Invoke-Step "prisma db push"   { npx prisma db push --skip-generate }
  Invoke-Step "npm run build"           { npm run build }
  $ok = $true
}
finally {
  if ($ok) {
    Start-Service $ServiceName
    Write-Host "Deploy OK, da khoi dong lai $ServiceName" -ForegroundColor Green
  }
  else {
    Write-Host "Deploy LOI, service $ServiceName van dang TAT. Kiem tra log roi chay lai." -ForegroundColor Red
  }
}

if ($ok) {
  Start-Sleep -Seconds 5
  netstat -ano | findstr :5433
}