# Setup portable MariaDB in the workspace

$WorkDir = "C:\Codes\Greeny-Cafe"
$MariadbDir = "$WorkDir\mariadb"
$MariadbZipPath = "$WorkDir\mariadb.zip"
$MariadbUrl = "https://archive.mariadb.org/mariadb-11.4.2/winx64-packages/mariadb-11.4.2-winx64.zip"

Write-Host "Creating MariaDB directory..."
if (-not (Test-Path $MariadbDir)) {
    New-Item -ItemType Directory -Path $MariadbDir -Force
}

# If mariadb.zip does not exist, download it
if (-not (Test-Path $MariadbZipPath)) {
    Write-Host "Downloading MariaDB from $MariadbUrl..."
    Invoke-WebRequest -Uri $MariadbUrl -UserAgent "Mozilla/5.0" -OutFile $MariadbZipPath
} else {
    Write-Host "MariaDB zip already exists, skipping download."
}

Write-Host "Extracting MariaDB..."
$TempExtract = "$WorkDir\mariadb_temp"
if (Test-Path $TempExtract) { Remove-Item $TempExtract -Recurse -Force }
New-Item -ItemType Directory -Path $TempExtract -Force
Expand-Archive -Path $MariadbZipPath -DestinationPath $TempExtract -Force

# Move contents of nested folder
$NestedFolder = (Get-ChildItem $TempExtract | Select-Object -First 1).FullName
Write-Host "Moving files from $NestedFolder to $MariadbDir..."
Move-Item "$NestedFolder\*" $MariadbDir -Force
Remove-Item $TempExtract -Recurse -Force
Remove-Item $MariadbZipPath -Force

Write-Host "Initializing MariaDB database..."
# Run mysql_install_db.exe to create data directory
& "$MariadbDir\bin\mysql_install_db.exe" --datadir="$MariadbDir\data"

# Create a config file my.ini
$MyIni = @"
[mysqld]
datadir=$MariadbDir/data
port=3306
bind-address=127.0.0.1
sql_mode=NO_ENGINE_SUBSTITUTION
max_connections=100
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
"@
Set-Content "$MariadbDir\my.ini" $MyIni

Write-Host "MariaDB setup completed successfully!"
