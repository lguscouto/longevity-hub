' Longevidade Hub — Silent Scheduled Sync Runner
' Executa o script run_scheduled_sync.py sem abrir janela de prompt de comando na tela.

Option Explicit

Dim fso, WshShell, scriptDir, projectDir, pythonExe, runnerScript, cmd, returnCode

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

pythonExe = projectDir & "\.venv\Scripts\python.exe"
runnerScript = scriptDir & "\run_scheduled_sync.py"

If Not fso.FileExists(pythonExe) Then
    pythonExe = "python.exe"
End If

cmd = """" & pythonExe & """ """ & runnerScript & """"

' 0 = Janela Oculta, True = Aguarda a conclusão e retorna o código de saída
returnCode = WshShell.Run(cmd, 0, True)

WScript.Quit returnCode
