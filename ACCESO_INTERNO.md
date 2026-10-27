# Acceso interno — primera etapa

La consulta de listas continúa sin inicio de sesión. La edición por `POST /api/productos` requiere una única cuenta administrativa. **No exponer aún el aplicativo en la red de la fábrica**: falta separar borrador de lista publicada, asegurar PDF, resolver conflictos de edición y probar respaldo/restauración.

La configuración se lee por defecto de `~/.config/lasa/actualizador-listas.json` del usuario que inicia el servidor, o de la ruta indicada en `LASA_AUTH_CONFIG`. En Linux/WSL el archivo debe tener permisos `600` y su carpeta `700`; no se guarda en Git. La contraseña se guarda solo como hash con sal. La cuenta inicial se creó localmente en la PC de trabajo; no trasladar este archivo por Git ni publicarlo.

Alternativamente, antes de ejecutar se pueden configurar estas variables de entorno en la PC anfitriona:

- `LASA_ADMIN_USER`: usuario de administración elegido por LASA.
- `LASA_ADMIN_PASSWORD_HASH`: hash scrypt generado con `npm run hash:password` (la contraseña no debe guardarse en el repositorio).
- `LASA_SESSION_SECRET`: valor aleatorio de al menos 32 caracteres, distinto de la contraseña y del hash. Conservarlo fuera de Git; cambiarlo invalida las sesiones existentes.

En Windows PowerShell, para preparar solo una sesión de prueba local (no guardar los valores en un archivo del proyecto):

```powershell
$env:LASA_ADMIN_USER = 'usuario-elegido'
$env:LASA_ADMIN_PASSWORD_HASH = 'hash-generado'
$env:LASA_SESSION_SECRET = 'secreto-aleatorio-de-32-caracteres-o-mas'
npm start
```

Si falta configuración, el servidor deja deshabilitada la administración; nunca se habilita sin credenciales. Las sesiones expiran a las ocho horas. Cuando la aplicación se instale en Windows se deberá configurar allí una copia privada, sin incluir secretos en el repositorio. El acceso mediante HTTP en la red local transmite contraseñas y cookies sin cifrar; **antes de habilitar acceso desde otras computadoras, configurar HTTPS local o una protección equivalente validada para esa red**.

`data/productos.json` está versionado y puede tener cambios operativos no guardados en Git: respaldarlo sin sobrescribirlo y verificar que puede restaurarse antes de migrar datos o desplegar. No hacer pruebas de escritura sobre ese archivo real.

## Borrador y publicación

`GET /api/productos` devuelve solamente `data/publicadas.json` y es de consulta libre. La administración recibe el borrador `data/productos.json` por `GET /api/borrador` con sesión. Después de guardar el borrador, `POST /api/publicaciones` (administrador) copia solo la categoría elegida a la versión pública. Si el servidor no encuentra `publicadas.json`, la consulta devuelve error y no muestra por accidente el borrador.

La versión pública inicial se generó una sola vez con los precios que estaban en `data/productos.json`, por autorización del usuario. El archivo público no se guarda en Git: conservarlo junto con el borrador al hacer copias de seguridad y migrar a Windows. `tools/seed-publicadas.js` no sobrescribe una versión pública existente.

El campo «Fecha de publicación» dentro de la edición actualiza la fecha de la **lista ya publicada**, sin guardar cambios en el borrador ni publicar precios pendientes. Solo permite categorías con una lista pública existente. Para publicar precios nuevos, elegir explícitamente «Fecha para esta publicación» en la tarjeta de la categoría y después usar «Publicar lista». El sistema no completa ni sustituye esa fecha con la del día.

El cambio de fecha desde la interfaz fue probado y confirmado por el usuario el 20/10/2026. Esta validación no sustituye las pruebas pendientes de publicación de precios, PDF y acceso desde otras PC.

Para probar el flujo completo sin tocar los precios reales, el servidor acepta `LASA_DATA_DIR` como directorio de datos alternativo y `LASA_HOST` para limitarlo a `127.0.0.1`. Las pruebas automáticas usan una carpeta temporal aislada; en uso normal siguen vigentes los archivos de `data/`.

Prueba de integración agregada el 20/10/2026: guardar un precio nuevo en el borrador no modifica la consulta pública; publicar la categoría sí lo actualiza; corregir la fecha pública conserva el precio y no vuelve a publicar el borrador. La prueba usa credenciales y precios ficticios; todavía falta validar el flujo de publicación desde la interfaz con el usuario.
