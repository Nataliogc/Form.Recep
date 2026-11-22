const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const registroPath = path.join(root, 'REGISTRO_VERSIONES.md');
const configPath = path.join(root, 'js', 'config.js');
const swPath = path.join(root, 'sw.js');
const indexPath = path.join(root, 'index.html');
const adminPath = path.join(root, 'admin.html');

// Uso: node scripts/bump-version.js "Descripción del cambio" [--patch|--minor|--major] [--modules "Módulo"]
const args = process.argv.slice(2);
let description = 'Mejora y actualización del sistema';
let type = 'patch';
let modules = 'General';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--minor') type = 'minor';
  else if (arg === '--major') type = 'major';
  else if (arg === '--patch') type = 'patch';
  else if (arg === '--modules' && args[i + 1]) {
    modules = args[i + 1];
    i++;
  } else if (!arg.startsWith('--')) {
    description = arg;
  }
}

if (!fs.existsSync(packagePath)) {
  console.error('Error: No se encontró package.json');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = pkg.version || '2.0.0';
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some(isNaN)) {
  console.error(`Error: Formato de versión no válido en package.json (${currentVersion})`);
  process.exit(1);
}

let [major, minor, patch] = parts;
if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (type === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Fecha DD/MM/AAAA
const now = new Date();
const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

// 1. Actualizar js/config.js
if (fs.existsSync(configPath)) {
  const cfg = fs.readFileSync(configPath, 'utf8');
  const updated = cfg.replace(/version:\s*"[0-9.]+"/, `version: "${newVersion}"`);
  fs.writeFileSync(configPath, updated, 'utf8');
}

// 2. Actualizar sw.js (fuerza refresco de caché PWA)
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const updated = sw.replace(/const CACHE_NAME = "form-recep-v[0-9.]+";/, `const CACHE_NAME = "form-recep-v${newVersion}";`);
  fs.writeFileSync(swPath, updated, 'utf8');
}

// 3. Actualizar badge visible en index.html y admin.html
[indexPath, adminPath].forEach((htmlPath) => {
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const updated = html
      .replace(/(<span id="app-version-badge"[^>]*>)v[0-9.]+(<\/span>)/, `$1v${newVersion}$2`)
      .replace(/(<span id="footerMeta"[^>]*>)v[0-9.]+(<\/span>)/, `$1v${newVersion}$2`)
      .replace(/\?v=[0-9.]+/g, `?v=${newVersion}`);
    fs.writeFileSync(htmlPath, updated, 'utf8');
  }
});

// 4. Actualizar REGISTRO_VERSIONES.md
if (fs.existsSync(registroPath)) {
  let content = fs.readFileSync(registroPath, 'utf8');
  content = content.replace(
    /\|\s*\*\*`v[0-9.]+`\*\*\s*\|\s*\*\*[0-9/]+\*\*\s*\|/g,
    `| **\`v${newVersion}\`** | **${formattedDate}** |`
  );

  const typeLabel =
    type === 'major'
      ? 'Actualización Mayor'
      : type === 'minor'
      ? 'Nueva Característica / Mejora'
      : 'Mejora / Corrección';

  const newEntry =
    `### [v${newVersion}] — ${formattedDate}\n` +
    `- **Módulos Afectados:** ${modules}\n` +
    `- **Tipo de Cambio:** ${typeLabel}\n` +
    `- **Detalle de Cambios:**\n` +
    `  - ${description}\n\n`;

  const targetHeader = '## 📝 Historial de Modificaciones del Sistema\n\n';
  if (content.includes(targetHeader)) {
    content = content.replace(targetHeader, targetHeader + newEntry);
  } else {
    content += '\n' + newEntry;
  }
  fs.writeFileSync(registroPath, content, 'utf8');
}

console.log(`✅ Versión incrementada automáticamente a v${newVersion} (${formattedDate})`);
console.log(`📝 Actualizados: package.json, js/config.js, sw.js, index.html y REGISTRO_VERSIONES.md`);
