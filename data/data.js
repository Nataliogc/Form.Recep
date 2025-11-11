// Ejemplo mínimo de fallback local
window.QUIZ = {
  count: 3,
  questions: [
    {
      id: "demo-1",
      departamento: "Recepción",
      categoria: "Operativa Turnos",
      texto: "¿Qué listados se imprimen al inicio del turno de mañana?",
      A: "Listado de empleados",
      B: "Listado de proveedores",
      C: "Listado de menús del restaurante",
      D: "Listado de reservas del día, situación de habitaciones y salidas/entradas",
      correct_letter: "D",
      why: "Se generan reservas activas, situación de habitaciones (todos los estados) y salidas/entradas."
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
      why: "Alterarlo rompe la sincronización y puede producir cancelaciones erróneas."
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
