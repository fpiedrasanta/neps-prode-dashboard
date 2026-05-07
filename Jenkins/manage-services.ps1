param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceNames,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet('Stop', 'Start', 'Restart')]
    [string]$Action,
    
    [int]$TimeoutSeconds = 30
)

# Función para convertir el string de servicios en array
function ConvertTo-ServiceArray {
    param([string]$ServiceString)
    $services = $ServiceString -split ',' | ForEach-Object { $_.Trim() }
    return $services | Where-Object { $_ -ne '' }
}

# Función para gestionar un servicio
function Manage-ServiceSafely {
    param(
        [string]$ServiceName,
        [string]$Action,
        [int]$TimeoutSeconds
    )
    
    try {
        Write-Output "Buscando servicio: $ServiceName"
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        
        Write-Output "Estado actual: $($service.Status)"
        
        switch ($Action) {
            'Stop' {
                if ($service.Status -eq 'Running') {
                    Write-Output "Deteniendo servicio: $ServiceName"
                    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
                    
                    # Esperar a que se detenga
                    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
                    while ($service.Status -ne 'Stopped' -and (Get-Date) -lt $timeout) {
                        Start-Sleep -Seconds 2
                        $service.Refresh()
                        Write-Output "Esperando detencion... Estado: $($service.Status)"
                    }
                    
                    if ($service.Status -eq 'Stopped') {
                        Write-Output "Servicio $ServiceName detenido correctamente"
                        return $true
                    } else {
                        Write-Error "Timeout: No se detuvo en $TimeoutSeconds segundos"
                        return $false
                    }
                } else {
                    Write-Output "Servicio $ServiceName ya estaba detenido"
                    return $true
                }
            }
            'Start' {
                if ($service.Status -eq 'Stopped') {
                    Write-Output "Iniciando servicio: $ServiceName"
                    Start-Service -Name $ServiceName -ErrorAction Stop
                    
                    # Esperar a que se inicie
                    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
                    while ($service.Status -ne 'Running' -and (Get-Date) -lt $timeout) {
                        Start-Sleep -Seconds 2
                        $service.Refresh()
                        Write-Output "Esperando inicio... Estado: $($service.Status)"
                    }
                    
                    if ($service.Status -eq 'Running') {
                        Write-Output "Servicio $ServiceName iniciado correctamente"
                        return $true
                    } else {
                        Write-Error "Timeout: No se inicio en $TimeoutSeconds segundos"
                        return $false
                    }
                } else {
                    Write-Output "Servicio $ServiceName ya estaba ejecutandose"
                    return $true
                }
            }
            'Restart' {
                Write-Output "Reiniciando servicio: $ServiceName"
                Restart-Service -Name $ServiceName -Force -ErrorAction Stop
                
                # Esperar a que se reinicie
                $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
                $started = $false
                while (-not $started -and (Get-Date) -lt $timeout) {
                    Start-Sleep -Seconds 2
                    $service.Refresh()
                    if ($service.Status -eq 'Running') {
                        $started = $true
                    }
                    Write-Output "Esperando reinicio... Estado: $($service.Status)"
                }
                
                if ($started) {
                    Write-Output "Servicio $ServiceName reiniciado correctamente"
                    return $true
                } else {
                    Write-Error "Timeout: No se reinicio en $TimeoutSeconds segundos"
                    return $false
                }
            }
        }
    }
    catch {
        Write-Error "Error al $Action el servicio $ServiceName : $($_.Exception.Message)"
        return $false
    }
}

# MAIN EXECUTION
try {
    # Diagnosticar
    Write-Output "=== GESTION DE SERVICIOS ==="
    Write-Output "Accion: $Action"
    Write-Output "Usuario: $env:USERDOMAIN\$env:USERNAME"
    Write-Output "Equipo: $env:COMPUTERNAME"

    # Convertir servicios
    $serviceArray = ConvertTo-ServiceArray -ServiceString $ServiceNames
    if ($serviceArray.Count -eq 0) {
        Write-Error "No se proporcionaron servicios validos"
        exit 1
    }

    Write-Output "Servicios a $Action : $($serviceArray -join ', ')"
    Write-Output "=========================================="

    # Gestionar cada servicio
    $results = @()
    foreach ($service in $serviceArray) {
        $result = @{
            Service = $service
            Success = $false
        }
        
        $manageResult = Manage-ServiceSafely -ServiceName $service -Action $Action -TimeoutSeconds $TimeoutSeconds
        $result.Success = $manageResult
        $results += $result
        
        Start-Sleep -Seconds 1
    }

    # Resumen
    Write-Output "=========================================="
    Write-Output "Resumen de la operacion:"
    $successCount = ($results | Where-Object { $_.Success }).Count
    $failCount = ($results | Where-Object { -not $_.Success }).Count

    Write-Output "Exitos: $successCount"
    Write-Output "Fallos: $failCount"

    if ($failCount -gt 0) {
        $failedServices = $results | Where-Object { -not $_.Success } | ForEach-Object { $_.Service }
        Write-Error "Servicios con problemas: $($failedServices -join ', ')"
        exit 1
    } else {
        Write-Output "Todos los servicios fueron ${Action}ados correctamente"
        exit 0
    }
}
catch {
    Write-Error "Error general: $($_.Exception.Message)"
    exit 1
}