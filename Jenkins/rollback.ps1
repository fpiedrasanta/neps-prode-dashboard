param(
    [string]$DeployPath,
    [string]$BackupDir,
    [string]$Proyecto
)

Write-Output "Iniciando rollback..."

try {
    $latestZip = Get-ChildItem -Path $BackupDir -Filter "${Proyecto}_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if (-not $latestZip) {
        Write-Error "No se encontró ningún archivo de backup en '$BackupDir'."
        exit 1
    }

    Write-Output "Backup a restaurar: $($latestZip.Name)"

    # Eliminar contenido actual del deploy excepto .git
    Write-Output "Limpiando carpeta de despliegue (excepto .git): $DeployPath"
    Get-ChildItem -Path $DeployPath -Force |
        Where-Object { $_.Name -ne ".git" } |
        Remove-Item -Recurse -Force

    Write-Output "Restaurando archivos desde backup..."
    Expand-Archive -Path $latestZip.FullName -DestinationPath $DeployPath -Force

    Write-Output "Rollback completado exitosamente."
}
catch {
    Write-Error "Error durante rollback: $_"
    exit 1
}
