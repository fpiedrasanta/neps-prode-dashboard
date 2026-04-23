param(
    [string]$AppPoolNames,
    [Parameter(Mandatory=$false)]
    [ValidateSet("Stop", "Start", "Recycle")]
    [string]$Action = "Recycle"
)

try {
    # Verificar que el módulo WebAdministration está disponible
    if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
        throw "Modulo WebAdministration no esta disponible"
    }
    Import-Module WebAdministration

    $appPools = $AppPoolNames -split ',' | ForEach-Object { $_.Trim() }
    
    foreach ($pool in $appPools) {
        # Verificar si el AppPool existe
        try {
            $appPool = Get-Item "IIS:\AppPools\$pool" -ErrorAction Stop
            $currentState = $appPool.State
            Write-Output "AppPool '$pool' - Estado actual: $currentState - Accion solicitada: $Action"
        } catch {
            Write-Output "ERROR: AppPool '$pool' no existe o no se puede acceder"
            exit 1
        }
        
        # Determinar acción a realizar
        switch ($Action) {
            "Stop" {
                if ($currentState -eq "Stopped") {
                    Write-Output "AppPool '$pool' ya esta detenido. No se realiza accion."
                    continue
                } else {
                    Write-Output "Deteniendo AppPool '$pool'..."
                    Stop-WebAppPool -Name $pool
                }
            }
            "Start" {
                if ($currentState -eq "Started") {
                    Write-Output "AppPool '$pool' ya esta iniciado. Reciclando..."
                    Restart-WebAppPool -Name $pool
                } else {
                    Write-Output "Iniciando AppPool '$pool'..."
                    Start-WebAppPool -Name $pool
                }
            }
            "Recycle" {
                if ($currentState -eq "Stopped") {
                    Write-Output "AppPool '$pool' esta detenido. Iniciando..."
                    Start-WebAppPool -Name $pool
                } else {
                    Write-Output "Reciclando AppPool '$pool'..."
                    Restart-WebAppPool -Name $pool
                }
            }
        }
        
        # Esperar y verificar resultado
        Start-Sleep -Seconds 3
        $finalState = (Get-Item "IIS:\AppPools\$pool").State
        Write-Output "AppPool '$pool' - Estado final: $finalState"
    }
    
    Write-Output "Operacion completada exitosamente"
    exit 0
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    exit 1
}