# Por defecto solo produce XML local. -Register requiere autorización posterior.
[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
    [switch]$Register,
    [string]$OutputPath = (Join-Path $PSScriptRoot 'LASA-WSL-Startup.xml'),
    [System.Management.Automation.PSCredential]$Credential
)
$ErrorActionPreference = 'Stop'
$owner = 'PC5-JUAN\PC'
$taskName = 'LASA-WSL-Startup'
$wsl = Join-Path $env:SystemRoot 'System32\wsl.exe'
# WSL permanece en primer plano dentro de la tarea, sin ventana de terminal.
$escapedWsl = [System.Security.SecurityElement]::Escape($wsl)
$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Inicia Debian del propietario y mantiene WSL para lasa.service. No ejecuta Node directamente.</Description></RegistrationInfo>
  <Triggers><BootTrigger><Enabled>true</Enabled><Delay>PT30S</Delay></BootTrigger></Triggers>
  <Principals><Principal id="Owner"><UserId>$owner</UserId><LogonType>Password</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowHardTerminate>true</AllowHardTerminate><Enabled>true</Enabled><Hidden>false</Hidden>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>
  </Settings>
  <Actions Context="Owner"><Exec><Command>$escapedWsl</Command><Arguments>--distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh</Arguments></Exec></Actions>
</Task>
"@
[xml]$parsed = $xml
if (-not $Register) {
    if (Test-Path -LiteralPath $OutputPath) { throw 'El XML destino ya existe; elegir otro nombre para no sobrescribir.' }
    [System.IO.File]::WriteAllText($OutputPath, $xml, [System.Text.Encoding]::Unicode)
    Write-Output "XML preparado en $OutputPath. Ninguna tarea registrada ni iniciada."
    return
}
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'La tarea ya existe; no se sobrescribe.' }
if (-not $PSCmdlet.ShouldProcess($taskName, 'Registrar tarea al arrancar Windows bajo la cuenta propietaria de Debian')) { return }
# La contraseña se ingresa localmente; nunca en argumentos, XML, registros o repositorio.
if ($null -eq $Credential) { $Credential = Get-Credential -UserName $owner -Message 'Contraseña Windows de la cuenta propietaria de Debian (no PIN de Windows Hello)' }
if ($null -eq $Credential -or $Credential.UserName -ine $owner) { throw 'Se requiere la cuenta propietaria exacta.' }
try {
    $password = $Credential.GetNetworkCredential().Password
    Register-ScheduledTask -TaskName $taskName -Xml $xml -User $owner -Password $password | Out-Null
} finally {
    $password = $null
    $Credential = $null
}
Write-Output 'Tarea registrada. No se ejecutó Start-ScheduledTask. Activación y prueba requieren autorización.'
