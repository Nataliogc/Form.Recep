# Reglas y Directrices de Desarrollo - Form.Recep

## 🚨 REGLA OBLIGATORIA: Control Automático de Versiones

Cada vez que se realice cualquier modificación, mejora, corrección de errores o nueva funcionalidad en cualquier archivo o módulo del sistema (`index.html`, `css/style.css`, `js/*`, `sw.js`, `tools/*`, etc.):

1. **Incremento de Versión Única**:
   - Incrementar automáticamente el número de versión global (`patch` para correcciones y mejoras estándar, `minor` para nuevas funcionalidades grandes, `major` para rediseños).
2. **Actualización Automática de Archivos**:
   - Ejecutar el script auxiliar (actualiza `package.json`, `js/config.js`, `sw.js`, el badge visible en `index.html` y `REGISTRO_VERSIONES.md`):
     ```bash
     node scripts/bump-version.js "Descripción del cambio" --modules "Módulo Afectado"
     ```
3. **Comunicación al Usuario**:
   - En cada respuesta en la que se apliquen cambios de código, confirmar al usuario la nueva versión generada (ej. `v2.0.1`) y su registro correspondiente.
