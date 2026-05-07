param(
    [Parameter(Mandatory=$true)]
    [string]$RepoPath,
    [Parameter(Mandatory=$true)] 
	[string]$Token,
    [bool]$FixLongPaths = $true
)

$ErrorActionPreference = 'Stop'

try {
    Write-Host "=== Inicio Configuracion Git ==="
    
    # Verificar repositorio
    $gitDir = Join-Path -Path $RepoPath -ChildPath '.git'
    if (-not (Test-Path -Path $gitDir -PathType Container)) {
        throw "No es un repositorio Git válido: $RepoPath"
    }
    
    # 1. Configuración básica de Git (siempre necesaria)
    Push-Location $RepoPath
    git config --local user.name "Jenkins"
    git config --local user.email "jenkins@neps.com.ar"
    Pop-Location
    Write-Host "Usuario Git configurado: Jenkins"
    
    # 2. Habilitar rutas largas (si se solicita)
    if ($FixLongPaths) {
        # Solo intentar si tenemos permisos
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if ($isAdmin) {
            Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
                             -Name "LongPathsEnabled" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        }
        
        # Configuración local que siempre funciona
        Push-Location $RepoPath
        git config --local core.longpaths true
        Pop-Location
        Write-Host "Soporte para rutas largas habilitado"
    }
    
    # 3. Marcar repositorio como seguro
    git config --global --add safe.directory $RepoPath
    Write-Host "Repositorio marcado como seguro"
    
	# 4. Configurar remote con PAT
	Push-Location $RepoPath
	$remoteUrl = git remote get-url origin
	if ($remoteUrl -notmatch $Token) {
		$remoteUrlWithToken = $remoteUrl -replace 'https://', "https://$Token@"
		git remote set-url origin $remoteUrlWithToken
		Write-Host "? Remote configurado con PAT"
	}
	Pop-Location
	
	
    Write-Host "=== Configuracion Git Exitosa ==="
    exit 0
}
catch {
    Write-Error "ERROR: $_"
    exit 1
}