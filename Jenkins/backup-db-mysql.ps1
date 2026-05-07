param(
    [string]$MySQLHost,
    [string]$MySQLPort = "3306",
    [string]$Database,
    [string]$LocalBackupPath,
    [string]$RemoteBackupPath,
    [string]$MySQLUser,
    [string]$MySQLPass,
    [int]$MaxBackups = 5
)

try {
    $fecha = Get-Date -Format 'yyyyMMdd_HHmmss'
    $localFile = Join-Path $LocalBackupPath "${Database}_$fecha.sql"
    $remoteZip = Join-Path $RemoteBackupPath "${Database}_$fecha.zip"

    # ?? CORREGIDO: Usar escape correcto para el carácter ':'
    Write-Output "?? Iniciando backup de base MySQL [$Database] en [$MySQLHost`:$MySQLPort]..."

    # ?? AGREGAR DIAGNÓSTICO
    Write-Output "?? Parámetros recibidos:"
    Write-Output "   - Host: $MySQLHost"
    Write-Output "   - Puerto: $MySQLPort"
    Write-Output "   - Base de datos: $Database"
    Write-Output "   - Usuario: $MySQLUser"
    Write-Output "   - Ruta local: $LocalBackupPath"
    Write-Output "   - Ruta remota: $RemoteBackupPath"

    # Crear carpeta local si no existe
    if (-not (Test-Path $LocalBackupPath)) {
        Write-Output "?? Creando directorio local: $LocalBackupPath"
        New-Item -ItemType Directory -Path $LocalBackupPath -Force | Out-Null
    }

    # Verificar que mysqldump existe
    $mysqldumpPath = "C:\Program Files\MySQL\MySQL Server 5.5\bin\mysqldump.exe"
    if (-not (Test-Path $mysqldumpPath)) {
        # Intentar encontrar mysqldump automáticamente
        $possiblePaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
            "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe", 
            "C:\Program Files\MySQL\MySQL Server 5.6\bin\mysqldump.exe",
            "C:\Program Files\MySQL\MySQL Server 5.5\bin\mysqldump.exe"
        )
        
        $foundPath = $null
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $foundPath = $path
                break
            }
        }
        
        if ($foundPath) {
            $mysqldumpPath = $foundPath
            Write-Output "?? mysqldump encontrado en: $mysqldumpPath"
        } else {
            throw "? mysqldump.exe no encontrado. Rutas probadas: $($possiblePaths -join ', ')"
        }
    }

    Write-Output "?? Ejecutando mysqldump desde: $mysqldumpPath"

    # Construir comando mysqldump
    $mysqldumpArgs = @(
        "--host=$MySQLHost",
        "--port=$MySQLPort", 
        "--user=$MySQLUser",
        "--password=$MySQLPass",
        "--databases",
        $Database,
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        "--skip-comments"
    )

    Write-Output "?? Generando backup..."
    
    # Ejecutar mysqldump
    & $mysqldumpPath @mysqldumpArgs | Out-File -FilePath $localFile -Encoding UTF8

    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump falló con código de error: $LASTEXITCODE"
    }

    Start-Sleep -Seconds 2

    if (!(Test-Path $localFile)) {
        throw "Backup no creado en $localFile"
    }

    # Verificar que el archivo no esté vacío
    $fileInfo = Get-Item $localFile
    if ($fileInfo.Length -eq 0) {
        throw "Backup creado pero está vacío"
    }

    Write-Output "? Backup SQL creado exitosamente: $localFile"
    Write-Output "?? Tamaño del backup: $([math]::Round($fileInfo.Length/1MB, 2)) MB"

    # Comprimir y copiar al destino remoto
    if (-not (Test-Path $RemoteBackupPath)) {
        Write-Output "?? Creando directorio remoto: $RemoteBackupPath"
        New-Item -ItemType Directory -Path $RemoteBackupPath -Force | Out-Null
    }

    Write-Output "??? Comprimiendo backup..."
    Compress-Archive -Path $localFile -DestinationPath $remoteZip -Force

    if (!(Test-Path $remoteZip)) {
        throw "No se pudo crear el ZIP remoto"
    }

    Write-Output "? ZIP creado en destino remoto: $remoteZip"

    # Borrar el archivo SQL local
    Write-Output "?? Eliminando backup local temporal..."
    Remove-Item -Path $localFile -Force
    Write-Output "? Eliminado backup local: $localFile"

    # Limitar cantidad de ZIPs en destino
    Write-Output "?? Limpiando backups antiguos..."
    $backups = Get-ChildItem -Path $RemoteBackupPath -Filter "*.zip" | Sort-Object LastWriteTime -Descending
    Write-Output "?? Total de backups encontrados: $($backups.Count)"
    
    if ($backups.Count -gt $MaxBackups) {
        $backups | Select-Object -Skip $MaxBackups | ForEach-Object {
            Write-Output "??? Eliminado viejo backup: $($_.Name)"
            Remove-Item $_.FullName -Force
        }
    }

    Write-Output "?? Backup MySQL completado exitosamente"

} catch {
    Write-Error "? Error en backup-mysql.ps1: $($_.Exception.Message)"
    exit 1
}