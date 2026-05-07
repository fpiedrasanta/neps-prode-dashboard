param(
    [string]$Source,
    [string]$BackupDir,
    [string]$Proyecto,
    [int]$MaxBackups = 5
)

try {
    Write-Output "Iniciando backup de archivos desde '$Source'..."

    if (-not (Test-Path $BackupDir)) {
        Write-Output "Creando carpeta de backup en '$BackupDir'..."
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $zipFile = Join-Path $BackupDir "${Proyecto}_${timestamp}.zip"

    Write-Output "Comprimiendo contenido de '$Source' en '$zipFile'..."
    Compress-Archive -Path "$Source\*" -DestinationPath $zipFile -Force

    # Mantener solo los últimos $MaxBackups backups
    $backups = Get-ChildItem -Path $BackupDir -Filter "$Proyecto*.zip" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -gt $MaxBackups) {
        $toDelete = $backups | Select-Object -Skip $MaxBackups
        foreach ($file in $toDelete) {
            Remove-Item $file.FullName -Force
            Write-Output "Backup antiguo eliminado: $($file.Name)"
        }
    }

    Write-Output "Backup completado correctamente."
}
catch {
    Write-Error "Error durante backup: $_"
    exit 1
}
