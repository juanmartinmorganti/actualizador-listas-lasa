# Auditoría técnica: Actualización de Lista de Precios

Fecha: 2026-08-20

## Resumen ejecutivo

La aplicación cumple el flujo actual para un catálogo pequeño y la lógica de redondeo cubierta por pruebas funciona. El principal riesgo no está en el cálculo, sino en la persistencia: el navegador envía el catálogo completo a una API pública que lo reemplaza en un único archivo JSON. No hay autenticación, control de concurrencia, historial ni recuperación. En su forma actual es adecuada para un único operador y unos cientos de productos en una red controlada; no es una base segura para múltiples usuarios ni para 10.000 productos.

La interfaz pública está cuidada y contempla impresión por categoría y catálogo. La administración, en cambio, mezcla alta, ajustes masivos, vista final y detalle técnico en una sola página larga. Para una persona que edita precios durante horas, el coste principal es el desplazamiento, la pérdida de contexto y el guardado producto por producto.

## Hallazgos por prioridad

### P0 - Críticos

1. **API de escritura sin autenticación ni autorización.** Cualquier cliente que alcance el servidor puede leer y reemplazar `/api/productos`. El parámetro `?admin` sólo cambia la UI; no protege datos. Antes de exponer el servicio fuera de una máquina o red confiable se necesita identidad, sesión, roles y protección CSRF.
2. **Pérdida de actualizaciones concurrentes.** Cada cambio envía todos los registros. Dos pestañas u operadores pueden partir de versiones distintas y el último guardado sobrescribe silenciosamente al anterior. Se necesita versionado optimista (`revision`/ETag) como mínimo; con varios usuarios, una base de datos y operaciones por entidad.
3. **Sin historial ni recuperación operativa.** Publicar, ajustar o eliminar reemplaza el estado anterior. Un precio erróneo o un borrado no tiene deshacer ni auditoría. Deben existir snapshots/versiones inmutables y copias de seguridad verificadas.
4. **“Borrar todo” eliminaba también la configuración de la categoría.** Podía borrar fechas, recargos, notas y productos publicados. Corregido en esta auditoría para conservar registros de configuración.

### P1 - Importantes

1. **Monolito de frontend.** `public/script.js` concentra estado, acceso a red, reglas por categoría, plantillas HTML, navegación, exportación y eventos en más de 2.100 líneas. Hace costoso probar y cambiar una categoría sin afectar otras.
2. **Persistencia en archivo síncrona y de reemplazo completo.** Bloquea el event loop durante lectura/escritura y escala en tiempo, memoria y tráfico con el catálogo entero. La escritura ahora es atómica, pero sigue sin resolver concurrencia ni consultas parciales.
3. **Validación incompleta y duplicada.** El navegador contiene reglas diferentes según categoría y el servidor sólo puede verificar la estructura mínima. Un cliente directo todavía puede guardar precios o secciones incoherentes. Las reglas deben vivir en un esquema compartido y validarse en el servidor.
4. **Modelo de datos heterogéneo.** Producto y configuración comparten el mismo array; `nombre`, `codigo`, `numero`, `descripcion`, `detalle` y `medida` actúan a veces como identidad. Faltan IDs estables, timestamps y una versión de esquema.
5. **Confirmaciones masivas no escalan.** El ajuste construye un texto con todos los productos dentro de `confirm()`. Con cientos o miles será inmanejable y puede bloquear la UI. Conviene una vista previa resumida con conteo, muestra, totales y errores.
6. **Estados de error inconsistentes.** Varias operaciones mutan memoria y continúan renderizando después de `guardarProductos()` aunque haya fallado. La edición inline sí revierte; altas, borrados, movimientos, fechas, notas y ajustes masivos no lo hacen.
7. **Pruebas insuficientes.** Sólo se prueba parte del cálculo de precios. No hay pruebas de CRUD, publicación, filtros, exportación, renderizado, configuraciones, fallo de persistencia ni recorrido de usuario.
8. **Sin TypeScript, ESLint ni formatter declarados.** Los objetos variables por categoría carecen de contrato estático, justo donde más valor aportaría un discriminated union o esquema validado.
9. **Publicación inconsistente.** Algunas fechas viven en el JSON y otras en `localStorage`, por lo que dependen del navegador y no representan un estado compartido o auditable.

### P2 - Mejoras

1. `limpiarFormulario()` repetía la limpieza de campos de Servilletas.
2. Hay múltiples ramas extensas por categoría para encabezados, edición y renderizado; una configuración declarativa reduciría duplicación.
3. Los handlers inline (`onclick`) acoplan las plantillas al ámbito global e impiden una política CSP estricta.
4. La búsqueda reconstruye todas las filas en cada tecla y recalcula textos buscables. Es aceptable hoy, pero requiere debounce, índice normalizado y virtualización para miles de filas.
5. `productos.indexOf(producto)` dentro del render agrega búsquedas lineales; con muchas filas contribuye a un comportamiento cuadrático.
6. La tabla administrativa no tiene encabezado fijo, navegación por teclado entre precios, guardado con Enter, cancelación con Escape ni indicación persistente de cambios/guardado.
7. La exportación usa un conjunto fijo de columnas y omite campos específicos de categorías. Además, antes de esta revisión no escapaba separadores, comillas ni fórmulas de planilla.
8. Metadatos de `package.json` estaban incompletos y faltaba un comando de inicio estándar.

## Arquitectura y mantenibilidad

La separación actual consta de tres piezas: servidor Express, módulo aislado de cálculo y aplicación DOM. `pricing.js` es el límite mejor resuelto porque es puro y testeable. El siguiente paso debería conservar esa idea:

- `domain/`: entidades, esquemas y reglas de precio/publicación.
- `application/`: casos de uso (editar, ajustar, publicar, importar/exportar).
- `infrastructure/`: API, repositorios y persistencia.
- `ui/`: estado de pantalla, componentes de tabla/formulario y navegación.

No hace falta adoptar un framework inmediatamente. Primero conviene extraer módulos ES pequeños y pruebas de dominio; después evaluar si el crecimiento de la UI justifica React/Vue u otra librería.

## UX y flujo de edición

El flujo actual obliga a entrar en una categoría y recorrer, en orden, fechas, alta, notas/recargos, ajuste masivo, lista final y tabla técnica. “Aplicar ajuste” abre la misma pantalla y desplaza hacia `#ajustesCategoria`, que es el formulario de alta, no el bloque de aumento masivo: la intención y el destino no coinciden.

Flujo recomendado para la próxima versión:

1. Al entrar en una categoría, mostrar primero una barra compacta con búsqueda, estado de publicación, fecha y acciones principales.
2. Usar vistas o pestañas: `Productos`, `Ajuste masivo`, `Vista previa`, `Configuración`; recordar la última vista.
3. En `Productos`, editar precio directamente, Enter guarda y avanza a la siguiente fila, Shift+Enter vuelve, Escape cancela. Mantener nombre y columnas clave visibles.
4. Permitir seleccionar filas y aplicar un ajuste al conjunto seleccionado o filtrado, con resumen antes/después y una sola confirmación.
5. Mantener una barra fija de estado: cambios pendientes, guardando, guardado o error. Nunca depender sólo de `alert()`.
6. Publicar una versión explícita después de revisar cambios, separando claramente “guardar borrador” de “publicar”.

Esto reduce desplazamiento, clics y errores sin cambiar las reglas comerciales.

## Rendimiento y escala

| Volumen | Estado actual | Cambio necesario |
| --- | --- | --- |
| 100 productos | Adecuado para un operador | Mantener pruebas y manejo de errores |
| 1.000 productos | Utilizable con demoras perceptibles | Debounce, render por fragmentos/virtualización, IDs e índices, actualizaciones parciales |
| 10.000 productos | No recomendable | Base de datos, API paginada/filtrada, operaciones batch del lado servidor, virtualización y control de concurrencia |

El cuello de botella dominante será el modelo “leer/renderizar/enviar/escribir todo”, no el cálculo aritmético. Las tablas comerciales completas también generan grandes cadenas HTML y nodos DOM, y el catálogo impreso completo puede exceder memoria práctica del navegador.

## Seguridad

Se corrigió una salida HTML sin escapar y se neutralizaron fórmulas en CSV. Aún quedan como requisitos previos a producción: HTTPS detrás de proxy, autenticación, roles (consulta/edición/publicación), CSRF, cabeceras de seguridad/CSP, rate limiting, logs sin datos sensibles, validación de esquema completa y límites de longitud/rango. Los datos enviados por el cliente nunca deben considerarse confiables.

## Arquitectura futura

Para historial, categorías, proveedores, importación/exportación, auditoría y usuarios, usar una base relacional. Entidades mínimas: `products`, `categories`, `suppliers`, `price_lists`, `price_list_items`, `price_list_versions`, `users` y `audit_events`. Una versión publicada debe ser inmutable; los cambios posteriores crean un nuevo borrador. La auditoría debe registrar actor, fecha, operación y valores anterior/nuevo.

Recomendación de secuencia:

1. Autenticación, backups y control de concurrencia.
2. IDs/esquemas y migración de JSON a base de datos.
3. Separación del frontend y pruebas de flujos críticos.
4. Rediseño de edición intensiva y tabla virtualizada.
5. Historial/auditoría y, recién después, importación, proveedores y usuarios avanzados.

## Cambios seguros aplicados

- Escritura atómica del JSON y propagación correcta de errores HTTP.
- Validación estructural mínima del payload y límite explícito de cuerpo.
- Conservación de configuraciones al borrar los productos de una categoría.
- Escape de campos pendientes en la tabla para evitar HTML almacenado.
- CSV con comillas, escape de comillas y neutralización de fórmulas.
- Validación de respuesta al cargar datos.
- Comando `npm start`, metadata básica y pruebas de validación del servidor.

Estos cambios no agregan funcionalidad ni alteran reglas de precios o publicación.
