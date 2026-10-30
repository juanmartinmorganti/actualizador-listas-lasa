# Isolated Windows PowerShell test. All Windows/HTTP diagnostic commands mocked.
param([string]$Verifier = (Join-Path $PSScriptRoot '..\verify-after-reboot.ps1'))
$ErrorActionPreference = 'Stop'
$testDirectory = Join-Path ([IO.Path]::GetTempPath()) ('lasa-verifier-test-' + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $testDirectory)
function Get-CimInstance { throw 'mock_cim_unavailable' }
function Get-ScheduledTask { throw 'mock_task_missing' }
function Get-ScheduledTaskInfo { throw 'MUST_NOT_REACH' }
function Get-WinEvent { param($ListLog,$FilterHashtable,$LogName,$FilterXPath,[switch]$Oldest,$MaxEvents)
    if ($ListLog) { return [pscustomobject]@{ IsEnabled=$false } }
    throw 'MUST_NOT_REACH'
}
function Invoke-WebRequest { throw 'mock_http_unavailable' }
& $Verifier -OutputDirectory $testDirectory
$files = @(Get-ChildItem $testDirectory -Filter '*.json')
if ($files.Count -ne 1) { throw 'Missing partial evidence' }
$r = Get-Content $files[0].FullName -Raw | ConvertFrom-Json
if ($r.Errors.Count -ne 3 -or $r.CompletedUtc -eq $null -or $r.Task -ne $null) { throw 'Failure isolation failed' }
if ($r.Logs[0].Status -ne 'Disabled' -or $r.Verdict -notlike 'Inconclusive*') { throw 'Unsafe verdict' }
# Second case: synthesize more than one login; require the server-side earliest filter.
function Get-CimInstance { [pscustomobject]@{LastBootUpTime=[datetime]'2026-10-30T10:00:00Z'} }
function Get-ScheduledTask { [pscustomobject]@{TaskName='LASA-WSL-Startup';TaskPath='\';State='Ready';Settings=@{Enabled=$true};Principal=@{UserId='S-1-5-21-1-2-3-1001';LogonType='Password'}} }
function Get-ScheduledTaskInfo { [pscustomobject]@{LastRunTime=[datetime]'2026-10-30T10:01:00Z';LastTaskResult=1} }
function Get-WinEvent { param($ListLog,$FilterHashtable,$LogName,$FilterXPath,[switch]$Oldest,$MaxEvents)
    if ($ListLog) { return [pscustomobject]@{IsEnabled=$true} }
    if ($LogName -eq 'Security') {
        if (-not $Oldest -or $MaxEvents -ne 1 -or $FilterXPath -notlike '*TargetUserSid*' -or $FilterXPath -notlike "*LogonType*'2'*") { throw 'Incorrect first login query' }
        $event=[pscustomobject]@{TimeCreated=[datetime]'2026-10-30T10:02:00Z';RecordId=123;Id=4624}
        $event | Add-Member ScriptMethod ToXml { '<Event><EventData><Data Name="TargetUserSid">S-1-5-21-1-2-3-1001</Data><Data Name="LogonType">2</Data></EventData></Event>' }
        return $event
    }
    if (-not $Oldest -or $MaxEvents -ne 2001) { throw 'Incorrect bounded query' }
    return @()
}
& $Verifier -OutputDirectory $testDirectory
$r = Get-ChildItem $testDirectory -Filter '*.json' | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content -Raw | ConvertFrom-Json
if ($r.FirstOwnerInteractiveLogin.RecordId -ne 123 -or -not $r.FirstOwnerInteractiveLogin.OwnerMatches -or $r.LoginEvidence.CoverageProven) { throw 'Login evidence incorrect' }
if (($r | ConvertTo-Json -Depth 12) -match 'S-1-5-21|mock_') { throw 'Identity or error text leaked' }
Write-Host 'PASS: partial evidence, missing task/CIM, HTTP failure, disabled channels, earliest owner login query, privacy, inconclusive verdict.'
Write-Host ('Synthetic evidence only: ' + $testDirectory)
# Metadata may fail while direct Security read works; fallback must also work.
function Get-WinEvent { param($ListLog,$FilterHashtable,$LogName,$FilterXPath,[switch]$Oldest,$MaxEvents)
    if ($ListLog -eq 'Security') { throw 'mock_metadata_failure' }
    if ($ListLog) { return [pscustomobject]@{IsEnabled=$true} }
    if ($LogName -eq 'Security') {
        if ($denySecurity) { throw [System.UnauthorizedAccessException]::new('synthetic denied') }
        $e=[pscustomobject]@{TimeCreated=[datetime]'2026-10-30T10:02:00Z';RecordId=124;Id=4624}
        $e | Add-Member ScriptMethod ToXml { '<Event><EventData><Data Name="TargetUserSid">S-1-5-21-1-2-3-1001</Data><Data Name="LogonType">2</Data></EventData></Event>' }; return $e
    }
    if ($FilterHashtable.LogName -eq 'System' -and $FilterHashtable.ProviderName -eq 'Microsoft-Windows-Winlogon') {
        if ($FilterHashtable.Id -ne 7001 -or -not $Oldest) { throw 'Wrong fallback channel/filter' }
        $e=[pscustomobject]@{TimeCreated=[datetime]'2026-10-30T10:01:59Z';RecordId=99;Id=7001}
        $e | Add-Member ScriptMethod ToXml { '<Event><EventData><Data Name="UserSid">S-1-5-21-1-2-3-1001</Data></EventData></Event>' }; return $e
    }
    return @()
}
& $Verifier -OutputDirectory $testDirectory
$r=Get-ChildItem $testDirectory -Filter '*.json' | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content -Raw | ConvertFrom-Json
if ($r.FirstOwnerInteractiveLogin.RecordId -ne 124 -or $r.AlternativeLoginEvidence[0].FirstOwnerEvent.RecordId -ne 99) { throw 'Metadata failure blocked direct read or fallback' }
if ($r.Errors.Phase -notcontains 'SecurityMetadata' -or $r.Verdict -notlike 'Inconclusive*') { throw 'Lost partial error or overstated verdict' }
Write-Host 'PASS: independent direct Security read after metadata failure; owner-matched System Winlogon fallback.'

$denySecurity = $true
& $Verifier -OutputDirectory $testDirectory
$r=Get-ChildItem $testDirectory -Filter '*.json' | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content -Raw | ConvertFrom-Json
if ($r.LoginEvidence.Status -ne 'ReadError' -or $r.AlternativeLoginEvidence[0].FirstOwnerEvent.RecordId -ne 99 -or $r.CompletedUtc -eq $null) { throw 'Denied Security lost fallback or partial evidence' }
Write-Host 'PASS: Security access denied preserves owner-matched fallback and completion.'
