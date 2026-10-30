# SecurityLogin — diagnóstico y corrección, 30/10/2026

## Causa comprobada

La identidad actual puede consultar la configuración nativa del canal Security, que está habilitado, pero no puede leer sus eventos. `wevtutil gl Security` terminó con 0; `wevtutil qe Security /c:1 /f:xml` terminó con **5, Acceso denegado**. No se imprimieron eventos de seguridad ni identidades.

El verificador anterior fallaba primero en Get-WinEvent -ListLog Security: LogInfoUnavailable, System.Exception, HRESULT -2146233088, mensaje de operación no válida. Como esa consulta envolvía todo el bloque, no se intentaba la lectura directa. Una consulta preliminar 4624 devolvió NoMatchingEventsFound; por sí sola no demuestra ausencia de eventos/auditoría. Al desacoplar metadatos y consulta real, la ejecución final confirmó System.UnauthorizedAccessException, HRESULT **-2147024891 (0x80070005)** en SecurityLogin. Por tanto, el obstáculo comprobado es acceso insuficiente a los eventos con la identidad actual; no se atribuye a XML o al filtro. No se cambiaron permisos, grupos, auditorías ni políticas; no se intentó elevar la lectura.

## Fuentes alternativas comprobadas y corrección

- **System / Microsoft-Windows-Winlogon / evento 7001**: disponible, contiene UserSid y TSId. Se compara UserSid con propietario de la tarea solo en memoria. El canal Operational de Winlogon no era la ubicación de esos eventos: esa selección anterior no proporcionaba los 7001 necesarios.
- **TerminalServices-LocalSessionManager/Operational / evento 21**: disponible; UserData contiene User, SessionID y Address. Se resuelve únicamente User a SID en memoria y se guarda una coincidencia booleana. No se persisten nombre, SID, dirección ni XML completo. Es corroboración de inicio de sesión, no sustituto de los tipos 4624.
- TaskScheduler/Operational permanece deshabilitado y sin eventos disponibles. No se habilitó; LastRunTime/LastResult de la tarea son evidencia auxiliar, no demuestran por sí solos cuándo inició Linux ni primer login.
- Security sigue siendo una fuente opcional con error explícito: no se oculta ni se declara que no haya logins por estar inaccesible.

Se modificó verify-after-reboot.ps1 para intentar la lectura directa aunque fallen los metadatos, guardar errores con fase/HRESULT/tipo y código de una lista permitida, y consultar ambas fuentes alternativas por proveedor/ID desde el boot, del más antiguo al más reciente. Registra truncamiento, identidades no resueltas y primer evento disponible coincidente por fuente. Se conserva el resultado Security separado. No se ejecutan wsl.exe, tareas, comandos Linux ni cambios de configuración.

No se resuelve automáticamente la cobertura: CoverageProven=false y veredicto inconcluyente hasta contrastar arranque real de Linux/servicio/ancla, retención, primer login y relojes. La primera coincidencia disponible puede no ser el primer login real si se perdieron eventos o el canal no registraba desde el arranque. Una identidad no resuelta, truncamiento, discrepancia entre fuentes o cambios de reloj exige revisión, no éxito automático.

## Validación y prueba real sin reinicio

Parser de Windows PowerShell 5.1 sin errores. Pruebas simuladas de tests/test-verifier.ps1 aprobadas: evidencia parcial ante CIM/tarea/HTTP fallidos; canal deshabilitado; primer 4624 del propietario; metadatos fallidos sin bloquear consulta directa; alternativa System 7001 con identidad coincidente; acceso Security denegado conservando alternativas y finalización. Ninguna prueba simulada consulta la tarea real.

Actualizada la copia `C:\Users\PC\AppData\Local\LASA\etapa2e-20261030\verify-after-reboot.ps1`, preservando copia anterior con sufijo `.before-security-...`. Coincidencia de huellas antes de publicar; ejecución con política vigente, sin Bypass.

Evidencia real de lectura:

`C:\Users\PC\AppData\Local\LASA\etapa2e-20261030\postboot-20261030T122556950Z-18644.json`

Finalizó 12:25:58.4844113 UTC. Tarea Running/habilitada, LastRunUtc 12:17:42, resultado 267009/0x41301; HTTP 200, administración habilitada y consulta anónima. SecurityMetadata y SecurityLogin conservan sus errores. Alternativas sin truncamiento y cero identidades no resueltas:

| Fuente | Primer evento disponible del propietario desde el boot Windows actual | RecordId |
| --- | --- | ---: |
| System Winlogon 7001 | 15/10/2026 13:03:12.6676806 UTC | 82854 |
| LocalSessionManager 21 | 15/10/2026 13:03:14.9695629 UTC | 4468 |

Son evidencia del arranque Windows actual del 15/10, no de un reinicio nuevo. El supervisor/LASA actuales iniciaron el 30/10, por lo que esta lectura no prueba inicio anterior al primer login de ese arranque. No se realizó una nueva inspección Linux que pudiera confundirse con evidencia posterior a reinicio, ni se reinició nada.

## Qué permitirá comparar un reinicio futuro

Primero ejecutar la copia Windows local sin abrir WSL/VS Code ni rutas UNC de Debian. Conservar boot Windows, tarea, eventos 7001/21 del propietario y errores/cobertura. Solo tras comprobar desde Windows que Debian ya está en ejecución, consultar boot_id, arranque de LASA y registro start/health del ancla. Comparar UTC de **inicio real de LASA y ancla** con el primer login corroborado; no usar únicamente LastRunTime de la tarea ni la respuesta HTTP. Si LASA inicia después de un login anterior demostrado, no cumple el objetivo. Para afirmar inicio previo debe justificarse que las fuentes cubren desde boot y no omitieron un login anterior, incluido auto-login; la entrada de PIN no sustituye ese evento.

Con las dos fuentes disponibles se puede recoger evidencia temporal alternativa sin modificar Windows. Falta, para un resultado definitivo, la evidencia de un arranque nuevo y la revisión de cobertura/retención/relojes y concordancia de fuentes. Si resultan insuficientes, declarar inconcluyente. Para leer 4624 haría falta un contexto de lectura de Security autorizado por separado; no se presupone que eso cree eventos que no se auditaron ni se conservaron. Cualquier cambio de grupos, permisos o auditoría requiere autorización adicional y no recupera historia perdida.

Solo se modificaron verificador, sus pruebas y documentación, más su copia Windows y evidencias locales. Sin cambios de tarea, servicios, red, datos comerciales, sesión, suspensión, reinicios, commit o push.
