/**
 * Código opcional para añadir a tu Google Apps Script de "Formación – Resultados"
 * Permite que admin.html lea los resultados directamente en vivo (sin publicar el CSV).
 *
 * Cómo activarlo:
 * 1) Abre tu Google Sheet "Formación – Resultados" -> Extensiones -> Apps Script.
 * 2) Pega esta función doGet(e) debajo de tu doPost(e) existente.
 * 3) Implementar -> Gestionar implementaciones -> Editar -> Nueva versión -> Implementar.
 */
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ results: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = values[0].map(function (h) {
      return String(h || "").trim().toLowerCase();
    });

    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = values[i][c];
      }
      rows.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify({ results: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err), results: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
