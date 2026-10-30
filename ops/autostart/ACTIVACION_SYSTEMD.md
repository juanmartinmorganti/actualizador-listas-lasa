# LASA — etapa 2A: activación controlada de systemd

Fecha: 29/10/2026. Activación del servicio Linux autorizada por el usuario. No se cambió código del aplicativo, autenticación, red, puertos, energía ni datos comerciales. No se registró la tarea Windows ni se reinició Windows o WSL. Sin commit ni push.

## Estado final

| Comprobación | Resultado |
| --- | --- |
| Unidad | `lasa.service`, activa (`active/running`) y habilitada (`enabled`) |
| PID manual anterior, identificado en vivo | **13621** |
| Primer PID bajo systemd | **21693** |
| PID final tras prueba de recuperación | **22221** |
| Reinicios automáticos | `NRestarts=1` |
| Usuario / grupo | `kirwan` / `kirwan` |
| Ejecutable y directorio | `/usr/bin/node`, `/home/kirwan/p/actualizador-listas-lasa` |
| Listener | `0.0.0.0:4000`, perteneciente exclusivamente al PID 22221 |
| Cgroup / padre | `/system.slice/lasa.service`, PID padre 1 |
| Entrada / salida | `/dev/null` y journald; sin dependencia de terminal |
| Reinicio ante fallo | `Restart=on-failure`, espera 5 segundos |

## Preparación y reversión

Se leyeron completos el README, la unidad, los auxiliares Linux, el script PowerShell y el XML Windows. Se validaron rutas, usuario/grupo, archivos privados (`700/600`), dependencias y binario Chromium. La unidad no añade restricciones incompatibles con el sandbox de Chromium y utiliza rutas explícitas para datos, autenticación y caché.

Se comprobó nuevamente que los dos respaldos privados de `/home/kirwan/.local/share/lasa-backups/20261029T140147.663325Z/` son JSON válidos y coinciden con los originales mediante SHA-256, sin mostrar valores. Los archivos de datos reales siguen en `data/productos.json` y `data/publicadas.json`.

Antes de detener nada se identificó el Node por ejecutable, argumentos, directorio, usuario y sockets. Se conservó su entorno solo en memoria para poder relanzarlo exactamente, y se abrió un pidfd para evitar señalar un PID reutilizado. La migración incluyó reversión automática: deshabilitar/detener exclusivamente la unidad y recuperar un Node manual como `kirwan` si fallaba el arranque o alguna prueba crítica. No fue necesario ejecutarla.

`sudo -n` requería contraseña; se usó la administración estándar de WSL mediante `wsl.exe --distribution Debian --user root`, dentro de la autorización de instalar el servicio, sin solicitar ni mostrar credenciales y sin reiniciar la distribución.

## Cambios instalados

- `/etc/systemd/system/lasa.service`: root, permisos `644`.
- `/usr/local/libexec/lasa/lasa-check.py`: root, permisos `755`.
- `/usr/local/libexec/lasa/wsl-keepalive.sh`: root, permisos `755`, **solo copiado, no ejecutado**. Queda disponible para la futura tarea Windows.
- Enlace de habilitación `/etc/systemd/system/multi-user.target.wants/lasa.service`.
- Se ejecutó `daemon-reload`, se migró el proceso a la unidad y se habilitó el servicio solo después de las pruebas.

Los archivos instalados coinciden byte a byte con los preparados en `ops/autostart/`. La configuración administrativa sigue en su archivo privado original y no se copió a la unidad. No se modificó ningún archivo del sistema fuera de la instalación descrita.

## Pruebas e interrupción

1. **Instancia única:** se detuvo únicamente el PID manual real con SIGTERM y se esperó su salida. El preflight confirmó ausencia de instancias y puerto libre antes de arrancar systemd. En los controles posteriores se exigió una sola instancia y que todos los sockets de escucha 4000 fueran suyos. No se arrancó un segundo Node junto al anterior.
2. **Migración:** intervalo medido desde la señal de parada hasta recuperar salud: **1,553 segundos**. Es el intervalo observado por la comprobación, no una medición continua de solicitudes de usuarios externos.
3. **Pruebas funcionales iniciales:** página y catálogo 200; catálogo idéntico a `publicadas.json`; administración habilitada; borrador y PDF de borrador anónimos 401; HTML arbitrario 400. Una sesión diagnóstica efímera, firmada solo en memoria con la configuración existente, permitió leer el borrador; la firma alterada fue rechazada. No se conoció ni ensayó la contraseña real ni se cambió la configuración administrativa.
4. **PDF bajo systemd:** lista pública, catálogo completo y vista previa autenticada devolvieron PDF válido. Esto valida la ejecución de Chromium con sandbox y la caché bajo el nuevo entorno systemd. No se ejecutaron escrituras ni publicaciones para probar.
5. **Recuperación real ante fallo:** tras comprobar que el cgroup contenía únicamente el Node principal, sin trabajadores PDF activos, se envió SIGKILL solo al MainPID mediante `systemctl kill --kill-whom=main`. No se usó SIGABRT ni se generó un core deliberadamente. Systemd reinició automáticamente después de su espera configurada; nuevo PID 22221, `NRestarts=1`, recuperación de salud en **6,113 segundos** desde la señal.
6. **Después del fallo:** se repitieron catálogo, autenticación y los tres PDFs, todos correctos. La prueba de fallo ocasionó una segunda interrupción breve y controlada, medida con el mismo criterio que la migración.
7. **Cierre de terminal:** se abrió una terminal de diagnóstico, se confirmó PID 22221 y salud, se salió de esa terminal y se comprobó desde otra ejecución que el mismo PID seguía activo, habilitado y sano. No se cerraron VS Code ni terminales reales del usuario. El proceso pertenece a systemd, padre 1 y stdin `/dev/null`; no al grupo de la terminal de prueba.
8. **Integridad:** al finalizar, ambos JSON conservaron SHA-256, mtime, inode y permisos originales. No se restauraron, reescribieron ni editaron precios, fechas o publicaciones.

No se volvió a ejecutar `npm test`: no cambió el código del aplicativo. Se probaron directamente el servicio instalado, el entorno real de PDF y la recuperación de systemd, que son el objeto de esta etapa. Resultados estructurados: [etapa2a-resultados.json](etapa2a-resultados.json). Los auxiliares transaccionales y controles privados quedan en `/tmp/lasa-systemd-20261029/`.

## Operación y límites pendientes

Consultas de solo lectura:

```bash
systemctl status lasa.service --no-pager
systemctl show lasa.service -p MainPID -p ActiveState -p UnitFileState -p NRestarts
python3 /usr/local/libexec/lasa/lasa-check.py --health
journalctl -u lasa.service -n 50 --no-pager
```

No ejecutar `npm start` ni otro `node server.js` mientras la unidad esté activa. Si hay un fallo persistente, systemd limita los reintentos a tres arranques por 120 segundos; corregir la causa antes de autorizar `reset-failed/start`. No se configuró reinicio automático de un proceso que permanezca vivo pero deje de responder.

**Esta etapa no inicia WSL al arrancar Windows ni garantiza mantener viva la VM cuando desaparezcan todas las sesiones WSL.** La unidad inicia LASA cuando arranca Debian; la futura tarea Windows y su supervisor siguen pendientes. La prueba de terminal cubrió una terminal aislada, no el cierre de todas las sesiones ni un reinicio Windows. No se registró ni inició ninguna tarea de Windows en esta activación.

También quedan pendientes HTTPS y acceso LAN, persistencia/rotación de journal si se necesita conservar logs entre reinicios, y una copia de respaldo en otro soporte. La suspensión de Windows todavía interrumpe el servicio. No se modificó ninguna de estas configuraciones.

Para una reversión futura autorizada, usar el procedimiento del README: `systemctl disable --now lasa.service`, confirmar puerto libre y recuperar el modo manual con rutas explícitas como `kirwan`. No revertir la seguridad PDF ni restaurar datos comerciales por un problema de arranque.
