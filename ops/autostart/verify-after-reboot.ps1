# Run ONLY from a local Windows copy. Never invokes wsl.exe or starts a task.
[CmdletBinding()]
param([string]$OutputDirectory = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$result = [ordered]@{
    CapturedUtc = [DateTime]::UtcNow.ToString('o')
    Verdict = 'InconclusivePendingLinuxAndLoginCorrelation'
    Errors = @(); Logs = @(); FirstOwnerInteractiveLogin = $null
}
$path = Join-Path $OutputDirectory ('postboot-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ') + '-' + $PID + '.json')
function Save-Evidence {
    # Checkpoint before each next phase; never write messages or identities.
    $temporary = $path + '.tmp'
    $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temporary -Encoding UTF8
    Move-Item -LiteralPath $temporary -Destination $path -Force
}
function Add-Failure([string]$phase, $failure) {
    $code = ($failure.FullyQualifiedErrorId -split ',')[0]
    if ($code -notin @('LogInfoUnavailable','NoMatchingEventsFound','UnauthorizedAccess','System.UnauthorizedAccessException','ParameterArgumentValidationError')) { $code = 'Other' }
    $result.Errors += [ordered]@{ Phase = $phase; HResult = $failure.Exception.HResult
        ErrorCode = $code
        ExceptionType = $failure.Exception.GetType().FullName }
}
Save-Evidence
$boot = $null
try {
    $boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
    $result.WindowsBootUtc = $boot.ToUniversalTime().ToString('o')
} catch { Add-Failure 'WindowsBoot' $_ }
Save-Evidence
$ownerSid = $null
try {
    $task = Get-ScheduledTask -TaskName 'LASA-WSL-Startup' -TaskPath '\'
    $result.Task = [ordered]@{ State = [string]$task.State; Enabled = $task.Settings.Enabled
        LogonType = [string]$task.Principal.LogonType }
    try {
        $info = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath
        $result.Task.LastRunUtc = $info.LastRunTime.ToUniversalTime().ToString('o')
        $result.Task.LastResult = $info.LastTaskResult
    } catch { Add-Failure 'TaskInfo' $_ }
    $identity = [string]$task.Principal.UserId
    if ($identity -match '^S-1-[0-9-]+$') { $ownerSid = $identity }
    else { $ownerSid = ([System.Security.Principal.NTAccount]$identity).Translate([System.Security.Principal.SecurityIdentifier]).Value }
} catch { Add-Failure 'TaskOrOwner' $_ }
Save-Evidence
# Oldest first, with explicit limits and channel/error distinctions.
$specs = @(
    @{ Log = 'System'; Provider = 'Microsoft-Windows-Kernel-General'; Id = @(1,12,13) },
    @{ Log = 'Microsoft-Windows-TerminalServices-LocalSessionManager/Operational'; Provider = 'Microsoft-Windows-TerminalServices-LocalSessionManager'; Id = @(21,22,23,24,25) },
    @{ Log = 'Microsoft-Windows-Winlogon/Operational'; Provider = 'Microsoft-Windows-Winlogon'; Id = @(7001,7002) },
    @{ Log = 'Microsoft-Windows-TaskScheduler/Operational'; Provider = 'Microsoft-Windows-TaskScheduler'; Id = @(100,101,102,107,110,111,129,200,201,202,203) }
)
foreach ($spec in $specs) {
    $entry = [ordered]@{ Log = $spec.Log; Status = 'Unknown'; Events = @(); Truncated = $false }
    try {
        $channel = Get-WinEvent -ListLog $spec.Log
        $entry.Enabled = $channel.IsEnabled
        if (-not $channel.IsEnabled) { $entry.Status = 'Disabled' }
        elseif ($null -eq $boot) { $entry.Status = 'SkippedUnknownBoot' }
        else {
            $filter = @{ LogName = $spec.Log; ProviderName = $spec.Provider; Id = $spec.Id; StartTime = $boot }
            try {
                $events = @(Get-WinEvent -FilterHashtable $filter -Oldest -MaxEvents 2001)
                $entry.Truncated = $events.Count -gt 2000
                foreach ($event in ($events | Select-Object -First 2000)) {
                    # Task events must match our task. Keep no raw XML/messages.
                    if ($spec.Log -like '*TaskScheduler*') {
                        $xml = [xml]$event.ToXml()
                        $taskField = @($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TaskName' })
                        if ($taskField.Count -ne 1 -or $taskField[0].InnerText -ne '\LASA-WSL-Startup') { continue }
                    }
                    $row = [ordered]@{ Id = $event.Id; RecordId = $event.RecordId; Utc = $event.TimeCreated.ToUniversalTime().ToString('o') }
                    if ($spec.Log -like '*TaskScheduler*') {
                        foreach ($name in @('ResultCode','InstanceId','TaskInstanceId')) {
                            $field = @($xml.Event.EventData.Data | Where-Object { $_.Name -eq $name })
                            if ($field.Count -eq 1 -and $field[0].InnerText -match '^[0-9a-fA-FxX{}-]{1,80}$') { $row[$name] = $field[0].InnerText }
                        }
                    }
                    $entry.Events += $row
                }
                $entry.Status = 'Read'
            } catch {
                if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $entry.Status = 'NoEvents' }
                else { throw }
            }
        }
    } catch { $entry.Status = 'ReadError'; $entry.HResult = $_.Exception.HResult }
    $result.Logs += $entry
    Save-Evidence
}
# Security filters owner SID and interactive logon types on the server, so a
# volume of unrelated events cannot hide the first owner event behind a limit.
$result.LoginEvidence = [ordered]@{ Status = 'Unknown'; CoverageProven = $false }
try {
    $security = $null
    try { $security = Get-WinEvent -ListLog 'Security' }
    catch { Add-Failure 'SecurityMetadata' $_ }
    # Metadata failure must not prevent an independent direct event query.
    if ($null -ne $security -and -not $security.IsEnabled) { $result.LoginEvidence.Status = 'Disabled' }
    elseif ($null -eq $boot -or $null -eq $ownerSid) { $result.LoginEvidence.Status = 'SkippedMissingBootOrOwner' }
    else {
        $stamp = $boot.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ')
        $xpath = "*[System[Provider[@Name='Microsoft-Windows-Security-Auditing'] and (EventID=4624) and TimeCreated[@SystemTime >= '$stamp']]] and *[EventData[Data[@Name='TargetUserSid']='$ownerSid' and (Data[@Name='LogonType']='2' or Data[@Name='LogonType']='10' or Data[@Name='LogonType']='11' or Data[@Name='LogonType']='12')]]"
        try {
            $event = Get-WinEvent -LogName 'Security' -FilterXPath $xpath -Oldest -MaxEvents 1
            $xml = [xml]$event.ToXml()
            $fields = @{}
            foreach ($field in $xml.Event.EventData.Data) { $fields[[string]$field.Name] = $field.InnerText }
            if ($fields.TargetUserSid -ne $ownerSid -or $fields.LogonType -notin @('2','10','11','12')) { throw 'UnexpectedLoginEvent' }
            $result.FirstOwnerInteractiveLogin = [ordered]@{ Utc = $event.TimeCreated.ToUniversalTime().ToString('o'); RecordId = $event.RecordId; Id = 4624; OwnerMatches = $true; LogonType = [int]$fields.LogonType }
            $result.LoginEvidence.Status = 'EarliestAvailableOwnerEvent'
        } catch {
            if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $result.LoginEvidence.Status = 'NoEvents' }
            else { throw }
        }
    }
} catch { $result.LoginEvidence.Status = 'ReadError'; Add-Failure 'SecurityLogin' $_ }
# Independent login evidence. Winlogon 7001 lives in System, NOT its
# Operational channel. LSM 21 is corroboration, not a Security logon type.
$result.AlternativeLoginEvidence = @()
foreach ($source in @(
    @{ Name = 'SystemWinlogon'; Log = 'System'; Provider = 'Microsoft-Windows-Winlogon'; Id = 7001 },
    @{ Name = 'LocalSessionManager'; Log = 'Microsoft-Windows-TerminalServices-LocalSessionManager/Operational'; Provider = 'Microsoft-Windows-TerminalServices-LocalSessionManager'; Id = 21 }
)) {
    $evidence = [ordered]@{ Source = $source.Name; Status = 'Unknown'; Truncated = $false
        FirstOwnerEvent = $null; CoverageProven = $false }
    try {
        if ($null -eq $boot -or $null -eq $ownerSid) { $evidence.Status = 'SkippedMissingBootOrOwner' }
        else {
            $channel = Get-WinEvent -ListLog $source.Log
            if (-not $channel.IsEnabled) { $evidence.Status = 'Disabled' }
            else {
                try {
                    $events = @(Get-WinEvent -FilterHashtable @{LogName=$source.Log; ProviderName=$source.Provider; Id=$source.Id; StartTime=$boot} -Oldest -MaxEvents 2001)
                    $evidence.Truncated = $events.Count -gt 2000
                    $unresolved = 0
                    foreach ($event in ($events | Select-Object -First 2000)) {
                        $xml = [xml]$event.ToXml()
                        $sid = $null
                        if ($source.Name -eq 'SystemWinlogon') {
                            $field = @($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'UserSid' })
                            if ($field.Count -eq 1) { $sid = $field[0].InnerText }
                        } else {
                            $userNode = $xml.SelectSingleNode("//*[local-name()='UserData']//*[local-name()='User']")
                            if ($null -ne $userNode) {
                                try { $sid = ([System.Security.Principal.NTAccount]$userNode.InnerText).Translate([System.Security.Principal.SecurityIdentifier]).Value }
                                catch { $sid = $null }
                            }
                        }
                        if ($null -eq $sid) { $unresolved++; continue }
                        if ($sid -eq $ownerSid -and $null -eq $evidence.FirstOwnerEvent) {
                            $evidence.FirstOwnerEvent = [ordered]@{ Utc=$event.TimeCreated.ToUniversalTime().ToString('o'); Id=$event.Id; RecordId=$event.RecordId; OwnerMatches=$true }
                        }
                    }
                    $evidence.UnresolvedIdentities = $unresolved
                    $evidence.Status = if ($null -ne $evidence.FirstOwnerEvent) { 'EarliestAvailableOwnerEvent' } else { 'NoOwnerMatch' }
                } catch {
                    if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $evidence.Status = 'NoEvents' }
                    else { throw }
                }
            }
        }
    } catch { $evidence.Status = 'ReadError'; Add-Failure $source.Name $_ }
    $result.AlternativeLoginEvidence += $evidence
    Save-Evidence
}
$result.LoginCorrelation = [ordered]@{
    Status = 'PendingLinuxStartupAndCoverageReview'
    Note = 'Compare independent owner login sources with actual Linux service/anchor start; task LastRun and HTTP alone are insufficient.'
}
# Earliest available is NOT proof of complete auditing, absence of auto-login,
# or unaltered clocks. Never infer first login from a reconnect/unlock event.
Save-Evidence
try {
    $response = Invoke-WebRequest 'http://127.0.0.1:4000/api/auth/me' -UseBasicParsing -TimeoutSec 10
    $auth = $response.Content | ConvertFrom-Json
    $result.LocalHttp = [ordered]@{ Status = [int]$response.StatusCode; AdminEnabled = $auth.enabled; Anonymous = (-not $auth.authenticated) }
} catch { $result.LocalHttp = @{ Reachable = $false }; Add-Failure 'Http' $_ }
$result.CompletedUtc = [DateTime]::UtcNow.ToString('o')
Save-Evidence
Write-Host ('Evidence saved: ' + $path)
Write-Host 'Preserve evidence. Do not launch Debian for diagnosis until its running state has been checked from Windows.'
