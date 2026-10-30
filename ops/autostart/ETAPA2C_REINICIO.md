# Etapa 2C: preparación de prueba real

**30/10/2026: prueba bloqueada; corrección aislada pendiente de activación.** Antes de retomar, seguir [ESTABILIZACION_SUPERVISOR.md](ESTABILIZACION_SUPERVISOR.md). El verificador revisado preserva evidencia parcial y busca el evento interactivo más antiguo disponible del propietario en Security; no demuestra cobertura de auditoría completa y mantiene veredicto inconcluyente hasta correlación. No usar el PID ni estado de tarea históricos como condición vigente.

Estado: **reinicio NO ejecutado**. Requiere resolver riesgos de aplicaciones abiertas y confirmación final. No se modificaron tareas, servicios, red ni datos.

## Estado previo observado, 29/10/2026 17:53 UTC

- LASA activo/habilitado, PID 22221, NRestarts=1; arranque del proceso 15:13:34 UTC.
- Una instancia y catálogo/autenticación correctos mediante lasa-check.py.
- Tarea LASA-WSL-Startup Running/habilitada; última ejecución 17:44:13 UTC; resultado 267009 (0x41301, en ejecución).
- Último arranque Windows 15/10/2026 13:02:59.500 UTC.
- Ambos respaldos privados válidos y coincidentes con originales: `/home/kirwan/.local/share/lasa-backups/20261029T140147.663325Z/`.
- Registros System, Winlogon y LocalSessionManager habilitados. TaskScheduler Operational deshabilitado; no se habilitó.
- Excel, Word, Bloc de notas y otras aplicaciones abiertas. Configuración no respondía. No es posible garantizar por enumeración de procesos que no existan documentos sin guardar.

## Antes de autorizar el reinicio final

Guardar/cerrar documentos y resolver la ventana no respondiente. Copiar y validar `verify-after-reboot.ps1` en una carpeta Windows local (no UNC WSL), sin modificar políticas de PowerShell. Guardar allí también el estado previo actualizado. Revalidar salud, respaldos e integridad inmediatamente antes del reinicio. El verificador preparado todavía no se copió ni ejecutó en Windows.

La orden prevista, solo tras confirmación final, es `shutdown.exe /r /t 0`, sin `/f`. Un tiempo mayor que cero implica cierre forzado según Microsoft; no usarlo. No reintentar si el reinicio queda bloqueado; guardar documentos y revisar primero. Un único intento autorizado.

## Después del reinicio

1. Permanecer en la pantalla de acceso al menos dos minutos; luego iniciar sesión. Un acceso automático puede hacer la prueba inconcluyente y debe constar en el informe.
2. No abrir VS Code, terminal WSL ni el aplicativo antes de recoger evidencia.
3. Ejecutar la copia local Windows: `powershell.exe -NoProfile -File "RUTA_LOCAL\verify-after-reboot.ps1"`. El script consulta tarea, eventos y HTTP local; **no invoca wsl.exe**. Guarda JSON local con horarios y códigos, sin mensajes completos ni credenciales. No inicia ni modifica tareas.
4. Si falla tarea o HTTP, conservar el resultado y pedir diagnóstico antes de iniciar manualmente Debian. El script no recupera servicios.
5. Confirmar desde Windows que Debian ya está ejecutándose (consulta de distribuciones en ejecución, sin iniciar ninguna). Solo entonces consultar Linux: `systemctl show lasa.service -p MainPID -p ActiveState -p UnitFileState -p NRestarts -p ExecMainStartTimestamp -p ActiveEnterTimestamp`; `python3 /usr/local/libexec/lasa/lasa-check.py --health`; journal del arranque actual y boot_id.
6. Identificar el primer evento de login interactivo del propietario en el arranque nuevo, incluyendo posibles accesos automáticos. Correlacionar identidad en memoria sin guardar SID/correo. Comparar arranque Windows, última ejecución de tarea, inicio real de LASA y login; verificar que relojes Windows/Linux concuerden. Los eventos candidatos del verificador no bastan sin comprobar su identidad y tipo. Si faltan eventos o los relojes son ambiguos, declarar resultado inconcluyente.
7. Comprobar PID único y puerto 4000 administrados por systemd, catálogo, acceso anónimo rechazado al borrador, sesión diagnóstica y PDF; volver a comparar datos con respaldos sin mostrar hashes ni escribir datos. Un HTTP correcto después del login por sí solo no demuestra inicio anterior.

## Recuperación disponible, no ejecutada

Primero conservar evidencia del fallo. El diseño y reversión figuran en README.md, ACTIVACION_SYSTEMD.md y ETAPA2B_WINDOWS.md. Esta prueba no autoriza cambiar/deshabilitar tareas ni servicios. Si no arrancó Debian, solicitar autorización para una recuperación manual controlada; no lanzar otro Node junto a systemd ni restaurar JSON. No usar wsl --shutdown ni forzar un segundo reinicio.
