// Fallback LOCAL para cuando el CSV no puede cargarse (file://)
// Debe existir en:  /data/data.js
// Requisito: window.QUIZ.questions = [ ... ]

window.QUIZ = {
  count: 3, // opcional: no bloquea nada
  questions: [
    {
      id: "demo-1",
      departamento: "Recepción",      // también aceptamos "dto"
      categoria: "Operativa Turnos",   // también aceptamos "mod"
      texto: "¿Qué listados se imprimen al inicio del turno de mañana?", // también aceptamos "text"
      A: "Listado de empleados",
      B: "Listado de proveedores",
      C: "Listado de menús del restaurante",
      D: "Listado de reservas del día, situación de habitaciones y salidas/entradas",
      correct_letter: "D", // A, B, C o D (también aceptamos "correct")
      why: "Reservas activas, situación de habitaciones y salidas/entradas."
    },
    {
      id: "demo-2",
      departamento: "Recepción",
      categoria: "Errores Comunes",
      texto: "¿Qué NO debe hacerse con el localizador de una reserva de canal externo?",
      A: "Modificarlo manualmente antes de la noche anterior a la llegada",
      B: "Comprobar cambios en el canal de origen",
      C: "Añadir comentarios internos",
      D: "Vincular a la ficha del cliente",
      correct_letter: "A",
      why: "Modificarlo rompe la sincronización y puede causar cancelaciones erróneas."
    },
    {
      id: "demo-3",
      departamento: "Cumbria",
      categoria: "Operativa Turnos",
      texto: "¿Qué se recomienda revisar antes de abrir el turno?",
      A: "Redes sociales",
      B: "Agenda de novedades con el turno anterior",
      C: "Pedidos de F&B",
      D: "Cambio de divisas",
      correct_letter: "B",
      why: "Asegura continuidad del servicio y seguimiento de incidencias."
    }
  ]
};

// Autocomprobación en consola (útil para detectar errores de sintaxis o rutas)
(function(){
  try {
    const ok = window.QUIZ && Array.isArray(window.QUIZ.questions) ? window.QUIZ.questions.length : 0;
    console.log("[QUIZ] data.js cargado · preguntas:", ok);
    if (!ok) console.warn("[QUIZ] data.js cargado pero sin preguntas.");
  } catch (e) {
    console.error("[QUIZ] Error al evaluar data.js:", e);
  }
})();
