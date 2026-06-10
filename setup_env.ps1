# Setup portable PHP and Composer in the workspace

$WorkDir = "C:\Codes\Greeny-Cafe"
$PhpDir = "$WorkDir\php"

Write-Host "Creating PHP directory at $PhpDir..."
if (-not (Test-Path $PhpDir)) {
    New-Item -ItemType Directory -Path $PhpDir -Force
}

$PhpZipPath = "$WorkDir\php.zip"
$PhpUrl = "https://windows.php.net/downloads/releases/archives/php-8.3.10-nts-Win32-vs16-x64.zip"

Write-Host "Downloading PHP from $PhpUrl..."
curl.exe -L -o $PhpZipPath $PhpUrl

Write-Host "Extracting PHP to $PhpDir..."
Expand-Archive -Path $PhpZipPath -DestinationPath $PhpDir -Force
Remove-Item $PhpZipPath -Force

Write-Host "Creating php.ini..."
$PhpIniSource = "$PhpDir\php.ini-development"
$PhpIniDest = "$PhpDir\php.ini"
if (Test-Path $PhpIniSource) {
    Copy-Item $PhpIniSource $PhpIniDest -Force
    
    # Enable common extensions
    $Content = Get-Content $PhpIniDest
    $Content = $Content -replace ';extension_dir = "ext"', 'extension_dir = "ext"'
    $Content = $Content -replace ';extension=curl', 'extension=curl'
    $Content = $Content -replace ';extension=fileinfo', 'extension=fileinfo'
    $Content = $Content -replace ';extension=mbstring', 'extension=mbstring'
    $Content = $Content -replace ';extension=openssl', 'extension=openssl'
    $Content = $Content -replace ';extension=pdo_mysql', 'extension=pdo_mysql'
    $Content = $Content -replace ';extension=sqlite3', 'extension=sqlite3'
    $Content = $Content -replace ';extension=pdo_sqlite', 'extension=pdo_sqlite'
    $Content = $Content -replace ';extension=gd', 'extension=gd'
    $Content = $Content -replace ';extension=zip', 'extension=zip'
    
    # Set memory limit and max execution time
    $Content = $Content -replace 'memory_limit = 128M', 'memory_limit = 512M'
    
    Set-Content $PhpIniDest $Content
}

$ComposerPath = "$PhpDir\composer.phar"
$ComposerUrl = "https://getcomposer.org/download/2.8.5/composer.phar"

Write-Host "Downloading Composer from $ComposerUrl..."
curl.exe -L -o $ComposerPath $ComposerUrl

Write-Host "Creating composer.bat..."
$ComposerBat = @"
@echo off
"$PhpDir\php.exe" "%~dp0composer.phar" %*
"@
Set-Content "$PhpDir\composer.bat" $ComposerBat

Write-Host "Verifying installations..."
& "$PhpDir\php.exe" -v
& "$PhpDir\php.exe" "$PhpDir\composer.phar" -V

Write-Host "Setup Completed successfully!"
