# Etapa 2D — supervisor corregido activado

30/10/2026. Actualización y una única prueba manual autorizadas. Resultado: **tarea Running, supervisor único y LASA sin interrupción observada**. No hubo reinicios ni parada/reinicio del servicio. No se probaron cierre de sesión ni suspensión.

## Estado previo y respaldo

Se revisaron ESTABILIZACION_SUPERVISOR.md, auxiliares, instalador, preparación Windows y diseño de la tarea. Antes de desplegar: LASA active/enabled, PID 211, NRestarts=0, inicio 11:35:45 UTC; instancia única del aplicativo y puerto 4000 propios. Los dos JSON eran válidos y coincidían con los respaldos privados del 29/10 y su manifiesto.

La tarea estaba Ready/habilitada, resultado 1, última ejecución 29/10 17:44:13 UTC. Acción y argumentos esperados; propietario verificado por identidad, Password/Limited, BootTrigger habilitado +30 s, PT0S, IgnoreNew, reintentos cada minuto hasta 999, sin requisito de red/inactividad/batería. No había supervisor previo activo. No fue necesario modificar ni registrar la tarea ni cambiar credenciales.

Copias privadas:

- Linux: `/home/kirwan/.local/share/lasa-backups/etapa2d-20261030T1216Z/`. Auxiliares anteriores, manifiesto con permisos/propietarios, estado del servicio, huella de unidad y metadatos/huellas de datos. No se copiaron credenciales. El respaldo comercial anterior sigue disponible y verificado.
- Windows: `C:\Users\PC\AppData\Local\LASA\etapa2d-20261030T1216Z\`. XML real y estados antes/después; ACL para propietario, SYSTEM y Administradores. Una primera asignación ACL falló al interpretar SID como nombre; se corrigió usando objetos SID antes de escribir el respaldo. No afectó la tarea.

## Instalación e inicio

Se instalaron exclusivamente `/usr/local/libexec/lasa/wsl-anchor.py` y `/usr/local/libexec/lasa/wsl-keepalive.sh`, root:root 0755, idénticos al proyecto. Publicación atómica primero de Python y después del lanzador. No se ejecutó install-linux.sh, daemon-reload ni comandos de inicio/reinicio de LASA. Se usó la administración estándar WSL como root únicamente para copiar esos auxiliares; Debian ya estaba ejecutándose.

Carpeta de registro del propietario preparada y verificada sin artefactos previos: `/home/kirwan/.local/state/lasa/anchor`, 0700. Registro nuevo 0600. Registros acotados de 64 KiB con dos respaldos, solo metadata.

Una única llamada Start-ScheduledTask, protegida por `single-start.lock` creado antes de la llamada. No se repitió el inicio para probar IgnoreNew ni se lanzó un ancla manual adicional.

## Evidencia final

| UTC | Evidencia |
| --- | --- |
| 12:17:42 | LastRunTime de la tarea |
| 12:17:42.524629 | Registro start del ancla PID 3758 |
| 12:17:43.077044 | Registro health_ok, código 0, mismo PID |
| 12:18:30.376383 | Tarea Running/habilitada, LastTaskResult=267009 (0x41301, en ejecución), XML idéntico al respaldo |
| Control final | Mismo supervisor vivo tras aproximadamente 50 segundos, más de un ciclo de salud |

Boot ID Linux sin cambios: cac24d87-86ad-46b4-8427-6db85174fdf4. Se comprobó un único proceso wsl-anchor.py, usuario kirwan, y lock retenido. LASA conserva MainPID=211, NRestarts=0, active/enabled y el mismo instante de inicio. La unidad conserva su huella. No se encontró otra instancia Node **de LASA**; esto no excluye procesos Node de herramientas de desarrollo.

## Pruebas sobre el aplicativo activo

- lasa-check.py --health --expected-pid 211: correcto; página, catálogo idéntico a publicaciones, administración habilitada y borrador anónimo rechazado.
- Sesión diagnóstica efímera firmada solo en memoria: lectura de borrador correcta; firma alterada rechazada 401. No se ensayó ni solicitó contraseña administrativa real.
- PDF de borrador anónimo: 401.
- Lista pública Moldes: PDF válido, 84912 bytes.
- Catálogo público completo: PDF válido, 638629 bytes.
- Vista previa autenticada Moldes: PDF válido, 84912 bytes.
- Ambos JSON conservaron huella, inode, mtime y permisos del estado previo. No se ejecutaron escrituras comerciales ni publicaciones. Los PDF se validaron en memoria, sin guardarlos en el repositorio.

Resultado privado de controles: `checks-after.json` en el respaldo Linux. Estado final de tarea: `task-after.json` en el respaldo Windows. No fue necesaria reversión. La comprobación confirma continuidad del mismo proceso LASA y salud en los instantes observados; no es una monitorización continua de solicitudes externas.

## Reversión y límites

La reversión específica de ESTABILIZACION_SUPERVISOR.md sigue disponible: conservar evidencia y sesión diagnóstica, detener únicamente tarea/ancla identificada si falla, restaurar atómicamente lanzador anterior validado y conservar LASA bajo systemd. No restaurar JSON ni aplicar la reversión completa que detiene el servicio. No se ejecutó esa reversión porque las verificaciones pasaron.

No se modificaron configuración/credenciales de tarea, servicio, datos, IP, firewall, red ni energía. No se cerraron aplicaciones ni se hizo commit/push. No se habilitó historial operativo de Task Scheduler ni se instaló envoltorio Windows.

Quedan pendientes las pruebas autorizadas por separado de cierre de sesión, suspensión/reanudación y arranque anterior al login. El resultado manual no demuestra arranque previo al login ni supervivencia al cierre de sesión. La causa histórica del código 1 continúa sin comprobarse. Los errores de wsl.exe anteriores al inicio de Python siguen sin registro propio; una terminación abrupta puede impedir registrar la salida. No se hicieron pruebas de fallo sobre el servicio real ni un segundo inicio de tarea.
