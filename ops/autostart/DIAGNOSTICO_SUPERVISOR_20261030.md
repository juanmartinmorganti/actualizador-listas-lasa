# Diagnóstico del supervisor WSL — 30/10/2026

Inspección de solo lectura de Windows/Linux alrededor de las 12:00–12:05 UTC. No se ejecutó ni modificó la tarea, no se reinició Windows/WSL/LASA, no se cerraron aplicaciones ni se solicitaron contraseñas. Solo se añadió este informe al proyecto. No hubo commit/push.

## Resultado

La causa exacta del resultado 1 **no está comprobada**. Se comprobó un cierre de sesión del propietario seguido de suspensión, próximo al final del journal anterior de Debian. Es una correlación temporal, no evidencia suficiente para atribuir la salida de wsl.exe o del supervisor a ese evento. Falta el instante y motivo de terminación de la acción.

LASA está sano, pero la tarea no está manteniendo WSL: Ready, habilitada, resultado 1, última ejecución 29/10/2026 17:44:13 UTC, cero ejecuciones perdidas, sin próximo disparo calculado. No existe actualmente un proceso del script supervisor. La continuidad actual de Debian con VS Code y sesiones abiertas no prueba independencia de esas sesiones.

## Configuración real comparada con XML

Se leyó Export-ScheduledTask y propiedades efectivas; no se registró ni inició nada.

| Propiedad | Real | Comparación |
| --- | --- | --- |
| Acción | C:\WINDOWS\System32\wsl.exe | Igual |
| Argumentos | --distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh | Iguales |
| Directorio de trabajo | No especificado | Igual; las rutas Linux son absolutas, no hay dependencia explícita del cwd |
| Propietario | Resuelve al propietario PC5-JUAN\PC | Identidad comparada por SID solo en memoria; coincide |
| LogonType / privilegios | Password / Limited | Equivale a Password / LeastPrivilege |
| Disparador | BootTrigger habilitado, demora PT30S | Igual; sin disparador de login ni reanudación |
| Duración | PT0S | Ilimitada, igual |
| Instancias | IgnoreNew | Igual |
| Reintentos | PT1M, 999 | Igual; no hay evidencia de que se hayan agotado ni de reintentos concretos |
| Batería | No impide iniciar ni detiene al cambiar a batería | Igual |
| Red / inactividad | RunOnlyIfNetworkAvailable=false; RunOnlyIfIdle=false | Sin dependencia efectiva |
| Inicio pendiente | StartWhenAvailable=true | Igual |
| Terminación / demanda | AllowHardTerminate=true; AllowDemandStart=true | No demuestra que alguien haya terminado la tarea |

Windows normaliza el XML: añade URI, IdleSettings y UseUnifiedSchedulingEngine=true; omite valores predeterminados como RunLevel, Enabled y algunas condiciones. IdleSettings.StopOnIdleEnd=true no demuestra parada por inactividad, porque RunOnlyIfIdle=false. La primera comparación directa de UserId con un SID devolvió false por representación nombre/SID; al normalizar ambas identidades, coincide. No se detectó una divergencia esencial que explique el fallo. No se guardó el XML exportado con identificadores privados.

El auxiliar instalado coincide byte a byte con ops/autostart/wsl-keepalive.sh. No se ejecutó el supervisor para probarlo.

## Evidencia temporal y registros

| UTC | Evidencia |
| --- | --- |
| 29/10 17:44:13 | Inicio manual documentado de la tarea; después se observó Running/0x41301 y supervisor PID 35474 |
| 29/10 18:01:12 | Última entrada del boot Linux anterior d453c548066f480fb05fe815df196240: señal fatal 6 de node PID 4871 |
| 29/10 18:01:17.6005825 | LocalSessionManager evento 23, record 4575: cierre de sesión; identidad del propietario confirmada en memoria |
| 29/10 18:01:17.7842604 | Evento 24, record 4579: desconexión de sesión del mismo propietario |
| 29/10 18:01:18.0758743 | System/Kernel-Power evento 42, record 84991: suspensión, motivo Application API |
| 30/10 10:01:37.3394108 | Power-Troubleshooter evento 1, record 85015: suspensión desde 29/10 18:01:17.8978504 hasta reactivación 30/10 10:01:35.7346836 |
| 30/10 11:35:43 | Primer journal del boot Linux actual cac24d8786ad46b484276db85174fdf4 |
| 30/10 11:35:45 | Inicio de lasa.service actual, PID 211 |

Windows conserva LastBootUpTime=15/10/2026 13:02:59.500 UTC: el nuevo boot Linux no corresponde a un nuevo arranque completo de Windows. No se determinó quién inició Debian hoy ni qué terminó la instancia anterior.

El PID 4871 del mensaje fatal no es el MainPID LASA 22221 documentado ayer ni el supervisor bash. No se atribuye ese fallo a LASA. El journal de la unidad anterior no registra otra salida después del inicio de PID 22221; el SIGKILL de las 15:13:28 pertenece a la prueba autorizada y documentada de recuperación de etapa 2A, anterior al registro de la tarea.

El evento 107 de reanudación aparece con hora 29/10 18:01:20.833 antes de la corrección de reloj al despertar. El evento Kernel-General 1 de 30/10 10:01:34 registra el salto desde 29/10 18:01:20.8315. Para correlacionar suspensión deben usarse también los campos internos del evento Power-Troubleshooter; no ordenar únicamente por TimeCreated.

TaskScheduler/Operational está deshabilitado y no devolvió eventos. Maintenance sí tiene eventos, pero ninguno de los consultados desde 17:40 UTC referencia LASA-WSL-Startup. La enumeración de logs no devolvió canales coincidentes de WSL/Lxss/Hyper-V-Compute. La consulta de Application para errores 1000/1001/1002 con referencias WSL/LASA/task/vmcompute, desde 29/10 20:40 UTC, no devolvió coincidencias; **no cubre** el intervalo 18:01 ni descarta un error allí. No se habilitaron canales ni auditorías.

El supervisor no configura archivo de log; el chequeo periódico redirige stdout/stderr a /dev/null. Su ejecución directa por wsl.exe tampoco captura salida en Windows. Por ello no se conservan motivo, contador, boot_id o código del chequeo que terminó la acción.

Hipótesis abiertas: salida explícita del supervisor por salud/estado de unidad; terminación de WSL o de wsl.exe alrededor del cierre de sesión/suspensión; terminación externa de procesos; fallo de lanzamiento o reintento. El valor 1 aislado no distingue estas causas. No se comprobó agotamiento de 999 reintentos, parada por batería, límite temporal ni error de contraseña.

## Salud e integridad

lasa.service active/enabled, MainPID=211, NRestarts=0, inicio 30/10 11:35:45 UTC. lasa-check.py --health confirmó una única instancia Node **de LASA**, sockets 4000 propios, catálogo y autenticación correctos. Existen procesos de desarrollo adicionales; no se afirma que haya un único Node en todo Debian.

Ambos archivos comerciales son arrays JSON válidos, coinciden byte a byte con el respaldo privado 20261029T140147.663325Z y el respaldo coincide con su manifiesto SHA-256. Sin mostrar datos ni hashes:

| Archivo | Bytes | Permisos | Inode | mtime_ns |
| --- | ---: | --- | ---: | ---: |
| productos.json | 71773 | 0644 | 18947 | 1792515820794413652 |
| publicadas.json | 72149 | 0600 | 135815 | 1792516340386418700 |

mtime estable durante la lectura. No hubo escrituras ni restauraciones; no se ensayó publicar/editar. No se generaron PDFs en este diagnóstico.

## Defecto de diseño y corrección mínima recomendada — NO aplicada

El supervisor mezcla dos responsabilidades: mantener una ejecución WSL y evaluar la salud comercial. Sale con el mismo código 1 si la unidad no está habilitada, no se activa durante aproximadamente 90 segundos, o fallan tres controles consecutivos. Descarta toda explicación del control. Un fallo de catálogo, autenticación o disponibilidad transitoria puede eliminar el ancla WSL aunque Node siga vivo. El supervisor no recupera LASA; systemd tampoco corrige un proceso vivo pero enfermo. Esta debilidad está comprobada por el código; no demuestra que haya causado este incidente.

Recomendación mínima: conservar la tarea por identidad propietaria y systemd como único dueño de Node; convertir el auxiliar en un ancla persistente independiente de la salud. Registrar transiciones de salud como diagnósticos, sin finalizar el ancla ni reiniciar LASA ante fallos HTTP/datos. Acotar cada chequeo con un plazo total, añadir demora razonable entre controles y guardar solo UTC, boot_id, PID, fase y códigos, con permisos privados y rotación. Capturar arranque/salida y señales atrapables; una terminación abrupta puede impedir el último log.

Para diagnosticar también fallos anteriores a Linux, proponer un envoltorio Windows local que registre inicio/fin de wsl.exe y su código, sin credenciales, mensajes comerciales ni lanzamiento de Node. Mantener un único responsable de reintentos: si se conserva RestartOnFailure de Task Scheduler, el envoltorio no debe sumar otro bucle de reinicio. El historial Operational sería útil si se autoriza habilitarlo; no recuperará evidencia pasada. No cambiar a SYSTEM, S4U ni otra distribución como supuesto arreglo.

Esto mejora observabilidad y evita que un fallo de salud quite el ancla; no garantiza sobrevivir a una terminación externa, cierre de sesión o suspensión. Si pruebas instrumentadas demuestran que Windows termina la acción al cerrar sesión, revisar ese resultado antes de añadir disparadores o cambiar arquitectura. No hay evidencia para recomendar modificar ahora condiciones o reintentos de la tarea.

Microsoft advierte que servicios systemd no mantienen viva por sí solos la instancia WSL: https://learn.microsoft.com/en-us/windows/wsl/systemd . Un comando persistente sigue siendo justificable con este diseño; reemplazarlo por systemctl start, un servicio sleep dentro de systemd o un comando de boot que termine no resuelve ese requisito. Los parámetros de inactividad de VM no deben asumirse equivalentes a mantener viva una distribución y su sesión. Para disponibilidad de servidor independiente de sesiones, una VM/Linux dedicado es una alternativa arquitectónica a evaluar, con mayor alcance que la corrección mínima. Ningún supervisor da servicio mientras Windows está suspendido.

## Prueba futura y reversión propuestas — NO ejecutadas

1. Autorizar aparte la instrumentación y despliegue del auxiliar/envoltorio, conservar versiones previas y XML real en ubicación privada. No reutilizar el asistente de registro con lock ni pedir credenciales en chat. No tocar unidad LASA ni datos.
2. Con autorización para iniciar la tarea, observar Running, un único ancla y MainPID LASA sin cambios durante varios ciclos. Probar IgnoreNew de forma controlada y comprobar códigos/logs. Ensayar un fallo de salud con un chequeo simulado aislado, sin alterar datos ni detener el servicio; el ancla debe persistir y registrar degradación/recuperación.
3. Tras guardar trabajo, probar cierre de terminales/VS Code y cierre de sesión en una ventana autorizada, recogiendo evidencia desde Windows sin iniciar WSL. Suspensión/reanudación es una prueba distinta, también autorizada; documentar interrupción esperable durante suspensión. Si la acción termina, preservar ambos extremos del log antes de intervenir.
4. Solo después, un reinicio completo con autorización nueva y todas las condiciones de etapa 2C satisfechas. Esperar al menos dos minutos antes del PIN, verificar Windows primero y luego Linux únicamente si Debian ya figura en ejecución. No usar un reinicio para descubrir un defecto aún no instrumentado.
5. Reversión específica: con autorización y tras preservar evidencia, detener únicamente la tarea/ancla identificada si hiciera falta, restaurar auxiliar y acción anteriores, conservar lasa.service habilitado/activo y verificar instancia/salud/datos. Detener el ancla puede dejar WSL sin una sesión persistente: realizar reversión con sesión diagnóstica controlada y ventana acordada. No detener systemd/LASA, no lanzar Node manual ni restaurar JSON. No usar la reversión completa del README para una corrección exclusiva del supervisor.

## Revisión del procedimiento de reinicio y verificador

Leídos ETAPA2C_REINICIO.md y verify-after-reboot.ps1. Análisis sintáctico con Parser de Windows PowerShell: **0 errores**, sin ejecutar el script. No se preparó una copia Windows ni se ejecutó reinicio/verificador.

La orden documentada shutdown.exe /r /t 0 sin /f es consistente con evitar el cierre forzado; Microsoft indica que un timeout mayor que cero implica /f: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/shutdown . La autorización anterior no se ejecuta en esta tarea de solo diagnóstico.

El verificador consulta Windows, tarea y eventos antes de HTTP y no llama a wsl.exe. Es adecuado como colector inicial, pero tiene límites que deben corregirse antes de depender de él:

- Si falla CIM o la consulta de tarea, ErrorActionPreference=Stop impide guardar toda la evidencia parcial. Capturar errores por fase y guardar el resultado incluso ante tarea ausente.
- Get-WinEvent entrega por defecto los más recientes; Select-Object -First 200 puede descartar el primer login. Consultar de más antiguo a más nuevo y marcar truncamiento, con filtros explícitos de proveedor e ID.
- Available=false mezcla ausencia de eventos, acceso denegado y log deshabilitado. Registrar estado del canal y código de error sanitizado por separado.
- Falta TaskScheduler/Operational si estuviera disponible. Capturar instancias y códigos de ejecución, no interpretar solo LastRunTime: puede corresponder a un reintento posterior al login.
- Los ID/horas sin identidad y tipo de login no acreditan primer login del propietario. Correlacionar en memoria y guardar únicamente coincidencia/tipo/UTC; considerar Security 4624 solo si hay acceso y auditoría disponibles, sin habilitarlos automáticamente. Tratar auto-login y datos insuficientes como inconcluyentes.
- HTTP no implica salud completa ni arranque anterior al login. Conservar después boot_id, inicio real de unidad, reloj UTC Windows/Linux, autenticación/catálogo/PDF e integridad. El verificador ya marca veredicto pendiente: no cambiarlo a éxito solo por HTTP.
- Ejecutar desde copia local Windows previamente validada, con política vigente; no desde UNC WSL, pues acceder a esa ruta durante la verificación podría iniciar Debian. Obtener primero lista de distribuciones en ejecución sin lanzar comandos en Debian. No abrir terminal WSL, VS Code ni esta sesión de diagnóstico Linux antes de recoger esa evidencia.

El README mezcla diagnóstico histórico, estado de etapas y una reversión completa que detiene LASA. Conviene aclarar estado vigente y remitir a una reversión exclusiva del supervisor; aquí no se reescribieron procedimientos ni scripts.
