# LASA — etapa 2B: segundo intento controlado

29/10/2026. Se efectuó una única llamada de registro y una única prueba manual de la tarea. No se reiniciaron Windows, WSL ni lasa.service. No se cambiaron red, puertos, energía, Windows Hello ni datos comerciales. Sin commit ni push.

## Identidad y registro

Se comprobó antes del intento que la tarea no existía y que `PC5-JUAN\PC` resolvía al SID de la cuenta Windows propietaria de Debian. La cuenta está habilitada y vinculada a MicrosoftAccount. No se encontró una identidad canónica alternativa verificable en los nombres de identidad consultables; no se inventó ni cambió el propietario.

El asistente permite una representación diferente de la cuenta solo si la identidad ingresada en el cuadro seguro resuelve exactamente al mismo SID. El registro fue aceptado por Windows. No se recopilaron correos o SID en este informe.

Se preparó `register-windows-once.ps1`, se validó su sintaxis y se copió junto con el XML a `C:\Users\PC\AppData\Local\LASA\etapa2b-segundo-20261029\`. El asistente se ejecutó elevado, PID Windows 10060, con la política vigente y sin Bypass. El usuario completó el mecanismo nativo seguro con la contraseña de su cuenta Microsoft. La contraseña se mantuvo únicamente en memoria durante la llamada al Programador; no se escribió en script, XML, resultados o registros del asistente.

El archivo `single-attempt.lock`, creado antes del diálogo, impide reutilizar esa copia para un nuevo intento. El script tiene una sola llamada a `Register-ScheduledTask`, no contiene reintentos ni registra automáticamente otra tarea ante un fallo. La captura de error conserva solo etapa y códigos nativos, nunca objetos de credenciales ni excepciones completas.

Resultado del registro: **Registered**, 29/10/2026 **17:42:41 UTC**, `RegistrationCalled=true`, identidad verificada por SID. La tarea se registró sin ejecutarla automáticamente; después se validó y se inició una sola vez para la prueba manual autorizada.

## Configuración efectiva comprobada

- Nombre: **LASA-WSL-Startup**.
- Cuenta: SID del propietario de Debian, correspondiente a `PC5-JUAN\PC`.
- `LogonType=Password`, privilegios **Limited** (equivalente a LeastPrivilege).
- Habilitada; disparador de arranque Windows con 30 segundos de demora.
- Acción: `C:\WINDOWS\System32\wsl.exe --distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh`.
- Duración ilimitada (`PT0S`), política `IgnoreNew`, reintento por fallo cada minuto hasta 999 veces.
- Sin requisito de red; permite iniciar en batería y no se detiene por pasar a batería.

El XML exportado por Windows omite `RunLevel` cuando tiene el valor predeterminado. Un primer control estricto de presencia del elemento se detuvo antes de iniciar la tarea; se leyó el valor efectivo `Limited` y se comprobó que coincidía con el diseño. No se modificó ni se volvió a registrar la tarea por esa normalización.

## Prueba manual y salud

Se ejecutó `Start-ScheduledTask` una sola vez a las **17:44:13 UTC**. Estado inicial observado: **Running**, habilitada, `LastTaskResult=267009`, equivalente a **0x41301** (ejecución en curso). Una tarea persistente no debe presentarse como completada con resultado 0 mientras continúa ejecutándose.

Se identificó un único supervisor `/usr/local/libexec/lasa/wsl-keepalive.sh`, PID **35474**, usuario `kirwan`. El supervisor no inicia Node ni llama a systemctl start/restart. LASA conserva el PID **22221**, `NRestarts=1`, estado active/enabled y una única instancia del aplicativo propietaria del puerto 4000.

Catálogo público, estado administrativo, rechazo del borrador anónimo y lectura con sesión diagnóstica efímera: correctos. La firma alterada se rechaza. PDF de lista pública, catálogo completo y vista previa autenticada: válidos. No se probó la contraseña administrativa real de LASA ni se modificó su configuración.

Los dos JSON comerciales conservaron contenido, fecha de modificación, inode y permisos. El registro y la tarea no cambiaron la unidad systemd.

## Límites y reversión

**No se probó ni se garantiza todavía el inicio antes del login.** Falta un reinicio real, con autorización separada y comprobación de tiempos sin arrancar manualmente WSL antes de observar la tarea. Tampoco se cerraron todas las sesiones reales del usuario. Siguen pendientes las limitaciones de suspensión y disponibilidad documentadas en el diseño.

Para deshacer únicamente 2B, deshabilitar/detener y retirar `LASA-WSL-Startup`, conservando `lasa.service` activo y habilitado. Verificar que cualquier supervisor residual sea exactamente el proceso de este script antes de terminarlo; no matar Node ni apagar WSL. El procedimiento detallado está en [ETAPA2B_WINDOWS.md](ETAPA2B_WINDOWS.md). No se ejecutó una reversión: el registro y la prueba manual fueron exitosos.

Los archivos locales de preparación no son la acción permanente de la tarea: esta ejecuta el auxiliar Linux instalado y no depende de VS Code, del repositorio Windows ni de una IP temporal de Debian.

Control final: la tarea permaneció Running después de más de un ciclo del supervisor, con LastTaskResult 267009/0x41301. El supervisor conservó PID 35474, LASA conservó PID 22221 y NRestarts=1, y los JSON conservaron contenido y metadatos. No hubo un segundo registro ni un segundo inicio manual. Resumen estructurado: [etapa2b-segundo-resultados.json](etapa2b-segundo-resultados.json).
