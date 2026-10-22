$ErrorActionPreference = "Stop"
$env:PGPASSWORD = "phuquy3001"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$dir = "C:\quyhdp\nkdd-backups"
New-Item -ItemType Directory -Force $dir | Out-Null
$file = Join-Path $dir ("nkdd_{0:yyyyMMdd_HHmm}.dump" -f (Get-Date))

& "$bin\pg_dump.exe" -U postgres -h localhost -p 5432 -F c -f $file nkdd
if ($LASTEXITCODE -ne 0) {
    Remove-Item $file -ErrorAction SilentlyContinue
    throw "pg_dump failed"
}

# giữ 14 ngày gần nhất
Get-ChildItem $dir -Filter "nkdd_*.dump" |
    Where-Object LastWriteTime -lt (Get-Date).AddDays(-14) |
    Remove-Item

Write-Host "Backup OK: $file ($([math]::Round((Get-Item $file).Length/1KB)) KB)"