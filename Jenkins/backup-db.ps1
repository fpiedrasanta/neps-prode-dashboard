param(
    [string]$SqlInstance,
    [string]$Database,
    [string]$LocalBackupPath,
    [string]$RemoteBackupPath,
    [string]$SqlUser,
    [string]$SqlPass,
    [int]$MaxBackups = 5,
    [string]$SevenZipPath  # NUEVO (opcional)
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

try {
    $fecha = Get-Date -Format 'yyyyMMdd_HHmmss'
    $bakFile = "${Database}_$fecha.bak"
    $zipFile = "${Database}_$fecha.zip"

    $localBak = "$LocalBackupPath\$bakFile"
    $localZip = "$LocalBackupPath\$zipFile"
    $remoteZip = "$RemoteBackupPath\$zipFile"

    Write-Log "Backup DB: $Database"
    Write-Log "BAK local: $localBak"
    Write-Log "ZIP destino: $remoteZip"

    # Crear carpetas (CMD)
    cmd /c "if not exist `"$LocalBackupPath`" mkdir `"$LocalBackupPath`""
    cmd /c "if not exist `"$RemoteBackupPath`" mkdir `"$RemoteBackupPath`""

    # Backup SQL
    Invoke-Sqlcmd `
        -Query "BACKUP DATABASE [$Database] TO DISK=N'$localBak' WITH INIT" `
        -ServerInstance $SqlInstance `
        -Username $SqlUser `
        -Password $SqlPass `
        -QueryTimeout 600

    Start-Sleep -Seconds 5

    # Validar BAK con CMD
    cmd /c "if exist `"$localBak`" exit 0 else exit 1"
    if ($LASTEXITCODE -ne 0) {
        throw "BAK no encontrado: $localBak"
    }

    Write-Log "Backup creado correctamente"

    # === ZIP CON 7-ZIP (NUEVO) ===
    if ([string]::IsNullOrWhiteSpace($SevenZipPath)) {
        throw "No se especificó la ruta a 7zip (SevenZipPath)"
    }

    Write-Log "Creando ZIP con 7-Zip"
    cmd /c "`"$SevenZipPath`" a -tzip `"$localZip`" `"$localBak`" -mx=9"

    # Validar ZIP
    cmd /c "if exist `"$localZip`" exit 0 else exit 1"
    if ($LASTEXITCODE -ne 0) {
        throw "ZIP no creado: $localZip"
    }

    # Copiar ZIP con Robocopy
    Write-Log "Copiando ZIP con Robocopy"
    robocopy "$LocalBackupPath" "$RemoteBackupPath" "$zipFile" /R:3 /W:5 /NFL /NDL /NJH /NJS
    $rc = $LASTEXITCODE

    if ($rc -ge 8) {
        throw "Robocopy falló con código $rc"
    }

    Write-Log "ZIP copiado correctamente"

    # Borrar BAK local
    cmd /c "del /f /q `"$localBak`""

    # Retención SOLO ZIP en destino
    Write-Log "Aplicando retención ZIP ($MaxBackups)"
    $files = cmd /c "dir /b /o-d `"$RemoteBackupPath\*.zip`"" 2>$null
    if ($files.Count -gt $MaxBackups) {
        $files | Select-Object -Skip $MaxBackups | ForEach-Object {
            cmd /c "del /f /q `"$RemoteBackupPath\$_`""
        }
    }

    Write-Log "Backup finalizado OK"

} catch {
    Write-Error "ERROR backup-db.ps1: $_"
    exit 1
}