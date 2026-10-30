# LASA — activación de seguridad PDF

29/10/2026. Aplicación y reinicio autorizados expresamente por el usuario.

## Resultado

El parche se aplicó una sola vez, después de `git apply --check` sin conflictos, y se verificó después mediante `git apply --reverse --check`. No se ejecutó la reversión: el código instalado coincide con el registro final del parche y las pruebas críticas pasaron. El control de formato detectó una línea vacía sobrante al final de `test/server.test.js`; se eliminó, sin cambiar la lógica ni reiniciar el aplicativo. El parche conservado se actualizó para reflejar ese ajuste; no se reaplicó.

Se detuvo únicamente el proceso Node de LASA PID **4158** mediante SIGTERM y se inició su reemplazo PID **13621**, desde `/home/kirwan/p/actualizador-listas-lasa`, con el mismo entorno operativo, puerto **4000** y dirección existente **0.0.0.0**. El nuevo proceso está desacoplado de la sesión de diagnóstico; registro privado en `/tmp/lasa-activacion-20261029/lasa-nuevo.log`. No se configuró arranque automático.

No se reinició Windows ni Debian WSL2. No se modificaron IP, firewall, reenvíos ni servicios de Windows. Todas las comprobaciones de red se realizaron por `127.0.0.1`; no se habilitó acceso LAN.

## Respaldos y datos

Antes de aplicar se volvieron a analizar los JSON del respaldo privado `/home/kirwan/.local/share/lasa-backups/20261029T140147.663325Z/`, verificando sus SHA-256 contra el manifiesto y los originales. Se conservaron permisos `700` en carpetas y `600` en copias. El código anterior se guardó aparte en `/tmp/lasa-activacion-20261029/codigo-anterior`.

Borrador y publicaciones permanecen byte a byte iguales; las verificaciones incluyen SHA-256, fecha de modificación, inode y permisos. No se restauraron ni reescribieron los datos comerciales.

| Archivo | SHA-256 conservado |
| --- | --- |
| data/productos.json | `08ca190b5a53b5db4d7894fc42f6024d3ae4515131d0721924a650a7dc652486` |
| data/publicadas.json | `11c359b68bf54f4a5af88410e1f704d69b954c27676597d654c98805d92c1db5` |

## Pruebas sobre el código y el servicio

- `npm test` en el repositorio aplicado: **59 aprobadas, 0 fallos, 0 omitidas**, incluidas 16 pruebas específicas PDF. Pruebas con datos temporales y puertos de localhost; [registro](cambios/etapa1-pruebas.txt).
- Página y catálogo: HTTP 200. El cuerpo completo del catálogo conserva exactamente el SHA-256 de su respuesta anterior.
- Administración habilitada. Sin sesión, el borrador y su PDF devuelven 401. Una sesión diagnóstica de 60 segundos, firmada solo en memoria con la configuración existente, permite leer el borrador y generar su PDF; una firma alterada devuelve 401 y un origen incorrecto devuelve 403. El cierre de sesión responde correctamente. No se mostró, cambió ni ensayó la contraseña administrativa real; el login con contraseña se valida en la suite con credenciales ficticias. `auth.js` y `auth-config.js` permanecen sin cambios.
- HTML arbitrario: 400; cuerpo mayor al límite: 413; categoría/ruta inválida: 400. No se realizaron POST de edición, publicación o cambios de fecha sobre el servicio real.
- Se accionaron los botones de descarga de la interfaz pública de las nueve categorías y del catálogo. Chromium guardó los diez archivos reales en una carpeta privada temporal; todos respondieron HTTP 200 con PDF válido y la misma cantidad de páginas que antes. Sin errores ni alertas en la interfaz durante esta prueba.
- Sandbox de Chromium habilitado, JS desactivado, solicitudes restringidas y límites de tiempo/concurrencia/frecuencia: cubiertos por la suite. Los PDF reales se generaron con ese mismo trabajador seguro.

## Revisión visual

Se generaron PDFs de referencia antes de cambiar el código. Se compararon los nueve PDFs individuales (14 páginas en total) y el catálogo completo (16 páginas): **30/30 páginas idénticas píxel a píxel a 90 dpi**, con idéntica cantidad de páginas y mismo texto extraído (ignorando separación por espacios).

También se inspeccionaron láminas rasterizadas de las nueve categorías, portada del catálogo y páginas de su contenido. Se conservan logo, colores, encabezados, tablas, fechas, notas y paginación. [Métricas por página](cambios/etapa1-comparacion-visual.json).

PDFs y capturas con información comercial permanecen fuera del repositorio, bajo `/tmp/lasa-activacion-20261029/` con carpeta `700`. Para renderizarlos se descargaron paquetes oficiales de Debian y se extrajeron exclusivamente en esa carpeta: **no se instalaron paquetes ni se cambió la configuración de Debian**.

## Problemas detectados y límites

La captura inicial del cuerpo HTTP PDF mediante DevTools devolvió vacío aunque la respuesta HTTP directa contenía un PDF válido. Se sustituyó por la descarga real del navegador, que pasó. El visor PDF de Chromium se atascó durante capturas sucesivas; se reemplazó por rasterización independiente. Fueron problemas del instrumento de comprobación, no fallos críticos de LASA.

Observación visual preexistente: algunas listas individuales muestran **«Página 0»** en el pie. Se comprobó también en las referencias anteriores; se conservó para no alterar el formato en esta activación. No es una regresión introducida por el parche.

Las pestañas que ya estaban abiertas deben recargarse: el servidor seguro rechaza el protocolo anterior que enviaba HTML. Siguen pendientes HTTPS, inicio automático y acceso LAN, fuera de esta autorización. Los respaldos aún residen en el mismo disco y conviene replicarlos a otro soporte en una etapa posterior.

No hubo fallos críticos de la versión aplicada, por lo que no se activó la reversión. No se hizo commit ni push.
