param(
  [string]$EnvironmentFile = (Join-Path $PSScriptRoot '..\.env.development')
)

$ErrorActionPreference = 'Stop'
$environmentPath = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$projectPath = Split-Path -Parent $PSScriptRoot

Write-Host 'Create the first superadmin account'
$adminName = Read-Host 'Name'
$adminEmail = Read-Host 'Email'
$securePassword = Read-Host 'Password (at least 6 characters)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  # This script runs in a child PowerShell process. Clear any inherited URL so
  # dotenv reads the selected file instead of silently targeting another DB.
  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
  $env:DOTENV_CONFIG_PATH = $environmentPath
  $env:BOOTSTRAP_NAME = $adminName
  $env:BOOTSTRAP_EMAIL = $adminEmail
  $env:BOOTSTRAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  Push-Location -LiteralPath $projectPath
  try {
    & pnpm.cmd bootstrap:superadmin
    $result = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:\BOOTSTRAP_PASSWORD, Env:\BOOTSTRAP_NAME, Env:\BOOTSTRAP_EMAIL -ErrorAction SilentlyContinue
}

if ($result -eq 0) {
  Write-Host 'Account created. Sign in at http://localhost:50004/auth/signin'
} else {
  Write-Host 'Account was not created. Check the email, password, and whether an account already exists.'
}
exit $result
