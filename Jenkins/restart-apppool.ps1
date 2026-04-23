param([string]$AppPoolNames)

try {
    $appPools = $AppPoolNames -split ',' | ForEach-Object { $_.Trim() }
    
    foreach ($pool in $appPools) {
        & "$env:windir\system32\inetsrv\appcmd.exe" recycle apppool /apppool.name:"$pool"
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Reiniciado: $pool"
        } else {
            Write-Output "Error: $pool"
            exit 1
        }
    }
    exit 0
}
catch {
    exit 1
}