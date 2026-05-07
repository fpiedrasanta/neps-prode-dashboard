<#
.SYNOPSIS
    Gestiona ejecución de scripts SQL manteniendo solo la última ubicación ejecutada
.DESCRIPTION
    Versión final que:
    - Mantiene la carpeta Scripts en Git con un archivo .gitkeep
    - Elimina solo subcarpetas específicas
    - Preserva la estructura de directorios
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [string]$BasePath,
    
    [string]$DeployFolderName = "03 - despliegue",
    [string]$ScriptsFolderName = "Scripts",
    [string]$ExecutedFolderPrefix = "Ejecutados",
    
    [Parameter(Mandatory=$true)]
    [string]$SqlInstance,
    [Parameter(Mandatory=$true)]
    [string]$Database,
    [string]$SqlUser,
    [string]$SqlPass,
    
    [string]$SourceEnvironment = "",
    [string]$StateFileName = "scripts-state.json",
    [string]$LockFileName = "deploy.lock"
)

$ErrorActionPreference = "Stop"
$COMPLETION_MESSAGE = "Scripts procesados en"

$deployPath = Join-Path $BasePath $DeployFolderName
$scriptsDir = Join-Path $deployPath $ScriptsFolderName
$stateFile = Join-Path $deployPath $StateFileName
$lockFile = Join-Path $deployPath $LockFileName

if ([string]::IsNullOrEmpty($SourceEnvironment)) {
    $SourceEnvironment = if ($Environment -eq "testing") { "testing" } else { "testing" }
}

$sourceDir = if ($SourceEnvironment -eq "testing") { 
    $scriptsDir 
} else {
    Join-Path $deployPath "$ExecutedFolderPrefix $($SourceEnvironment.ToUpper())"
}

$executedDir = Join-Path $deployPath "$ExecutedFolderPrefix $($Environment.ToUpper())"

# Crear directorios necesarios
@($scriptsDir, $sourceDir, $executedDir) | Where-Object { -not (Test-Path $_) } | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

# Asegurar que Scripts tiene .gitkeep
$gitkeepPath = Join-Path $scriptsDir ".gitkeep"
if (-not (Test-Path $gitkeepPath)) {
    New-Item -ItemType File -Path $gitkeepPath -Force | Out-Null
}

# Función de compatibilidad para PowerShell 5.1
function ConvertTo-Hashtable {
    param(
        [Parameter(ValueFromPipeline = $true)]
        $InputObject
    )
    process {
        if ($null -eq $InputObject) { return $null }

        if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
            $collection = @()
            foreach ($item in $InputObject) {
                $collection += (ConvertTo-Hashtable -InputObject $item)
            }
            return $collection
        }
        elseif ($InputObject -is [psobject]) {
            $hash = @{}
            foreach ($property in $InputObject.PSObject.Properties) {
                $hash[$property.Name] = ConvertTo-Hashtable -InputObject $property.Value
            }
            return $hash
        }
        else {
            return $InputObject
        }
    }
}

function Get-ExecutionState {
    $state = @{}
    if (Test-Path $stateFile) {
        try {
            $content = Get-Content $stateFile -Raw
            if (-not [string]::IsNullOrEmpty($content)) {
                $jsonObject = $content | ConvertFrom-Json
                $state = ConvertTo-Hashtable -InputObject $jsonObject
            }
        } catch {
            Write-Warning "Error cargando estado: $_"
        }
    }
    if (-not $state.ContainsKey($Environment)) {
        $state[$Environment] = @{}
    }
    return $state
}

try {
    $stream = [System.IO.File]::Open($lockFile, 'CreateNew', 'Write', 'None')
} catch {
    if ($_.Exception -is [System.IO.IOException]) {
        Write-Host "Despliegue en progreso. Abortando..."
        exit 0
    }
    throw $_
}

try {
    $state = Get-ExecutionState
    $processedSomething = $false
    $movedFolders = @()

    $foldersToProcess = Get-ChildItem $sourceDir -Directory | Where-Object {
        -not $state[$Environment].ContainsKey($_.Name)
    }

    foreach ($folder in $foldersToProcess) {
        $folderName = $folder.Name
        Write-Host "PROCESANDO CARPETA: $folderName"
        
        $originalSourcePath = $folder.FullName
        
        $state[$Environment][$folderName] = @{
            StartTime = (Get-Date).ToUniversalTime().ToString("o")
            Scripts = @()
            Status = "InProgress"
            Source = $SourceEnvironment
        }

        try {
            $scripts = Get-ChildItem $folder.FullName -Filter "*.sql" | Sort-Object Name
            foreach ($script in $scripts) {
                try {
                    Write-Host "  EJECUTANDO: $($script.Name)"
                    
                    $sqlParams = @{
                        ServerInstance = $SqlInstance
                        Database = $Database
                        InputFile = $script.FullName
                        ErrorAction = 'Stop'
                    }
                    
                    if ($SqlUser) {
                        $sqlParams.Username = $SqlUser
                        $sqlParams.Password = $SqlPass
                    }
                    
                    Invoke-Sqlcmd @sqlParams | Out-Null
                    
                    $state[$Environment][$folderName].Scripts += @{
                        Name = $script.Name
                        Status = "Success"
                        Timestamp = (Get-Date).ToUniversalTime().ToString("o")
                    }
                    
                } catch {
                    $state[$Environment][$folderName].Scripts += @{
                        Name = $script.Name
                        Status = "Failed"
                        Timestamp = (Get-Date).ToUniversalTime().ToString("o")
                        Error = $_.Exception.Message
                    }
                    $state[$Environment][$folderName].Status = "Failed"
                    throw "Error en script: $_"
                }
            }

            if ($state[$Environment][$folderName].Status -ne "Failed") {
                $destPath = Join-Path $executedDir $folderName
                
                if (Test-Path $destPath) {
                    Remove-Item $destPath -Recurse -Force
                }
                
                Move-Item -Path $originalSourcePath -Destination $executedDir -Force
                
                $movedFolders += @{
                    Name = $folderName
                    OriginalSourcePath = $originalSourcePath
                    RelativeSourcePath = $originalSourcePath.Substring($BasePath.Length).TrimStart('\')
                }
                
                $state[$Environment][$folderName].Status = "Completed"
                $state[$Environment][$folderName].EndTime = (Get-Date).ToUniversalTime().ToString("o")
                $processedSomething = $true
            }

        } catch {
            $state[$Environment][$folderName].Status = "Failed"
            $state[$Environment][$folderName].EndTime = (Get-Date).ToUniversalTime().ToString("o")
            Write-Error "Error procesando carpeta: $_"
            $processedSomething = $true
        }
    }

    if ($processedSomething) {
        $state | ConvertTo-Json -Depth 5 | Set-Content $stateFile -Force
        
        try {
            Write-Host "ACTUALIZANDO GIT..."
            $commitMessage = "[JENKINS-AUTOMERGE] $COMPLETION_MESSAGE $Environment"
            
            foreach ($item in $movedFolders) {
                $folderName = $item.Name
                $relativeSourcePath = $item.RelativeSourcePath
                
                Write-Host "  ELIMINANDO DE GIT: $relativeSourcePath"
                git -C $BasePath rm -r --cached $relativeSourcePath 2>$null
            }
            
            # Asegurar que .gitkeep está en Git
            $gitkeepRelativePath = $gitkeepPath.Substring($BasePath.Length).TrimStart('\')
            git -C $BasePath add $gitkeepRelativePath
            
            git -C $BasePath add $stateFile
            git -C $BasePath add $executedDir
            
            git -C $BasePath commit -m $commitMessage
            git -C $BasePath push -o ci.skip
        } catch {
            Write-Warning "Error en Git: $_"
        }
    }

} finally {
    if ($stream) { $stream.Close() }
    Remove-Item $lockFile -ErrorAction SilentlyContinue
}

# Garantizar que la carpeta Scripts existe
if (-not (Test-Path $scriptsDir)) {
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
}

Write-Host "PROCESO COMPLETADO: $Environment"