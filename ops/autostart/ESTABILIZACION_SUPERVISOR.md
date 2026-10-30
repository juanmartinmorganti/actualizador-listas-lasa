# Estabilización del supervisor — preparado, NO activado

**Actualización: activado el 30/10/2026 con autorización en etapa 2D.** Ver [resultado real](ETAPA2D_ACTIVACION.md). Este documento conserva el diseño preparado y su procedimiento; no repetir el despliegue ni el inicio de tarea como si siguieran pendientes.

30/10/2026. Se leyeron README, diagnóstico, procedimiento 2C, scripts Linux/PowerShell y XML. La causa histórica del resultado 1 sigue sin comprobarse. No se modificó ni ejecutó la tarea Windows, el auxiliar instalado o lasa.service. No hubo reinicios, cierres de aplicaciones, cambios de datos/red/energía ni commit/push.

## Diseño preparado

La tarea conserva su acción wsl.exe → wsl-keepalive.sh, que ahora delega con exec en wsl-anchor.py. Python permanece en primer plano: este proceso de usuario, iniciado por wsl.exe, mantiene la ejecución persistente. Systemd sigue siendo el único dueño de Node. No se inicia ni reinicia LASA desde el ancla.

La salud es un subproceso independiente, con sesión/grupo propios, stdin/stdout/stderr descartados y plazo total de 20 segundos. Timeout o terminación del ancla elimina solo ese grupo de prueba y espera su salida. Fallos repetidos, ejecutable ausente, catálogo inválido o servicio inactivo producen degradación y nunca una salida deliberada del ancla. Entre controles se espera 30 segundos, además del tiempo del control. No se condiciona la vida del ancla a is-enabled/is-active. El chequeo existente conserva la evaluación de procesos, sockets, catálogo y autenticación.

Registro privado en /home/kirwan/.local/state/lasa/anchor: carpeta 0700, archivos nuevos 0600 mediante umask 077; anchor.jsonl y dos respaldos, cada uno hasta 64 KiB. Campos permitidos: UTC, boot_id, PID, evento fijo y código numérico. Se registran inicio, cambio de código de salud, pulso como máximo cada cinco minutos con salud estable y salida. No se guardan stdout, excepciones completas, nombres de usuario, credenciales ni contenido comercial. Códigos de salud: 0 correcto, 124 timeout, 125 cancelación, 127 fallo al lanzar el chequeo; otros códigos provienen del proceso de chequeo. Salida: 128+señal para TERM/INT/HUP; 70 error interno; 75 segundo ancla detectada por flock. El log distingue exit/internal_error/signal_exit/duplicate_anchor.

Si no puede inicializarse el registro o escribir, el ancla continúa: la disponibilidad prevalece, pero faltará evidencia. Si no puede abrirse el directorio/lock, tampoco puede garantizarse la exclusión local; IgnoreNew sigue siendo la primera defensa. No se promete último registro ante SIGKILL, caída de VM, disco lleno o corte eléctrico. flock es suplementario y los logs no son un registro forense resistente a manipulación. El despliegue debe usar un directorio privado del propietario y comprobar que no existan enlaces simbólicos o archivos de otro propietario en el destino.

Errores internos de programación pueden finalizar Python con 70; Task Scheduler conserva la responsabilidad exclusiva de reintentos. No se agregó otro bucle de reinicio, ni disparadores de login/reanudación. El XML y prepare-windows.ps1 permanecen iguales: propietario de Debian, Password/Limited, BootTrigger +30 segundos, PT0S, IgnoreNew, 999 reintentos por fallo cada minuto, sin condición de red/inactividad/batería. No hay evidencia de que esas condiciones causaran el fallo ni justificación para cambiarlas ahora. AllowHardTerminate sigue siendo una posibilidad administrativa, no prueba de terminación previa.

## Verificación posterior

verify-after-reboot.ps1 ahora guarda un checkpoint JSON antes de consultar Windows y después de cada fase. CIM, tarea, información de tarea, canales, login y HTTP tienen aislamiento de errores. Una consulta fallida conserva lo anterior; un fallo de almacenamiento impide garantizar persistencia y debe tratarse como bloqueo. Se escribe un temporal local y se renombra al resultado. El script no invoca wsl.exe, no inicia tareas ni cambia auditoría/políticas.

Los canales distinguen Disabled, NoEvents, ReadError y SkippedUnknownBoot. Se consultan por proveedor/ID, del más antiguo al más reciente, con límite de 2000 y marca Truncated. TaskScheduler guarda únicamente eventos de nuestra tarea, códigos e identificadores de instancia permitidos; si eventos ajenos consumen el límite, Truncated obliga a no concluir cobertura. No se almacenan mensajes ni XML completos.

Security consulta en origen 4624 para el SID del propietario y tipos interactivos 2/10/11/12; toma el más antiguo disponible desde el boot, sin límites de otros usuarios. Guarda coincidencia booleana, tipo, record y UTC, nunca identidad. Reconexion/desbloqueo no se consideran primer login. La consulta puede incluir inicio automático: no se sustituye su tiempo por la entrada del PIN. EarliestAvailableOwnerEvent NO asegura que la auditoría estuviera habilitada todo el intervalo ni que no se hayan perdido eventos. CoverageProven permanece false y el veredicto queda inconcluyente. Si falta acceso a Security no hay fallback que invente primer login a partir de eventos sin identidad.

Antes de una prueba real se debe verificar cobertura de auditoría/retención, posibles accesos automáticos, truncamiento, cambios de reloj, y correlacionar boot Windows, instancias de tarea, inicio real de LASA y login. HTTP después del login no demuestra arranque previo. La correlación Linux y pruebas de catálogo/autenticación/PDF se hacen después de conservar evidencia Windows y comprobar que Debian ya está ejecutándose, sin iniciarlo accidentalmente. Ejecutar siempre una copia Windows local previamente validada; acceder al repositorio UNC WSL durante esa recogida puede falsear la prueba.

## Pruebas aisladas

Ejecutar desde el proyecto:

```
python3 -m unittest discover -s ops/autostart/tests -p 'test_*.py' -v
bash -n ops/autostart/wsl-keepalive.sh ops/autostart/install-linux.sh
```

Resultado: **8 pruebas Python aprobadas**; sintaxis Bash/Python, XML, rutas y dependencia Python validados. Las pruebas Python usan procesos ficticios y carpetas temporales; nunca ejecutan lasa-check real, systemctl o Node LASA. Cubren fallos repetidos y recuperación, proceso de chequeo real que sale con error, timeouts repetidos sin terminar ancla, eliminación de descendientes del chequeo vencido, ejecutable ausente, registro no disponible, SIGTERM contra un ancla de prueba y rotación/privacidad/permisos del registro.

En Windows PowerShell 5.1 se analizaron sintácticamente verificador y test con Parser, sin errores, y se ejecutó test-verifier.ps1 desde una copia temporal Windows respetando la política vigente. Todas las consultas Windows/HTTP están simuladas por funciones: no se consulta ni ejecuta la tarea real. Cubre falta de CIM/tarea, fallo HTTP, canales deshabilitados, evidencia parcial, filtro del primer evento de propietario y ausencia de identidades/mensajes de error en JSON. Los JSON en la carpeta temporal Windows son **sintéticos**, no evidencia de un reinicio ni de salud real.

Validar XML con parser local y comprobar que las rutas de la acción y del lanzador siguen siendo absolutas. install-linux.sh incluye el archivo Python para instalaciones NUEVAS; sigue rechazando una instalación existente. No usarlo como actualizador ni ejecutarlo en esta fase. La validación aislada no demuestra comportamiento real bajo Task Scheduler, cierre de sesión ni inicio previo al login.

## Actualización controlada propuesta — requiere autorización posterior

1. Guardar una captura privada del XML real, estado/horarios/códigos y auxiliares instalados con permisos/metadatos. Revalidar propietario de Debian, rutas, salud, PID, datos y respaldos. Si el estado cambió respecto al diagnóstico, detenerse y revisarlo. No reutilizar asistentes de registro ni solicitar contraseñas.
2. Mantener una sesión diagnóstica controlada durante la ventana: detener un ancla puede dejar WSL sin sesión persistente. Si la tarea está Running, su parada y sustitución deben estar autorizadas expresamente. Conservar lasa.service habilitado/activo y su PID; no hacer daemon-reload ni reiniciar el servicio.
3. Con autorización para instalar los auxiliares, preparar archivos root:root 0755 en nombres temporales dentro de /usr/local/libexec/lasa, verificar sintaxis y coincidencia con el proyecto. Publicar primero wsl-anchor.py y por último sustituir atómicamente wsl-keepalive.sh. Preservar copia privada de la versión anterior. Así el lanzador anterior sigue funcionando hasta que esté disponible Python. No ejecutar el instalador inicial. No alterar XML/acción/credenciales para esta actualización mínima.
4. Con autorización para iniciar la tarea existente, un solo inicio manual. Verificar Running, exactamente un ancla, registro start/health, mismo MainPID y NRestarts de LASA, catálogo/auth/PDF y datos intactos. No arrancar el lanzador manual junto a la tarea. Probar IgnoreNew solo dentro de la autorización y con observación de instancias.
5. Si se necesita cubrir fallos previos a Python, preparar y revisar aparte un envoltorio Windows local que descarte salida de WSL y registre solo inicio/fin/código, sin bucle adicional de reintentos. Esta entrega no cambia la acción ni instala ese envoltorio: fallos de wsl.exe anteriores al ancla continúan sin log propio. Habilitar TaskScheduler/Operational requeriría autorización aparte y no recupera eventos pasados.
6. Tras guardar trabajo, probar cierre de terminales/VS Code y cierre de sesión en ventana autorizada. Observar desde Windows sin iniciar Debian. Cierre de sesión no es una señal que esta corrección garantice sobrevivir: si desaparece la acción, preservar evidencia y diagnosticar, sin atribuir la causa por proximidad temporal.
7. Suspensión/reanudación es otra prueba autorizada y distinta: no habrá disponibilidad mientras Windows esté suspendido. No cambiar energía para encubrir un fallo. Si al reanudar no hay ancla, preservar logs antes de intervenir; no se añadieron disparadores automáticos nuevos.
8. Solo tras estas pruebas, autorizar separadamente un reinicio normal Windows y repetir 2C. Esperar dos minutos antes del PIN, no abrir VS Code/WSL y ejecutar primero el verificador local Windows. No se reutiliza ahora la autorización antigua para reiniciar.

## Reversión específica

Con autorización de la ventana, preservar evidencia; si está ejecutándose, detener únicamente la tarea/ancla verificada, conservando sesión diagnóstica y LASA bajo systemd. Restaurar atómicamente el lanzador anterior desde copia validada. El nuevo Python puede permanecer sin uso hasta retirarlo con autorización. No restaurar el XML salvo que una fase posterior autorizada lo hubiera cambiado. Reanudar la tarea anterior solo con autorización y advertir que vuelve su comportamiento de salida por salud. Verificar PID/salud y JSON; no restaurar datos, no ejecutar Node manual, no detener LASA ni WSL. No aplicar la reversión completa del README.

## Archivos de esta entrega y límites

Modificados: wsl-keepalive.sh, install-linux.sh, verify-after-reboot.ps1, README.md y ETAPA2C_REINICIO.md. Nuevos: wsl-anchor.py, tests/test_anchor.py, tests/test-verifier.ps1 y este informe. Ningún archivo instalado fue sustituido. La dependencia nueva es Python estándar ya requerido por lasa-check; no se instalaron paquetes.

Quedan pendientes la validación real de continuidad al salir de Windows, suspensión, reintentos del Programador e inicio antes del login. Un Linux/VM dedicado es una alternativa de mayor alcance si se necesita disponibilidad de servidor independiente de sesiones Windows. La corrección preparada elimina una causa posible de fragilidad; no resuelve retrospectivamente la causa desconocida del resultado 1.
