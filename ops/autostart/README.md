# LASA — inicio automático: diseño y procedimientos

**Etapa 2D, 30/10/2026: supervisor corregido instalado y prueba manual correcta.** Tarea Running/0x41301, ancla única PID 3758; LASA conserva PID 211/NRestarts=0. Catálogo, autenticación, tres PDF e integridad correctos. Ver [informe de activación](ETAPA2D_ACTIVACION.md). Cierre de sesión, suspensión y arranque previo al login siguen pendientes. Los estados anteriores que siguen son históricos.

**30/10/2026: corrección del supervisor preparada, NO instalada.** La tarea real quedó Ready/resultado 1 y su causa exacta sigue sin demostrarse. La versión nueva del proyecto conserva el ancla WSL ante fallos de salud y mejora la evidencia posterior. Ver [estabilización, pruebas, actualización y reversión](ESTABILIZACION_SUPERVISOR.md). Las secciones siguientes conservan el diseño y los estados históricos; no ejecutar el instalador inicial sobre la instalación vigente ni la reversión completa para actualizar solo el supervisor.

**Actualización etapa 2B (29/10/2026): segundo intento de registro exitoso; tarea habilitada y en ejecución.** LASA conserva PID y salud. Ver [resultado del segundo intento](ETAPA2B_SEGUNDO_INTENTO.md). El arranque antes del login sigue pendiente de prueba con un reinicio autorizado.

**Actualización etapa 2A (29/10/2026): servicio Linux instalado, activo y habilitado.** La tarea Windows continúa sin registrar. Ver [informe de activación systemd](ACTIVACION_SYSTEMD.md). El diagnóstico y los procedimientos siguientes documentan la preparación anterior; no repetir la migración Linux ni el instalador sobre la unidad ya instalada.

Diagnóstico del 29/10/2026. No se detuvo ni reinició LASA, Windows o WSL. No se instalaron unidades, habilitaron servicios ni registraron tareas. No se modificaron red, datos comerciales ni autenticación. Los cambios anteriores de seguridad PDF y sus archivos pendientes de Git se conservaron.

## Estado observado

- LASA: Node PID **13621**, usuario y grupo `kirwan` (UID 1000), ejecutable `/usr/bin/node`, comando `server.js`, directorio `/home/kirwan/p/actualizador-listas-lasa`.
- Escucha existente: `0.0.0.0:4000`. No se cambia en esta propuesta. No hay unidad LASA instalada ni habilitada.
- Cgroup `/init.scope`; padre `Relay(5964)` PID 5957. Fue iniciado de forma desacoplada en la activación anterior, no por systemd ni por un gestor de procesos. Su salida está en `/tmp/lasa-activacion-20261029/lasa-nuevo.log`. Sobrevive al cierre de una terminal, pero carece de supervisión y arranque automático; la relación con Relay no sustituye un servicio.
- El proceso no redefine `PORT`, `LASA_HOST`, `LASA_DATA_DIR`, `LASA_AUTH_CONFIG` ni la ubicación de Puppeteer. Su PATH contiene herramientas de desarrollo y directorios Windows; el servicio propuesto usa un PATH Linux mínimo y ejecutables absolutos, sin VS Code, npm, shell de inicio ni NVM.
- Configuración administrativa desde `/home/kirwan/.config/lasa/actualizador-listas.json`, carpeta `700`, archivo `600`, propietario `kirwan`. No hay credenciales administrativas en las variables de entorno del proceso. La administración responde habilitada. No se mostraron valores de configuración privada.
- Debian 13, WSL2 **2.6.3.0**, kernel **6.6.87.2-1**; Windows build **26200.9711**. Debian usa systemd, con estado `running`.
- Distribución registrada: **Debian**, versión 2, usuario predeterminado UID 1000; propietaria Windows **PC5-JUAN\PC**. No se encontraron tareas con referencias directas a WSL/LASA. No se descartan lanzadores indirectos con nombres o argumentos distintos.

## Arquitectura propuesta

`Arranque Windows → tarea de PC5-JUAN\PC → wsl.exe Debian/kirwan → supervisor persistente → systemd → lasa.service → Node`

La tarea **no ejecuta Node ni ejecuta systemctl start**: mantiene un comando Linux en primer plano y comprueba salud. Solo systemd inicia y reinicia Node. Así se evita competir con un segundo lanzador. La migración requiere detener explícitamente la instancia manual antes de iniciar la unidad.

Systemd por sí solo **no mantiene viva la instancia WSL**. La acción persistente de la tarea mantiene abierta la ejecución de `wsl.exe`, sin terminal visible. La tarea no tiene límite de duración, ignora disparos duplicados y puede ejecutarse sin sesión interactiva. [Microsoft: systemd en WSL](https://learn.microsoft.com/en-us/windows/wsl/systemd/).

## Archivos preparados

| Archivo | Función |
| --- | --- |
| `lasa.service` | Unidad de sistema, aún fuera de `/etc/systemd/system` |
| `lasa-check.py` | Solo lectura: configuración, procesos, sockets y salud HTTP |
| `wsl-keepalive.sh` | Acción Linux persistente para la tarea; no inicia Node |
| `install-linux.sh` | Por defecto muestra plan; `--install` copia archivos y hace daemon-reload, sin enable/start |
| `LASA-WSL-Startup.xml` | Definición de tarea Windows, validada en memoria, no registrada |
| `prepare-windows.ps1` | Preparación de XML o registro futuro explícito con `-Register`; no inicia la tarea |

El instalador Linux se niega a sobrescribir una instalación existente. Copia la unidad a `/etc/systemd/system/lasa.service` y los dos auxiliares a `/usr/local/libexec/lasa/`, con propietario root y sin incluir secretos. No se usa el repositorio como ubicación de la acción de Windows: la tarea llama al auxiliar instalado en Linux.

### Unidad systemd

- `User=kirwan`, `Group=kirwan`, WorkingDirectory absoluto y `/usr/bin/node` absoluto.
- `Restart=on-failure`, pausa de 5 segundos y límite de 3 arranques por 120 segundos. Si persiste un fallo, queda fallida para evitar un bucle agresivo. Después de resolver la causa, un operador autorizado puede ejecutar `systemctl reset-failed lasa` y `systemctl start lasa`.
- `After=local-fs.target network.target`; no requiere acceso a Internet ni `network-online.target`: Express escucha en todas las interfaces existentes, no en una IP asignada temporalmente.
- `ExecStartPre` comprueba que no haya ninguna instancia del proyecto ni listener en 4000. Si otra aplicación ocupa el puerto, falla y no la mata. Hay además la exclusión de bind del propio sistema operativo. No se debe arrancar Node manualmente después de migrar.
- `KillMode=control-group` incluye trabajadores PDF y Chromium al detener la unidad. Timeout de parada de 30 segundos y logs en journald. No se configuró rotación global ni persistencia de journald.
- `HOME`, directorios de datos, autenticación y caché de Puppeteer explícitos. Se eliminan del entorno de la unidad las tres variables administrativas para que se use el archivo privado ya existente, sin copiarlo a la unidad ni leerlo como EnvironmentFile: es JSON, no formato de entorno.
- `UMask=0077` restringe archivos nuevos del proceso. No cambia los permisos ni el contenido de los JSON existentes durante la preparación.
- No se añaden `NoNewPrivileges`, `RestrictNamespaces`, `PrivateUsers`, `ProtectHome` ni otras restricciones que podrían impedir el sandbox de Chromium o leer su caché. La compatibilidad real del PDF bajo systemd debe probarse después de una activación autorizada; la validación sintáctica de la unidad no la demuestra.

### Salud y duplicados

`lasa-check.py --health` no escribe ni genera PDF. Comprueba exactamente una instancia Node del proyecto, usuario, propietario de los sockets de escucha en 4000, página HTTP 200, catálogo idéntico a `publicadas.json`, administración habilitada y borrador anónimo 401. `--expected-pid N` rechaza un PID distinto. Ante errores no imprime contenido de archivos, hashes o secretos.

`--preflight` valida archivos y configuración, Node, módulos y disponibilidad del binario Chromium, y exige puerto e instancias libres. No hace bind ni abre puertos. La prueba con el proceso actual fue rechazada correctamente. No valida por sí sola que el sandbox funcione: eso requiere generar PDF tras activar.

El supervisor espera hasta 90 segundos a que la unidad esté activa y hace controles cada 30 segundos. Tres controles fallidos lo terminan con error. Task Scheduler reintenta cada minuto, hasta 999 veces; si se agotan los intentos requiere intervención. El supervisor **no** reinicia un LASA que sigue vivo pero está enfermo: systemd reinicia procesos que fallan, no corrige datos inválidos ni un proceso bloqueado. Revisar journal y causa, sin automatizar reinicios ciegos ni escrituras comerciales.

## Windows antes del inicio de sesión: posibilidad y límites

La tarea propuesta tiene BootTrigger con 30 segundos de demora, identidad **PC5-JUAN\PC**, `LogonType=Password`, `RunLevel=LeastPrivilege`, `ExecutionTimeLimit=PT0S`, `MultipleInstancesPolicy=IgnoreNew`, sin requisito de red y sin detenerse al pasar a batería.

La distribución WSL pertenece a una cuenta Windows. **No usar SYSTEM ni otra cuenta**: podría no ver Debian o ver una distribución distinta. El nombre Linux `kirwan` no reemplaza la identidad Windows propietaria. [Microsoft: distribuciones por usuario](https://learn.microsoft.com/en-gb/windows/wsl/setup/environment).

El arranque antes de una sesión interactiva es **posible como tarea por contraseña de la cuenta propietaria**, pero no se garantiza aún para este equipo: exige validarlo con un reinicio y sin iniciar sesión. Puede fallar por derechos de inicio de sesión por lotes, políticas locales, carga del perfil, disponibilidad de WSL al arrancar o protección/cifrado del perfil/VHD. Si falla, no cambiar automáticamente a SYSTEM ni crear otra Debian.

La tarea necesita la contraseña Windows real, no el PIN de Windows Hello. Debe ingresarse localmente en el Programador o en el cuadro seguro del script; no compartirla en el chat ni guardarla en archivos. Task Scheduler administra la credencial; deberá actualizarse si cambia la contraseña. Registrar bajo esta cuenta, con elevación solo si las políticas de registro lo requieren. Verificar el derecho «Iniciar sesión como trabajo por lotes» y ausencia de una denegación que lo anule; no se modificaron esos derechos.

S4U evita almacenar una contraseña, pero tiene restricciones de credenciales, red y archivos cifrados y no se validó con este WSL. No se elige como equivalente confiable de la tarea Password. Una tarea de inicio de sesión con token interactivo sería una alternativa sin contraseña almacenada, pero **no cumple** el objetivo de arrancar antes del login y requiere una decisión posterior explícita. [Microsoft: contextos de tareas](https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks).

**Limitación detectada:** la política efectiva es `RemoteSigned` en `CurrentUser` (las otras consultas de ámbito devolvieron `Undefined`). PowerShell bloqueó el `.ps1` sin firma ejecutado desde `\\wsl.localhost\Debian\...`. No se alteró ExecutionPolicy ni se usó Bypass. El script se analizó sintácticamente, pero su rama de registro no se ejecutó. El XML sí fue aceptado por Task Scheduler como definición en memoria, sin registrarlo. Para activar se puede importar el XML con la interfaz del Programador; no depende de ejecutar PowerShell. Si se elige el script, copiarlo a una ubicación Windows local autorizada y respetar la política de firma vigente; no debilitarla globalmente.

## Suspensión

Plan activo: Equilibrado. Suspender tras inactividad: **corriente 0 (nunca), batería 600 segundos (10 minutos)**. Hibernar tras inactividad: 0 en ambos casos. Disponibles S3, hibernación e inicio rápido; Modern Standby S0 no está disponible.

La suspensión de Windows detiene la disponibilidad del servidor: ningún servicio dentro de WSL lo evita. Con corriente ya está deshabilitada la suspensión automática; no hace falta cambiarla. Para uso como servidor, mantener alimentación estable y revisar por separado botón de encendido, tapa si aplica y suspensión manual. Apagar solo la pantalla es compatible con servir LASA.

Si se requiere disponibilidad en batería, proponer «Nunca» también en batería, después de autorización y evaluando autonomía; no se aplicó. No deshabilitar hibernación/inicio rápido automáticamente. La prueba principal debe usar **Reiniciar**, y si se requiere disponibilidad después de apagado/encendido, probar también ese caso: inicio rápido puede tener un comportamiento distinto de un reinicio completo. No se proponen wake timers como solución a un servidor permanentemente disponible.

## Activación futura — requiere autorización, NO ejecutar ahora

### 1. Instalar archivos Linux sin tocar el proceso actual

Desde Debian, con el usuario `kirwan`:

```bash
cd /home/kirwan/p/actualizador-listas-lasa
python3 ops/autostart/lasa-check.py --health
sudo bash ops/autostart/install-linux.sh --install
systemctl show lasa.service -p LoadState -p ActiveState
systemctl is-enabled lasa.service
```

Se espera unidad cargada, inactiva y deshabilitada. La instalación necesita root y modifica archivos del sistema y el catálogo de unidades mediante daemon-reload; por eso no se realizó en esta fase.

### 2. Migrar a systemd con ventana breve autorizada

Revalidar los respaldos privados y su coincidencia con los originales mediante la rutina documentada en `ETAPA1_SEGURIDAD_RESPALDO.md`, sin imprimir sus valores. Registrar hashes/metadatos solo en memoria o un archivo privado para la comparación posterior. No restaurar datos. Confirmar que el PID actual no cambió:

```bash
python3 ops/autostart/lasa-check.py --health --expected-pid 13621
```

**13621 es el PID diagnosticado, no un valor permanente.** Si cambia, detenerse y volver a identificar usuario, ejecutable, argumentos y directorio; no matar el PID antiguo ni usar `pkill node`, `killall node` o un cierre por puerto.

Tras esa comprobación, con autorización para la interrupción, detener solo el Node identificado y esperar su salida. Este ejemplo evita reutilización accidental del PID mediante pidfd:

```bash
python3 - <<'PY'
import os, pathlib, select, signal
pid = 13621
p = pathlib.Path('/proc') / str(pid)
fd = os.pidfd_open(pid)
assert os.readlink(p / 'exe') == '/usr/bin/node'
assert os.readlink(p / 'cwd') == '/home/kirwan/p/actualizador-listas-lasa'
a = (p / 'cmdline').read_bytes().split(b'\0')
assert any(x in (b'server.js', b'/home/kirwan/p/actualizador-listas-lasa/server.js') for x in a[1:])
signal.pidfd_send_signal(fd, signal.SIGTERM)
assert select.select([fd], [], [], 30)[0], 'No terminó: investigar sin matar otros procesos'
os.close(fd)
PY
python3 ops/autostart/lasa-check.py --preflight
sudo systemctl start lasa.service
systemctl show lasa.service -p ActiveState -p SubState -p MainPID
python3 ops/autostart/lasa-check.py --health
```

Comparar el PID único del control de salud con `MainPID`. Si falla el arranque o la salud, **no habilitar ni registrar la tarea**: ir a reversión. Si funciona, probar PDF público de una lista y del catálogo por `127.0.0.1:4000`, autenticación, sandbox y ausencia de cambios en los dos JSON. No editar/publicar productos para probar. Solo después:

```bash
sudo systemctl enable lasa.service
systemctl is-enabled lasa.service
journalctl -u lasa.service -n 50 --no-pager
```

No ejecutar `npm start` junto al servicio. No cambiar puerto, host ni IP para solucionar un conflicto.

### 3. Registrar tarea Windows, solo después de la migración Linux

Opción que respeta la política PowerShell actual: abrir Programador de tareas bajo `PC5-JUAN\PC`, seleccionar **Importar tarea** y elegir:

`\\wsl.localhost\Debian\home\kirwan\p\actualizador-listas-lasa\ops\autostart\LASA-WSL-Startup.xml`

Verificar antes de guardar:

- Nombre `LASA-WSL-Startup`; no debe existir ya otra tarea con ese nombre.
- Cuenta `PC5-JUAN\PC`, «Ejecutar tanto si el usuario inició sesión como si no». No seleccionar la opción de no almacenar contraseña que corresponde a S4U. No marcar privilegios máximos sin una necesidad verificada.
- Al iniciar el sistema, demora 30 segundos; comando `C:\WINDOWS\System32\wsl.exe`; argumentos `--distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh`.
- Sin límite de duración, ignorar nueva instancia, reintento por fallo cada minuto, sin depender de red ni estado de batería.

Ingresar la contraseña Windows localmente al guardar. Registrar no equivale a comprobar el arranque antes del login. Para una prueba manual autorizada:

```powershell
Start-ScheduledTask -TaskName 'LASA-WSL-Startup'
Get-ScheduledTask -TaskName 'LASA-WSL-Startup' | Select-Object TaskName,State
Get-ScheduledTaskInfo -TaskName 'LASA-WSL-Startup'
wsl.exe -d Debian -u kirwan --exec /usr/bin/python3 /usr/local/libexec/lasa/lasa-check.py --health
```

La tarea persistente debe permanecer `Running`; el resultado `0x41301` significa «en ejecución» y no equivale a fallo. Verificar además salud y journal. Disparar la tarea dos veces, después de autorización, debe dejar una sola instancia de la tarea, un supervisor y un único Node de LASA.

Alternativa de script, solo si su ejecución local cumple las políticas: copiar `prepare-windows.ps1` a una ubicación Windows local autorizada; ejecutar `-Register` bajo la cuenta propietaria y confirmar el registro. No hay `-Force`, no sobrescribe tareas existentes y no llama a Start-ScheduledTask. No usar Bypass para sortear políticas.

### 4. Prueba de independencia y reinicio completo — autorización separada

1. Comprobar salud y PDF, y comparar los JSON con el estado anterior.
2. Cerrar VS Code y todas las terminales normales; verificar que la tarea siga Running y el único Node pertenezca a `/system.slice/lasa.service`. Un controlador HTTP temporal en Windows, preparado para la prueba sin arrancar WSL, permite observar continuidad: `Invoke-WebRequest http://127.0.0.1:4000/api/auth/me -UseBasicParsing`.
3. Con autorización explícita, reiniciar Windows. **No iniciar sesión**; esperar al menos dos minutos. La verificación antes del login necesita una observación independiente: por ejemplo, historial operativo de Task Scheduler habilitado previamente con autorización, o consultar después los tiempos de arranque de la tarea y de la unidad y compararlos con el primer inicio de sesión. Un control HTTP desde Windows iniciado después del login no prueba por sí solo que arrancara antes.
4. Después de iniciar sesión, consultar primero Task Scheduler y sus tiempos, **sin ejecutar `wsl.exe` todavía** (hacerlo podría arrancar Debian y falsear la prueba). Si la tarea estaba fallida o no había iniciado, registrar el fallo antes de intervenir.
5. Después consultar `systemctl show lasa -p MainPID -p ActiveEnterTimestamp`, `journalctl -u lasa -b` y `lasa-check.py --health`; comparar con los eventos de login. Verificar PDF, administración y JSON sin editar datos. Repetir sin abrir VS Code y con cierre de sesión si se requiere ese caso.
6. Si se quiere cubrir apagado/encendido con inicio rápido o reanudación de S3, probarlos aparte bajo autorización. Una falla crítica exige reversión, no modificar la red ni restaurar datos comerciales.

## Reversión futura — requiere autorización de interrupción

Si falla la migración o la prueba de reinicio:

1. Deshabilitar y detener únicamente `LASA-WSL-Startup` si fue creada. Si se desea eliminarla, usar `Unregister-ScheduledTask -TaskName 'LASA-WSL-Startup' -Confirm` después de guardar su XML. No tocar otras tareas ni detener WSL.
2. En Debian, `sudo systemctl disable --now lasa.service`. Esperar la terminación del cgroup; el supervisor debería salir al perder salud. No usar `wsl --shutdown` ni reiniciar Debian.
3. Ejecutar `python3 ops/autostart/lasa-check.py --preflight` y confirmar puerto 4000 libre. Si está ocupado, identificar el propietario; no matar otro servicio.
4. Recuperar el modo manual anterior como `kirwan`, desde el directorio del proyecto, con ruta absoluta y log privado:

```bash
cd /home/kirwan/p/actualizador-listas-lasa
umask 077
mkdir -p /home/kirwan/.local/state/lasa
nohup /usr/bin/env HOME=/home/kirwan PORT=4000 LASA_HOST=0.0.0.0 LASA_DATA_DIR=/home/kirwan/p/actualizador-listas-lasa/data LASA_AUTH_CONFIG=/home/kirwan/.config/lasa/actualizador-listas.json PUPPETEER_CACHE_DIR=/home/kirwan/.cache/puppeteer /usr/bin/node /home/kirwan/p/actualizador-listas-lasa/server.js </dev/null >/home/kirwan/.local/state/lasa/manual.log 2>&1 &
python3 ops/autostart/lasa-check.py --health
```

Esperar brevemente si el primer control se ejecuta antes de que Node escuche. Verificar catálogo y PDF, y que los JSON sigan intactos. No se requiere revertir el código PDF ni restaurar datos: esta etapa no los cambia. La unidad puede permanecer instalada pero deshabilitada; si se desea retirarla, archivar solo los archivos que instaló esta etapa y hacer daemon-reload con autorización. Cualquier ajuste de energía futuro debe registrar sus valores previos para poder restaurarlos; aún no se aplicó ninguno.

## Validación realizada en preparación

Sintaxis Bash y Python revisada. Unidad validada con `systemd-analyze verify`, sin instalarla. Sintaxis PowerShell revisada por su parser; ejecución del `.ps1` desde UNC bloqueada por política, sin alterarla. XML aceptado por la API de Task Scheduler en un objeto temporal en memoria, sin registro. Salud actual OK y preflight rechaza correctamente iniciar otra instancia. No se ejecutaron pruebas de arranque, reinicio, caída del servicio ni tarea real: hacerlo infringiría esta fase sin activación.

Referencias adicionales: [Register-ScheduledTask](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/register-scheduledtask), [configuración de tareas](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset).

Control final: mismo PID 13621 y salud correcta; ambos JSON conservan contenido, mtime, inode y permisos; unidad `LoadState=not-found`, rutas de instalación inexistentes y tarea `LASA-WSL-Startup` no registrada. Sin commit ni push.
