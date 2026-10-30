# LASA — etapa 2B: historial del primer intento

**Actualización:** el segundo intento autorizado fue exitoso. Este documento conserva el diagnóstico y la reversión del primero; ver [estado vigente](ETAPA2B_SEGUNDO_INTENTO.md).

29/10/2026. Se revisaron por completo el README, scripts Linux/Windows y XML. Servicio activo y habilitado, PID 22221 y NRestarts=1, sin reinicios en esta etapa. Supervisor instalado igual al preparado, ejecutable y propietario root. No había supervisor persistente previo ni tarea LASA registrada.

## Diseño validado

La tarea `LASA-WSL-Startup` se asocia a `PC5-JUAN\PC`, LogonType Password, privilegios mínimos, disparador de arranque con demora de 30 segundos, duración ilimitada y política IgnoreNew. Acción: `C:\WINDOWS\System32\wsl.exe --distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh`.

El supervisor verifica salud y mantiene la sesión WSL, sin iniciar ni reiniciar Node. No se prevé una segunda instancia del aplicativo. El XML fue validado por Task Scheduler como objeto en memoria. Se verificaron la identidad Windows propietaria, la distribución Debian y las rutas del auxiliar instalado.

La sesión Windows inicial no está elevada. Crear una tarea con BootTrigger exige una operación elevada. Se preparó un asistente local para solicitar UAC y las credenciales mediante el cuadro nativo de Windows PowerShell, manteniendo las contraseñas solo en memoria durante la llamada al Programador. No se usa Bypass ni se modifica ExecutionPolicy. La tarea configurada conserva RunLevel LeastPrivilege: elevar el registro no obliga a elevar la ejecución de la tarea.

Archivos sin secretos copiados a `C:\Users\PC\AppData\Local\LASA\etapa2b-20261029\`: definición XML y `activate-windows-interactive.ps1`. La carpeta tiene control completo para el usuario, SYSTEM y Administradores; el grupo local CodexSandboxUsers tiene lectura/ejecución, no modificación. El asistente no escribe contraseñas, cookies ni configuración administrativa en registros o archivos. `activation-status.json` contiene únicamente fase, nombres y códigos de estado.

## Resultado del intento

El asistente elevado PID Windows 28300 terminó con estado **Failed**, HRESULT `-2146233088`, `Rollback=NotNeeded`. No quedó acreditado un registro exitoso; no se debe anunciar la tarea como activa. Ese código genérico no identifica por sí solo si falló una comprobación previa, se canceló el diálogo o hubo un rechazo de credenciales. Se solicitó al usuario aclaración por un canal de texto que expresamente prohíbe enviar contraseñas.

Se añadió diagnóstico por etapas y códigos fijos al asistente para un eventual nuevo intento. No se relanzó automáticamente ni se insistió con credenciales. Los errores no guardan excepciones completas ni valores secretos.

## Pruebas realizadas

Catálogo público, estado administrativo, rechazo de borrador anónimo, sesión diagnóstica firmada solo en memoria y rechazo de firma alterada: correctos. PDF de lista pública, catálogo completo y vista previa autenticada: válidos. No se probó la contraseña real de LASA. Las pruebas solo leen datos y generan PDFs en memoria: no editan ni publican productos.

La comprobación real de inicio antes del login **no se realizó ni puede declararse resuelta** sin un reinicio autorizado separado. Incluso una ejecución manual exitosa de la tarea no demostraría ese comportamiento.

## Continuación segura

1. Confirmar con el usuario qué ocurrió en los cuadros locales, sin solicitar contraseñas por chat. Verificar otra vez si existe la tarea antes de cualquier reintento; no sobrescribir tareas existentes.
2. Si corresponde reintentar el asistente, actualizar su copia Windows local con la versión revisada y abrirlo con elevación bajo `PC5-JUAN\PC`. Ingresar la contraseña Windows real, no el PIN, únicamente en el cuadro seguro. No modificar política global, no cambiar a SYSTEM ni reemplazar Password por S4U para evitar el diálogo.
3. Como alternativa, importar el XML desde el Programador de tareas elevado, bajo la misma cuenta, ingresando la contraseña localmente. El XML no contiene credenciales.
4. Tras registro exitoso, verificar usuario, LogonType, Enabled y acción; ejecutar la tarea manualmente. Confirmar un único supervisor, el mismo MainPID y NRestarts de LASA y salud. Repetir Start-ScheduledTask para comprobar IgnoreNew, sin duplicar Node.
5. Esperar más de un ciclo de 30 segundos del supervisor, repetir salud/PDF y comparar contenido y metadatos de los dos JSON. Registrar State, LastRunTime y LastTaskResult. Para la tarea persistente, `0x41301` representa ejecución en curso; no afirmar resultado 0 mientras sigue corriendo.
6. Mantener pendiente la prueba de arranque real y solicitar autorización separada para reiniciar Windows.

## Reversión específica de 2B — conservar systemd

A diferencia de la reversión completa del README, **no deshabilitar, detener ni reiniciar lasa.service** para deshacer esta etapa.

Si se creó la tarea en esta etapa y debe retirarse:

```powershell
Disable-ScheduledTask -TaskName 'LASA-WSL-Startup'
Stop-ScheduledTask -TaskName 'LASA-WSL-Startup'
Unregister-ScheduledTask -TaskName 'LASA-WSL-Startup' -Confirm
```

No ejecutar Stop-Service, wsl --shutdown, systemctl stop ni cambiar la red. Verificar luego que LASA conserve PID, esté activo/habilitado y responda.

Si al detener la tarea queda un supervisor huérfano, identificar únicamente los procesos cuyo argumento de script sea exactamente `/usr/local/libexec/lasa/wsl-keepalive.sh`, y verificar UID kirwan y que no existían antes del intento. Terminar solo ese supervisor con SIGTERM mediante pidfd verificado, nunca Node ni procesos de WSL de otros proyectos. No usar `pkill node`, `killall` o cierres por puerto. Confirmar que LASA sigue sano.

Los archivos locales de preparación no se usan como acción permanente de la tarea. Pueden conservarse para auditoría; no contienen contraseñas. No se hicieron commit ni push ni cambios de red, energía, datos comerciales o servicios Linux.

Control final de esta etapa: servicio active/enabled, MainPID 22221, NRestarts=1, ambos JSON con contenido y metadatos intactos; la tarea Windows no está registrada. El último resultado de una tarea no existe todavía: el HRESULT informado corresponde al asistente, no a una ejecución de la tarea.
