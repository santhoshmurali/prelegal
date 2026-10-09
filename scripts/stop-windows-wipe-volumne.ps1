# Stops the Prelegal container, deletes the image and wipes the SQLite data volume.
$ErrorActionPreference = "Stop"
$ImageName = "prelegal"
$ContainerName = "prelegal"
$VolumeName = "prelegal-data"

docker rm -f $ContainerName | Out-Null
docker rmi $ImageName | Out-Null
docker volume rm $VolumeName | Out-Null

Write-Host "Prelegal stopped. Image and data volume removed."
