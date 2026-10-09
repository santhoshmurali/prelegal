# Stops the Prelegal container and deletes the image. The data volume is kept.
$ErrorActionPreference = "Stop"
$ImageName = "prelegal"
$ContainerName = "prelegal"

docker rm -f $ContainerName | Out-Null
docker rmi $ImageName | Out-Null

Write-Host "Prelegal stopped. Image removed, data volume kept."
