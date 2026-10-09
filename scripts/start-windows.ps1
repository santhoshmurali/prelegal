# Builds the image and starts the Prelegal container on http://localhost:8000.
$ErrorActionPreference = "Stop"
$ImageName = "prelegal"
$ContainerName = "prelegal"
$VolumeName = "prelegal-data"

Set-Location (Join-Path $PSScriptRoot "..")

docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }
docker rm -f $ContainerName | Out-Null
docker run -d --name $ContainerName -p 8000:8000 -v "${VolumeName}:/app/data" $ImageName | Out-Null

Write-Host "Prelegal is running at http://localhost:8000"
