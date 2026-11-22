Carpeta de imágenes propias para preguntas de Form.Recep
========================================================

Cómo añadir una imagen a cualquier pregunta en data/plantilla_preguntas_unica.csv:

1. Columna `imagen` (se muestra en el enunciado de la pregunta, con zoom al pulsar).
2. Columna `imagen_explicacion` (opcional, se muestra dentro del recuadro de explicación tras responder).

Formatos admitidos en ambas columnas:
- Solo nombre de archivo (ej. `234.png`) -> busca automáticamente `./img/preguntas/234.png`
- Ruta local (ej. `img/preguntas/mi-captura.jpg`)
- Prefijo `protocolo:` (ej. `protocolo:Imagenes/gest-spa/01-inicio-dashboard.png`) -> carga la captura directamente desde el portal hermano Protocolo-Recep
- URL completa (`https://...`)
