# --- fix_paths.ps1 ---
# Corrige rutas absolutas→relativas y asegura <meta charset> + <base href="./">

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path

function Fix-File([string]$path, [ScriptBlock]$transform) {
  if (-not (Test-Path $path)) { return }
  $text = Get-Content -Raw -LiteralPath $path
  $new  = & $transform $text
  if ($new -ne $text) { Set-Content -LiteralPath $path -Value $new -Encoding utf8 }
}

function Remove-LeadingSlash($s) {
  $s = $s -replace '(?i)(\b(?:src|href)\s*=\s*")/([^"]+)"', '$1$2"'
  $s = $s -replace '(?i)(@import\s+["'']?)/([^"''\)]+)(["'']?)', '$1$2$3'
  $s = $s -replace '(?i)url\(\s*["'']?/([^"''\)]+)["'']?\s*\)', 'url($1)'
  $s = $s -replace '(?i)fetch\(\s*["'']\/([^"'']+)["'']\s*\)', 'fetch("$1")'
  return $s
}

function Ensure-HeadBits($html) {
  if ($html -notmatch '(?i)<meta\s+charset=') { $html = $html -replace '(?i)(<head[^>]*>)', '$1' + "`r`n  <meta charset=""utf-8"">" }
  if ($html -notmatch '(?i)<base\s+href=')   { $html = $html -replace '(?i)(<head[^>]*>)', '$1' + "`r`n  <base href=""./"">" }
  return $html
}

# Backup
$stamp  = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backup = Join-Path $root "_backup_$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -Recurse -Force @("$root\index.html","$root\css","$root\js","$root\data") -Destination $backup -ErrorAction SilentlyContinue

# Arreglos
Fix-File "$root\index.html" { param($t) (Ensure-HeadBits (Remove-LeadingSlash $t)) }
Get-ChildItem -Recurse -File -Include *.css,*.js,*.html |
  ForEach-Object { Fix-File $_.FullName { param($t) (Remove-LeadingSlash $t) } }

Write-Host "[OK] Rutas y cabeceras corregidas. Backup en $backup" -ForegroundColor Green
# --- fin ---
