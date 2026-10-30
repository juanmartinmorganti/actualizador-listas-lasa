# LASA — etapa 1: respaldo y PDF

Fecha: 29/10/2026. **Parche aplicado y LASA reiniciado por autorización posterior del usuario.** No se restauraron datos ni se modificaron red, firewall, servicios de Windows ni autenticación administrativa. Resultado actualizado: [ACTIVACION_PDF.md](ACTIVACION_PDF.md).

## Respaldo verificado

El proceso LASA PID 4158 utiliza `/home/kirwan/p/actualizador-listas-lasa` y no redefine `LASA_DATA_DIR`. Archivos reales:

- Borrador: `/home/kirwan/p/actualizador-listas-lasa/data/productos.json`.
- Publicaciones: `/home/kirwan/p/actualizador-listas-lasa/data/publicadas.json`.

Copia privada: `/home/kirwan/.local/share/lasa-backups/20261029T140147.663325Z/`.
Carpeta raíz de respaldos y carpeta de esta copia: permisos `700`. Los dos JSON y `manifest.json`: permisos `600`. Usuario propietario: `kirwan`. No se incluyeron credenciales.

| Archivo | Bytes | SHA-256 |
| --- | ---: | --- |
| productos.json | 71773 | `08ca190b5a53b5db4d7894fc42f6024d3ae4515131d0721924a650a7dc652486` |
| publicadas.json | 72149 | `11c359b68bf54f4a5af88410e1f704d69b954c27676597d654c98805d92c1db5` |

Los originales y las copias se analizaron como JSON, y se compararon por SHA-256, incluyendo una segunda lectura de los originales al terminar cada copia. El proceso de respaldo solo leyó los originales. La verificación final confirmó de nuevo ambos hashes, permisos `700/600` y que LASA continúa escuchando en `0.0.0.0:4000` con el mismo PID 4158.

La copia reside en el mismo disco y dentro de la misma distribución: protege frente a errores de edición, pero no frente a pérdida del disco o de WSL. Se recomienda una copia adicional privada en otro soporte y un ensayo posterior de restauración en un directorio de prueba.

## Procedimiento de restauración — preparado, NO ejecutado

Requiere autorización específica: restaurar reemplaza las modificaciones comerciales posteriores a este respaldo.

1. Acordar una ventana sin edición, publicación ni descargas. Identificar el proceso actual de LASA y su directorio de datos; no asumir que el PID seguirá siendo 4158. Detener únicamente LASA con autorización. Confirmar que no haya otro escritor y que el directorio destino siga siendo el correcto.
2. Crear primero una nueva copia privada de los dos JSON vigentes, con permisos `700/600`, JSON válido y hashes. Conservarla como reversión de la restauración.
3. Elegir **el par del mismo respaldo**, no mezclar fechas. Comprobar propietario/permisos de la copia y verificar los SHA-256 contra `manifest.json` y la tabla anterior. Analizar ambos como JSON y confirmar que sean arrays. Si alguna comprobación falla, detener el procedimiento.
4. Copiar los archivos del respaldo a dos nombres temporales nuevos dentro del directorio destino, por ejemplo `productos.json.restauracion-PENDIENTE` y `publicadas.json.restauracion-PENDIENTE`, sin sobrescribir temporales existentes. Usar propietario del aplicativo y permisos `600`. Verificar de nuevo JSON y SHA-256 de ambos temporales **antes** de reemplazar un original.
5. Con el aplicativo aún detenido, reemplazar cada original mediante renombrado del temporal dentro del mismo directorio. El renombrado individual es atómico; el par completo no lo es. No iniciar LASA si quedó restaurado solo uno de los archivos: completar el par o volver al par de reversión del paso 2.
6. Verificar que ambos destinos coincidan exactamente con los hashes del respaldo elegido. Iniciar LASA solo con autorización y comprobar página, consulta pública y protección del borrador mediante GET. No editar, publicar, sembrar publicaciones ni cambiar fechas para validar una restauración.
7. Conservar el respaldo elegido, el par previo a la restauración y el resultado de las verificaciones. No ejecutar `seed-publicadas.js`: no forma parte de la restauración.

Para una comprobación de solo lectura del respaldo elegido:

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, json
copia = Path('/home/kirwan/.local/share/lasa-backups/20261029T140147.663325Z')
manifest = json.loads((copia / 'manifest.json').read_text())
for nombre in ('productos.json', 'publicadas.json'):
    datos = (copia / nombre).read_bytes()
    assert isinstance(json.loads(datos), list), nombre
    sha = hashlib.sha256(datos).hexdigest()
    assert sha == manifest['files'][nombre]['sha256'], nombre
    print(nombre, 'JSON válido; SHA-256 verificado:', sha)
PY
```

## Implementación aplicada

La versión se preparó y probó inicialmente en `/tmp/lasa-etapa1-20261029`. Tras autorización explícita, se verificaron otra vez los respaldos y los originales, se guardó el código anterior en `/tmp/lasa-activacion-20261029/codigo-anterior`, se comprobó que el parche aplicaba sin conflictos y se aplicó **una sola vez**. No volver a aplicar `cambios/etapa1-pdf.patch`: está conservado como registro revisable del cambio.

Se detuvo únicamente el Node de LASA PID 4158 y se inició su reemplazo PID 13621, conservando el puerto y dirección de escucha existentes. No se reinició Windows, WSL2 ni ningún otro servicio. La suite completa y las pruebas sobre el servicio activo pasaron; no fue necesario revertir código ni restaurar datos. Ver [informe de activación](ACTIVACION_PDF.md).

Las pestañas abiertas antes del cambio deben recargarse para utilizar el protocolo nuevo. El servidor rechaza HTML enviado por clientes anteriores.

## Protocolo PDF y preservación comercial

La descarga sigue siendo pública y no necesita sesión:

- Lista: `POST /api/pdf` con `{"tipo":"lista","categoria":"Moldes"}`.
- Catálogo completo: `POST /api/pdf` con `{"tipo":"catalogo"}`.
- Vista previa de administración: los mismos parámetros más `"fuente":"borrador"`; requiere la sesión y el control de origen existentes. No se modifican `auth.js` ni `auth-config.js`.

Se rechazan HTML, URLs, fechas solicitadas, rutas, campos extra y categorías desconocidas. La fuente pública se lee exclusivamente de `publicadas.json`; no se usa el borrador como fallback si faltan publicaciones. Las fechas de publicación y los cálculos comerciales provienen de los datos locales y de `public/pricing.js`. La fecha de generación/nombre de descarga se obtiene en el servidor, sin escribirla en los datos. Las plantillas reutilizan la presentación actual, con pruebas de paridad para las nueve categorías; los textos se escapan.

`pdf-template.js` contiene las plantillas comerciales copiadas del cliente para ejecutarlas en Node, sin DOM ni JavaScript del usuario. Si se modifica la presentación comercial, se deben actualizar ambas plantillas y mantener la prueba de paridad. La vista previa individual administrativa conserva el borrador; el catálogo mantiene el comportamiento existente de Fast Food con su snapshot publicado.

## Aislamiento y límites

- Chromium inicia sin `--no-sandbox` ni `--disable-setuid-sandbox`. Se verificó en este Debian/WSL2 con el usuario actual, fuera del aislamiento de Codex, sin cambiar sysctl, permisos de binarios ni configuración del sistema.
- Si Chromium no dispone de sandbox o no puede arrancar, responde un error seguro `503`. No existe reintento sin sandbox. Al cambiar el usuario de ejecución se debe repetir la prueba.
- JavaScript deshabilitado antes de cargar contenido; CSP sin scripts, conexiones, frames, objetos ni base URL; modo offline y solicitudes interceptadas. Solo se permite la imagen exacta del logo embebida como `data:`. No se navega al Host recibido ni se solicitan recursos HTTP, HTTPS o del sistema de archivos. CSS local embebido.
- Cuerpo HTTP PDF máximo **1 KiB**, parser específico anterior al parser comercial general, que conserva su límite anterior.
- JSON de origen máximo **2 MiB**, hasta **5000 registros**; HTML generado máximo **2 MiB**; PDF máximo **20 MiB**.
- **1 generación simultánea**, sin cola. Hasta **20 intentos admitidos por minuto**, globales por proceso. Exceso: `429` con `Retry-After`. El límite global puede requerir ajuste tras medir uso real y puede permitir que un usuario consuma el cupo compartido.
- Trabajador separado y grupo de procesos propio; **20 segundos** de plazo total para generación, incluidos arranque y cierre. Arranque de Chromium: 8 segundos; operaciones de página/PDF: 10 segundos. Vencimiento: `504` y terminación del grupo, incluido Chromium. Desconexión del cliente: cancelación. El trabajador no recibe las credenciales administrativas en su entorno.
- El plazo del trabajador comienza después de construir la plantilla; la lectura y construcción están acotadas por tamaño y registros. No se cambian servicios ni reglas de red.

## Pruebas y riesgos pendientes

**Resultado verificado: `npm test` sobre el código aplicado en el repositorio: 59 pruebas aprobadas, 0 fallos, 0 omitidas.** Registro: `cambios/etapa1-pruebas.txt`. El intento dentro del aislamiento de Codex falló por restricciones de sockets; la ejecución final fuera de ese aislamiento pasó con sandbox de Chromium habilitado. La suite utiliza servidores efímeros en `127.0.0.1`, datos ficticios y directorios temporales. Los tests históricos de precios solo leen el borrador. No ejecutar pruebas con Node apuntando a los datos reales para escrituras.

Cobertura nueva: contrato sin HTML; campos maliciosos; escape; publicación obligatoria; paridad de las nueve categorías; límites de cuerpo, datos, HTML y registros; descarga sin sesión; aislamiento del borrador y origen; concurrencia y liberación tras fallo; frecuencia; contrato del cliente; cancelación y plazo; sandbox real; logo embebido; JS desactivado; recursos locales, externos, metadata y archivos bloqueados; trabajador real y endpoint público real; fallo cerrado si Chromium no existe.

Activación y verificación funcional y visual completadas: las 30 páginas de las nueve listas y del catálogo completo son idénticas en píxeles al renderizarlas antes y después, y conservan el mismo texto. Pendientes: HTTPS y acceso LAN en una etapa posterior; arranque automático posterior; copia en otro soporte y simulacro de restauración. Chromium podría dejar archivos temporales al ser terminado forzosamente; revisar espacio en `/tmp` bajo carga. Los límites no reemplazan el firewall ni un proxy con límites de conexión. No se configuró aislamiento de red a nivel de sistema operativo ni límites duros de memoria del proceso.

Referencia técnica: [sandbox de Puppeteer](https://pptr.dev/troubleshooting) y [API de Page](https://pptr.dev/api/puppeteer.page). La desactivación de JavaScript se realiza antes de cargar contenido.
