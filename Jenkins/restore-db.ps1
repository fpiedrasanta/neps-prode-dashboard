<#
.SYNOPSIS
    Restauración de BD copiando primero el ZIP al servidor SQL y descomprimiendo localmente
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlInstance,
    
    [Parameter(Mandatory=$true)]
    [string]$Database,
    
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    
    [Parameter(Mandatory=$true)]
    [string]$LocalBackupPath,
    
    [string]$SqlUser,
    
    [string]$SqlPass
)

# Configuración inicial
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipPattern = "$Database*.zip"
$localZipPath = Join-Path $LocalBackupPath "$Database-Restore_$timestamp.zip"

# Función para limpieza segura
function Clean-Up {
    param($Path)
    if ($Path -and (Test-Path $Path)) {
        Remove-Item $Path -Force -ErrorAction SilentlyContinue
    }
}

try {
    Write-Host "?? Buscando backup más reciente en $BackupPath..."
    
    # 1. Validar y encontrar el backup más reciente
    if (-not (Test-Path $BackupPath)) {
        throw "La ruta de backup no existe: $BackupPath"
    }

    $latestZip = Get-ChildItem -Path $BackupPath -Filter $zipPattern | 
                 Sort-Object LastWriteTime -Descending | 
                 Select-Object -First 1

    if (-not $latestZip) {
        throw "No se encontraron backups ZIP para $Database en $BackupPath"
    }
    Write-Host "? Backup encontrado: $($latestZip.Name) (Tamaño: $([math]::Round($latestZip.Length/1MB, 2)) MB)"

    # 2. Verificar directorio local de SQL Server
    if (-not (Test-Path $LocalBackupPath)) {
        throw "El directorio local de SQL Server no existe: $LocalBackupPath"
    }

    # 3. Copiar el archivo ZIP con reintentos
    Write-Host "?? Copiando archivo ZIP a $LocalBackupPath..."
    $maxRetries = 3
    $retryCount = 0
    $copySuccess = $false
    
    do {
        $retryCount++
        try {
            Copy-Item -Path $latestZip.FullName -Destination $localZipPath -Force
            if (Test-Path $localZipPath) {
                $copySuccess = $true
            } else {
                Write-Host "?? Intento $retryCount fallido. Reintentando..."
                Start-Sleep -Seconds 5
            }
        } catch {
            Write-Host "?? Error en intento retryCount: $($_.Exception.Message)"
            Start-Sleep -Seconds 5
        }
    } while ((-not $copySuccess) -and ($retryCount -lt $maxRetries))

    if (-not $copySuccess) {
        throw "No se pudo copiar el archivo ZIP después de $maxRetries intentos"
    }

    # 4. Descomprimir el backup localmente
    Write-Host "?? Descomprimiendo $($latestZip.Name) localmente..."
    try {
        Expand-Archive -Path $localZipPath -DestinationPath $LocalBackupPath -Force
    } catch {
        throw "Error al descomprimir el archivo ZIP localmente: $($_.Exception.Message)"
    }

    # 5. Encontrar el archivo .bak
    $bakFile = Get-ChildItem -Path "$LocalBackupPath\$Database*.bak" | Select-Object -First 1
    if (-not $bakFile) {
        throw "No se encontró archivo .bak en el ZIP descomprimido"
    }
    Write-Host "?? Archivo .bak descomprimido: $($bakFile.Name)"

    # 6. Construir comando de restauración
    $sqlCmd = @"
USE [master]
GO
BEGIN TRY
    ALTER DATABASE [$Database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
    RESTORE DATABASE [$Database] FROM DISK = N'$($bakFile.FullName)' 
    WITH REPLACE, RECOVERY, STATS = 5
    ALTER DATABASE [$Database] SET MULTI_USER
    SELECT '? Restauración completada exitosamente' AS Result
END TRY
BEGIN CATCH
    SELECT 
        '? Error en restauración: ' + ERROR_MESSAGE() AS ErrorMessage,
        ERROR_NUMBER() AS ErrorNumber,
        ERROR_SEVERITY() AS ErrorSeverity
END CATCH
GO
"@

    # 7. Ejecutar restauración
    Write-Host "?? Ejecutando restauración de $Database..."
    $sqlCmdArgs = @("-S", $SqlInstance, "-Q", "`"$sqlCmd`"", "-b")
    
    if ($SqlUser -and $SqlPass) {
        $sqlCmdArgs += @("-U", $SqlUser, "-P", $SqlPass)
    } else {
        $sqlCmdArgs += @("-E") # Autenticación de Windows
    }

    & sqlcmd @sqlCmdArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Error en sqlcmd (Código: $LASTEXITCODE)"
    }
    
    Write-Host "?? Restauración completada exitosamente"
}
catch {
    Write-Host "?? ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "?? Detalles del error:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    
    # Intentar volver a MULTI_USER si falló la restauración
    if ($Database -and $SqlInstance) {
        try {
            $recoveryCmd = "ALTER DATABASE [$Database] SET MULTI_USER WITH ROLLBACK IMMEDIATE"
            $recoveryArgs = @("-S", $SqlInstance, "-Q", "`"$recoveryCmd`"", "-b")
            
            if ($SqlUser -and $SqlPass) {
                $recoveryArgs += @("-U", $SqlUser, "-P", $SqlPass)
            } else {
                $recoveryArgs += @("-E")
            }
            
            & sqlcmd @recoveryArgs
        }
        catch {
            Write-Host "?? No se pudo volver a MULTI_USER: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    exit 1
}
finally {
    # 8. Limpieza garantizada
    Write-Host "?? Realizando limpieza..."
    Clean-Up -Path $localZipPath
    
    # Eliminar archivo .bak si existe
    if ($bakFile -and (Test-Path $bakFile.FullName)) {
        Clean-Up -Path $bakFile.FullName
    }
}