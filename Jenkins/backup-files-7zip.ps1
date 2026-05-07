param(
    [string]$Source,
    [string]$BackupDir,
    [string]$Proyecto,
    [int]$MaxBackups = 5,
    [string]$SevenZipPath = "D:\instaladores\7-Zip-Zstandard\7z.exe"  # Parámetro opcional
)

try {
    Write-Output "Iniciando backup de archivos desde '$Source'..."

    if (-not (Test-Path $BackupDir)) {
        Write-Output "Creando carpeta de backup en '$BackupDir'..."
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $zipFile = Join-Path $BackupDir "${Proyecto}_${timestamp}.zip"

    Write-Output "Comprimiendo contenido de '$Source' en '$zipFile'..."
    
    # Lista de posibles rutas de 7-Zip (en orden de prioridad)
    $possible7zipPaths = @(
        $SevenZipPath,
        "D:\Herramientas\7-Zip\7z.exe",
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        ".\7-Zip\7z.exe",
        ".\7z.exe"
    )
    
    $found7zip = $null
    
    foreach ($path in $possible7zipPaths) {
        if ($path -and (Test-Path $path)) {
            $found7zip = $path
            break
        }
    }
    
    if ($found7zip) {
        Write-Output "Usando 7-Zip desde: $found7zip"
        
        # Argumentos optimizados para 7-Zip
        $arguments = @(
            "a",           # Agregar archivos
            "-tzip",       # Formato ZIP
            "-mx3",        # Compresión normal (balance entre velocidad y tamaño)
            "-mmt=on",     # Multihilo
            "-y",          # Responder sí a todo
            "-r",          # Recursivo
            "-xr!temp",    # Excluir directorios temp
            "-xr!tmp",     # Excluir directorios tmp
            "-xr!*.tmp",   # Excluir archivos .tmp
            "-xr!*.log",   # Excluir archivos .log (opcional)
            $zipFile,
            "$Source\*"
        )
        
        try {
            # Capturar salida de 7-Zip para ver progreso
            $processInfo = New-Object System.Diagnostics.ProcessStartInfo
            $processInfo.FileName = $found7zip
            $processInfo.Arguments = $arguments -join " "
            $processInfo.RedirectStandardOutput = $true
            $processInfo.RedirectStandardError = $true
            $processInfo.UseShellExecute = $false
            $processInfo.CreateNoWindow = $true
            $processInfo.WorkingDirectory = Split-Path $found7zip -Parent
            
            $process = New-Object System.Diagnostics.Process
            $process.StartInfo = $processInfo
            $process.Start() | Out-Null
            
            # Leer salida para mostrar progreso
            $output = $process.StandardOutput.ReadToEnd()
            $errorOutput = $process.StandardError.ReadToEnd()
            $process.WaitForExit()
            
            if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 1) {
                # Código 0 = éxito, 1 = advertencias
                if ($output) {
                    # Mostrar últimas líneas del output
                    $lines = $output -split "`n"
                    if ($lines.Count -gt 10) {
                        Write-Output "Últimas líneas de 7-Zip:"
                        $lines[-10..-1] | ForEach-Object { Write-Output $_ }
                    }
                }
                Write-Output "Compresión con 7-Zip completada."
            } else {
                Write-Warning "7-Zip salió con código: $($process.ExitCode)"
                Write-Warning "Error: $errorOutput"
                throw "Error en 7-Zip"
            }
        }
        catch {
            Write-Warning "Error usando 7-Zip: $_"
            Write-Output "Usando PowerShell como fallback..."
            Compress-Archive -Path "$Source\*" -DestinationPath $zipFile -Force
        }
    }
    else {
        Write-Warning "7-Zip no encontrado. Usando PowerShell..."
        Compress-Archive -Path "$Source\*" -DestinationPath $zipFile -Force
    }

    # Verificar creación del ZIP
    if (Test-Path $zipFile) {
        $size = (Get-Item $zipFile).Length
        $sizeMB = [math]::Round($size / 1MB, 2)
        Write-Output "✅ Backup creado: $([System.IO.Path]::GetFileName($zipFile)) ($sizeMB MB)"
    } else {
        throw "No se pudo crear el archivo de backup"
    }

    # Limpiar backups antiguos
    Write-Output "Limpiando backups antiguos..."
    $backups = Get-ChildItem -Path $BackupDir -Filter "$Proyecto*.zip" -ErrorAction SilentlyContinue | 
                Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -gt $MaxBackups) {
        $toDelete = $backups | Select-Object -Skip $MaxBackups
        foreach ($file in $toDelete) {
            try {
                Remove-Item $file.FullName -Force -ErrorAction Stop
                Write-Output "🗑️ Eliminado: $($file.Name)"
            }
            catch {
                Write-Warning "No se pudo eliminar $($file.Name): $_"
            }
        }
    }

    Write-Output "✅ Backup completado correctamente."
}
catch {
    Write-Error "❌ Error durante backup: $_"
    exit 1
}