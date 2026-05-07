param(
    [string]$DeployPath,
    [string]$BackupDir,
    [string]$Branch,
    [string]$Proyecto
)

Write-Output "?? Iniciando actualización desde Git en '$DeployPath' (branch: $Branch)..."

try {
    Set-Location -Path $DeployPath
	
    # Hacer fetch y reset (no pull para evitar conflictos)
    git fetch origin $Branch
    git reset --hard origin/$Branch

    if ($LASTEXITCODE -ne 0) {
        throw "? Error durante git fetch/reset"
    }

    Write-Output "? Git actualizado correctamente."
}
catch {
    Write-Error "? Error durante el git fetch/reset: $_"
    Write-Output "?? Ejecutando rollback desde backup..."

    try {
        & "${DeployPath}\03 - despliegue\01 - Jenkins\rollback.ps1" `
			-DeployPath $DeployPath `
            -BackupDir $BackupDir `
            -Proyecto $Proyecto
    }
    catch {
        Write-Error "? Rollback fallido: $_"
    }

    exit 1
}
