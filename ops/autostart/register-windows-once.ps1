# Registro de una sola llamada. Ejecutar elevado desde una copia Windows local.
# No inicia tareas, no reinicia servicios y no modifica ExecutionPolicy.
$ErrorActionPreference = 'Stop'
$ownerAlias = 'PC5-JUAN\PC'
$taskName = 'LASA-WSL-Startup'
$resultPath = Join-Path $PSScriptRoot 'registration-result.json'
$stage = 'Preflight'
$registrationCalled = $false
$credential = $null
$password = $null
$attemptUtc = $null
function Save-Result([string]$phase, [object]$details) {
    [ordered]@{ Phase=$phase; TimeUtc=[DateTime]::UtcNow.ToString('o'); ProcessId=$PID; TaskName=$taskName; Stage=$stage; RegistrationCalled=$registrationCalled; Details=$details } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
function Hex-HResult([int]$number) {
    return '0x' + [BitConverter]::ToUInt32([BitConverter]::GetBytes($number),0).ToString('X8')
}
try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $ownerSid = ([Security.Principal.NTAccount]::new('PC5-JUAN','PC')).Translate([Security.Principal.SecurityIdentifier])
    if ($identity.User.Value -ne $ownerSid.Value) { throw 'OWNER_MISMATCH' }
    if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'ELEVATION_REQUIRED' }
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'TASK_ALREADY_EXISTS' }
    [xml]$definition = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'LASA-WSL-Startup.xml'))
    $ns = [Xml.XmlNamespaceManager]::new($definition.NameTable)
    $ns.AddNamespace('t','http://schemas.microsoft.com/windows/2004/02/mit/task')
    $principalNode = $definition.SelectSingleNode('//t:UserId',$ns)
    $xmlSid = ([Security.Principal.NTAccount]::new($principalNode.InnerText)).Translate([Security.Principal.SecurityIdentifier])
    if ($xmlSid.Value -ne $ownerSid.Value) { throw 'XML_OWNER_MISMATCH' }
    if ($definition.SelectSingleNode('//t:LogonType',$ns).InnerText -ne 'Password') { throw 'INVALID_LOGON_TYPE' }
    if ($definition.SelectSingleNode('//t:RunLevel',$ns).InnerText -ne 'LeastPrivilege') { throw 'INVALID_RUNLEVEL' }
    $wsl = Join-Path $env:SystemRoot 'System32\wsl.exe'
    if ($definition.SelectSingleNode('//t:Command',$ns).InnerText -ine $wsl) { throw 'INVALID_ACTION' }
    if ($definition.SelectSingleNode('//t:Arguments',$ns).InnerText -cne '--distribution Debian --user kirwan --exec /usr/local/libexec/lasa/wsl-keepalive.sh') { throw 'INVALID_ARGUMENTS' }
    & $wsl --distribution Debian --user kirwan --exec /usr/bin/python3 /usr/local/libexec/lasa/lasa-check.py --health
    if ($LASTEXITCODE -ne 0) { throw 'LASA_UNHEALTHY' }
    # El marcador se crea antes del diálogo y no permite relanzar este intento.
    $marker = [IO.File]::Open((Join-Path $PSScriptRoot 'single-attempt.lock'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    $marker.Close()
    $stage='AwaitingCredential'
    Save-Result 'AwaitingCredential' $null
    $credential=Get-Credential -UserName $ownerAlias -Message 'LASA: CONTRASENA real de cuenta Microsoft, NO PIN Windows Hello. Un solo intento.'
    if ($null -eq $credential) { throw 'CANCELLED' }
    $stage='ValidatingCredentialIdentity'
    $enteredSid=([Security.Principal.NTAccount]::new($credential.UserName)).Translate([Security.Principal.SecurityIdentifier])
    if ($enteredSid.Value -ne $ownerSid.Value) { throw 'CREDENTIAL_SID_MISMATCH' }
    # Una identidad canónica solo se admite si resolvió al mismo SID. No se guarda aquí.
    $principalNode.InnerText=$credential.UserName
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'TASK_APPEARED_BEFORE_REGISTRATION' }
    $stage='RegisteringTask'
    $attemptUtc=[DateTime]::UtcNow
    Save-Result 'RegisteringTask' $null
    try {
        $password=$credential.GetNetworkCredential().Password
        $registrationCalled=$true
        Register-ScheduledTask -TaskName $taskName -Xml $definition.OuterXml -User $credential.UserName -Password $password | Out-Null
    } finally { $password=$null; $credential=$null }
    $stage='Registered'
    Save-Result 'Registered' ([ordered]@{ OwnerSidVerified=$true; ManualRunPending=$true })
    Write-Host 'Registro completado. El asistente comprobara la tarea y realizara la prueba manual.'
} catch {
    $caught=$_
    $hresults=@()
    $nativeCodes=@()
    $exception=$caught.Exception
    while($null -ne $exception) {
        $hresults+=Hex-HResult $exception.HResult
        foreach($m in [regex]::Matches([string]$exception.Message,'(?i)0x[89A-F][0-9A-F]{7}')) { $nativeCodes+=$m.Value.ToUpperInvariant() }
        $exception=$exception.InnerException
    }
    foreach($text in @([string]$caught.FullyQualifiedErrorId,[string]$caught.ErrorDetails.Message)) {
        foreach($m in [regex]::Matches($text,'(?i)0x[89A-F][0-9A-F]{7}')) { $nativeCodes+=$m.Value.ToUpperInvariant() }
    }
    # Leer únicamente códigos de eventos propios; nunca volcar payload ni parámetros.
    if($registrationCalled -and $attemptUtc) {
        try {
            $events=Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational';Id=4100;StartTime=$attemptUtc.ToLocalTime().AddSeconds(-1)} -MaxEvents 20 -ErrorAction Stop
            foreach($event in $events) {
                [xml]$eventXml=$event.ToXml()
                if([string]$eventXml.Event.System.Execution.ProcessID -eq [string]$PID) {
                    $payload=($eventXml.Event.EventData.Data|Where-Object {$_.Name -eq 'Payload'}).InnerText
                    if($payload -match 'Register-ScheduledTask') {
                        foreach($m in [regex]::Matches([string]$payload,'(?i)0x[89A-F][0-9A-F]{7}')) { $nativeCodes+=$m.Value.ToUpperInvariant() }
                    }
                }
            }
        } catch {}
    }
    $known=@('OWNER_MISMATCH','ELEVATION_REQUIRED','TASK_ALREADY_EXISTS','XML_OWNER_MISMATCH','INVALID_LOGON_TYPE','INVALID_RUNLEVEL','INVALID_ACTION','INVALID_ARGUMENTS','LASA_UNHEALTHY','CANCELLED','CREDENTIAL_SID_MISMATCH','TASK_APPEARED_BEFORE_REGISTRATION')
    $safeCode='WINDOWS_API_FAILURE'
    if($known -contains $caught.Exception.Message) { $safeCode=$caught.Exception.Message }
    Save-Result 'Failed' ([ordered]@{ Code=$safeCode; NativeHResults=@($nativeCodes|Select-Object -Unique); ExceptionHResults=@($hresults|Select-Object -Unique); RetryPerformed=$false })
    Write-Host 'Intento detenido. Se conservaron solo codigos de error, sin credenciales. No se repetira el registro.'
} finally { $password=$null; $credential=$null }
