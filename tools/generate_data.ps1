<# generate_data.ps1 (WP 5.1 compatible)
   Lee data\plantilla_preguntas_unica.csv y crea data\data.js (window.QUIZ = {...})
   - Alias de columnas ampliados (Departamento/Área, dto, seccion, etc.)
   - Convierte respuesta correcta en letra aunque venga como texto
   - Si hay columna 'activo' pero nadie activo, NO filtra nada
   - NO crea ningún CSV adicional
#>

Param(
  [string]$CsvPath = $null,
  [string]$OutPath = $null
)

# === Resolver rutas, incluso si ejecutas desde la consola ===
# $PSScriptRoot existe al ejecutar el archivo; si pegas en consola, usamos el directorio actual.
$Here = $PSScriptRoot
if (-not $Here -or $Here -eq "") {
  if ($MyInvocation.MyCommand.Path) {
    $Here = Split-Path -Parent $MyInvocation.MyCommand.Path
  } else {
    $Here = (Get-Location).Path
  }
}

# Si estamos en /tools, subimos a la raíz del proyecto
$ProjectRoot = $Here
try {
  if ((Split-Path -Leaf $Here) -ieq "tools") {
    $ProjectRoot = (Resolve-Path (Join-Path $Here "..")).Path
  }
} catch { $ProjectRoot = $Here }

# Rutas por defecto
if (-not $CsvPath -or $CsvPath -eq "") { $CsvPath = Join-Path $ProjectRoot "data\plantilla_preguntas_unica.csv" }
if (-not $OutPath -or $OutPath -eq "") { $OutPath = Join-Path $ProjectRoot "data\data.js" }

# Asegurar rutas absolutas
if (-not [System.IO.Path]::IsPathRooted($CsvPath)) { $CsvPath = Join-Path $ProjectRoot $CsvPath }
if (-not [System.IO.Path]::IsPathRooted($OutPath)) { $OutPath = Join-Path $ProjectRoot $OutPath }

if (!(Test-Path $CsvPath)) { Write-Error "No existe el CSV en $CsvPath"; exit 1 }

# === Detectar delimitador ===
$firstLine = Get-Content -Path $CsvPath -TotalCount 1 -Encoding UTF8
$delim = ","
if ($firstLine -match ";") { $delim = ";" }

# === Cargar CSV ===
$text = Get-Content -Path $CsvPath -Raw -Encoding UTF8
$rows = $text | ConvertFrom-Csv -Delimiter $delim
if (-not $rows) { Write-Error "CSV vacío o sin encabezados válidos"; exit 1 }

# Helper: primer valor no vacío entre varias claves
function Get-Col([hashtable]$h, [string[]]$keys) {
  foreach($k in $keys){
    if ($h.ContainsKey($k) -and $null -ne $h[$k]) {
      $v = "$($h[$k])".Trim()
      if ($v -ne "") { return $v }
    }
  }
  return ""
}

# Alias de cabeceras
$K_DEPART = @('departamento','Departamento','depto','dto','area','área','Area','Departamento / Área','Departamento/Área','seccion','sección','Sección')
$K_CATEG  = @('categoría','categoria','Categoria')
$K_NIVEL  = @('nivel','Nivel')
$K_TEXTO  = @('texto','pregunta','enunciado','Texto')
$K_A      = @('A','a','opcion_a','opción_a','opción A')
$K_B      = @('B','b','opcion_b','opción_b','opción B')
$K_C      = @('C','c','opcion_c','opción_c','opción C')
$K_D      = @('D','d','opcion_d','opción_d','opción D')
$K_CORR   = @('correct_letter','correcta','letra_correcta','respuesta_correcta','correct','Respuesta')

# Normalizar filas
$questions = @()
$ix = 0
foreach ($r in $rows) {
  $h = @{}; foreach($p in $r.PSObject.Properties){ $h[$p.Name] = $p.Value }

  $id    = if ($h.ContainsKey('id') -and $h['id']) { try { [int]$h['id'] } catch { $ix } } else { $ix }
  $depto = Get-Col $h $K_DEPART
  $cat   = Get-Col $h $K_CATEG
  $nivel = Get-Col $h $K_NIVEL
  $texto = Get-Col $h $K_TEXTO
  $A     = Get-Col $h $K_A
  $B     = Get-Col $h $K_B
  $C     = Get-Col $h $K_C
  $D     = Get-Col $h $K_D
  $corr  = Get-Col $h $K_CORR

  function Map-Correct([string]$t,[string]$a,[string]$b,[string]$c,[string]$d){
    $tt = ($t|Out-String).Trim().ToLower()
    if (-not $tt) { return "" }
    if ($tt -eq ($a|Out-String).Trim().ToLower()) { return "A" }
    if ($tt -eq ($b|Out-String).Trim().ToLower()) { return "B" }
    if ($tt -eq ($c|Out-String).Trim().ToLower()) { return "C" }
    if ($tt -eq ($d|Out-String).Trim().ToLower()) { return "D" }
    if ($tt -match '^[ABCDabcd]$') { return $tt.ToUpper() }
    return ""
  }
  if ($corr -and ($corr -notmatch '^[ABCD]$')) { $corr = Map-Correct $corr $A $B $C $D }
  if (-not $corr) { $corr = "A" }  # fallback seguro

  $why   = Get-Col $h @('why','explicacion','explicación','comentario')

  if ($texto) {
    $questions += [ordered]@{
      id=$id; departamento=$depto; categoria=$cat; nivel=$nivel;
      texto=$texto; A=$A; B=$B; C=$C; D=$D; correct_letter=$corr; why=$why
    }
  }
  $ix++
}

# Filtrado por 'activo' sólo si hay ALGUNO activo
if ($rows[0].PSObject.Properties.Name -contains 'activo') {
  $active = @()
  for($i=0; $i -lt $questions.Count; $i++){
    $flag = "$($rows[$i].activo)"
    if ($flag -match '^(1|true|TRUE|si|sí|SI|Sí)$') { $active += $questions[$i] }
  }
  if ($active.Count -gt 0) { $questions = $active }
}

# Serializar a JS (UTF-8)
$data   = [ordered]@{ count=$questions.Count; questions=$questions }
$json   = $data | ConvertTo-Json -Depth 12
$jsonU  = [System.Text.RegularExpressions.Regex]::Unescape($json)

$prefix = "// Autogenerado a partir de plantilla_preguntas_unica.csv`nwindow.QUIZ = "
$suffix = ";"
$content= $prefix + $jsonU.Trim() + $suffix

$null = New-Item -ItemType Directory -Path (Split-Path -Parent $OutPath) -Force
Set-Content -LiteralPath $OutPath -Value $content -Encoding UTF8

Write-Host "OK · Generado $OutPath con $($questions.Count) preguntas"
