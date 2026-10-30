# Ejecutar localmente en Windows, elevado, solo para la activación 2B autorizada.
# No modifica ExecutionPolicy, servicios Linux, red ni energía.
$ErrorActionPreference = 'Stop'
$owner = 'PC5-JUAN\PC'
$name = 'LASA-WSL-Startup'
$statusPath = Join-Path $PSScriptRoot 'activation-status.json'
$created = $false
$stage = 'CheckingIdentity'
$credential = $null
$password = $null
function Save-Status([string]$phase, [object]$details) {
    [ordered]@{ Phase=$phase; TimeUtc=[DateTime]::UtcNow.ToString('o'); TaskName=$name; Owner=$owner; Details=$details } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statusPath -Encoding UTF8
}
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    if ($identity.Name -ine $owner) { throw 'OWNER_MISMATCH' }
    $stage = 'CheckingElevation'
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'ELEVATION_REQUIRED' }
    $stage = 'CheckingTaskAbsent'
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) { throw 'TASK_ALREADY_EXISTS' }
    $stage = 'ValidatingDefinition'
    $xmlText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'LASA-WSL-Startup.xml'))
    [xml]$xml = $xmlText
    $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('t','http://schemas.microsoft.com/windows/2004/02/mit/task')
    if ($xml.SelectSingleNode('//t:UserId',$ns).InnerText -ine $owner) { throw 'INVALID_OWNER' }
    if ($xml.SelectSingleNode('//t:LogonType',$ns).InnerText -ne 'Password') { throw 'INVALID_LOGON_TYPE' }
    $wsl = Join-Path $env:SystemRoot 'System32\wsl.exe'
    if ($xml.SelectSingleNode('//t:Command',$ns).InnerText -ine $wsl) { throw 'INVALID_ACTION' }
    if ($xml.SelectSingleNode('//t:Arguments',$ns).InnerText -cne '--distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh') { throw 'INVALID_ARGUMENTS' }
    $stage = 'CheckingLasaHealth'
    & $wsl --distribution Debian --user kirwan --exec /usr/bin/python3 /usr/local/libexec/lasa/lasa-check.py --health
    if ($LASTEXITCODE -ne 0) { throw 'LASA_UNHEALTHY' }
    $stage = 'AwaitingCredential'
    Save-Status 'AwaitingCredential' $null
    Write-Host 'LASA: ingresar la contrasena Windows de PC5-JUAN\PC en el cuadro seguro. No usar PIN ni enviarla por chat.'
    $credential = Get-Credential -UserName $owner -Message 'LASA: contrasena Windows para ejecutar la tarea antes del login; no PIN'
    if ($null -eq $credential) { throw 'CANCELLED' }
    if ($credential.UserName -ine $owner) { throw 'CREDENTIAL_OWNER_MISMATCH' }
    try {
        $stage = 'RegisteringTask'
        $password = $credential.GetNetworkCredential().Password
        Register-ScheduledTask -TaskName $name -Xml $xmlText -User $owner -Password $password | Out-Null
        $created = $true
    } finally { $password=$null; $credential=$null }
    Save-Status 'Registered' $null
    $stage = 'StartingTask'
    Start-ScheduledTask -TaskName $name
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    do {
        Start-Sleep -Seconds 1
        $task = Get-ScheduledTask -TaskName $name
    } while ($task.State.ToString() -ne 'Running' -and [DateTime]::UtcNow -lt $deadline)
    if ($task.State.ToString() -ne 'Running') { throw 'TASK_NOT_RUNNING' }
    $info = Get-ScheduledTaskInfo -TaskName $name
    Save-Status 'Running' ([ordered]@{ State=$task.State.ToString(); Enabled=$task.Settings.Enabled; UserId=$task.Principal.UserId; LogonType=$task.Principal.LogonType.ToString(); LastTaskResult=$info.LastTaskResult; LastRunTime=$info.LastRunTime.ToString('o') })
    Write-Host 'Tarea registrada e iniciada. Falta la comprobacion final del asistente. No se reinicio Windows ni LASA.'
} catch {
    $failureCode = $_.Exception.HResult
    $knownCodes = @('OWNER_MISMATCH','ELEVATION_REQUIRED','TASK_ALREADY_EXISTS','INVALID_OWNER','INVALID_LOGON_TYPE','INVALID_ACTION','INVALID_ARGUMENTS','LASA_UNHEALTHY','CANCELLED','CREDENTIAL_OWNER_MISMATCH','TASK_NOT_RUNNING')
    $safeCode = 'WINDOWS_API_FAILURE'
    if ($knownCodes -contains $_.Exception.Message) { $safeCode = $_.Exception.Message }
    $rollback = 'NotNeeded'
    if ($created) {
        try {
            Disable-ScheduledTask -TaskName $name | Out-Null
            Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
            Unregister-ScheduledTask -TaskName $name -Confirm:$false
            $rollback='TaskRemoved'
        } catch { $rollback='NeedsInspection' }
    }
    # Nunca escribir el objeto de excepción o las credenciales en consola/estado.
    Save-Status 'Failed' ([ordered]@{ Stage=$stage; Code=$safeCode; HResult=$failureCode; Rollback=$rollback })
    Write-Host 'No se completo la activacion; se guardo solo un codigo de error sin credenciales. LASA no fue detenido.'
} finally { $password=$null; $credential=$null }
