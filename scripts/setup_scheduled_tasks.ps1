<#
.SYNOPSIS
    Gerencia a tarefa agendada do Windows para sincronizacao automatica do Longevidade Hub.

.DESCRIPTION
    Registra, consulta ou remove a tarefa 'Longevidade_DailySync' no Agendador de Tarefas do Windows,
    configurada para disparar diariamente as 07:00 e as 21:00 em segundo plano.

.PARAMETER Register
    Cria ou atualiza a tarefa agendada.

.PARAMETER Unregister
    Remove a tarefa agendada do sistema.

.PARAMETER RunNow
    Executa a tarefa agendada imediatamente para teste.

.PARAMETER Status
    Exibe o estado atual da tarefa e proximos agendamentos.
#>

[CmdletBinding(DefaultParameterSetName = "Status")]
param(
    [Parameter(ParameterSetName = "Register")]
    [switch]$Register,

    [Parameter(ParameterSetName = "Unregister")]
    [switch]$Unregister,

    [Parameter(ParameterSetName = "RunNow")]
    [switch]$RunNow,

    [Parameter(ParameterSetName = "Status")]
    [switch]$Status
)

$ErrorActionPreference = "Stop"

$TaskName = "Longevidade_DailySync"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$VbsPath = Join-Path $ScriptDir "run_sync_silent.vbs"

if (-not (Test-Path $VbsPath)) {
    Write-Error "Arquivo nao encontrado: $VbsPath"
}

if ($Register) {
    Write-Host "Configurando tarefa agendada: $TaskName..." -ForegroundColor Cyan

    $VbsArg = "//B //Nologo `"$VbsPath`""
    $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument $VbsArg -WorkingDirectory $ProjectDir

    $TriggerMorning = New-ScheduledTaskTrigger -Daily -At "07:00"
    $TriggerEvening = New-ScheduledTaskTrigger -Daily -At "21:00"

    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

    $User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive

    $TaskParams = @{
        TaskName    = $TaskName
        Action      = $Action
        Trigger     = @($TriggerMorning, $TriggerEvening)
        Settings    = $Settings
        Principal   = $Principal
        Description = "Sincronizacao agendada do Longevidade Hub (Zepp, Google Health, Hevy, KDM) as 07:00 e 21:00."
        Force       = $true
    }

    Register-ScheduledTask @TaskParams | Out-Null

    Write-Host "[OK] Tarefa '$TaskName' registrada com sucesso!" -ForegroundColor Green
    Write-Host "   - Gatilho 1: Diariamente as 07:00" -ForegroundColor Gray
    Write-Host "   - Gatilho 2: Diariamente as 21:00" -ForegroundColor Gray
    Write-Host "   - Executavel: wscript.exe $VbsArg" -ForegroundColor Gray
    return
}

if ($Unregister) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "[OK] Tarefa '$TaskName' removida com sucesso." -ForegroundColor Yellow
    } else {
        Write-Host "[INFO] Tarefa '$TaskName' nao esta registrada." -ForegroundColor Gray
    }
    return
}

if ($RunNow) {
    Write-Host "Disparando execucao imediata de '$TaskName'..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "[OK] Execucao iniciada em segundo plano. Verifique os logs em 'data\sync.log'." -ForegroundColor Green
    return
}

# Default: Status
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    $Info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Tarefa Agendada: $TaskName" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Estado:          $($ExistingTask.State)" -ForegroundColor Green
    Write-Host " Ultima Corrida:  $($Info.LastRunTime)"
    Write-Host " Ultimo Codigo:   $($Info.LastTaskResult)"
    Write-Host " Proxima Corrida: $($Info.NextRunTime)"
    Write-Host " Gatilhos:"
    foreach ($trigger in $ExistingTask.Triggers) {
        Write-Host "   - Diariamente as $($trigger.StartBoundary.Substring(11, 5))" -ForegroundColor Gray
    }
    Write-Host "==========================================================" -ForegroundColor Cyan
} else {
    Write-Host "[AVISO] Tarefa '$TaskName' nao esta registrada no sistema." -ForegroundColor Yellow
    Write-Host "Execute: .\scripts\setup_scheduled_tasks.ps1 -Register" -ForegroundColor Gray
}
