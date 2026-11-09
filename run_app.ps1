<#
.SYNOPSIS
    Iniciador do Longevidade Hub em PowerShell.
.DESCRIPTION
    Encaminha a execução para o script run_app.bat mantendo suporte
    completo aos argumentos (--dev, --build, --rebuild, --update, --lan, --local).
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

$batchPath = Join-Path $PSScriptRoot "run_app.bat"
if (-not (Test-Path $batchPath)) {
    Write-Error "Arquivo run_app.bat não encontrado em $batchPath"
    exit 1
}

& cmd.exe /c "`"$batchPath`" $ScriptArgs"
exit $LASTEXITCODE
