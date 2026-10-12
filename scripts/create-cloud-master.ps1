$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
$taskPointers = @()
$taskKeys = @('BOOTSTRAP_DATABASE_URL', 'BOOTSTRAP_MASTER_EMAIL', 'BOOTSTRAP_MASTER_PASSWORD')
$taskPrevious = @{}
foreach ($taskKey in $taskKeys) { $taskPrevious[$taskKey] = [Environment]::GetEnvironmentVariable($taskKey, 'Process') }
try {
    $taskUrl = Read-Host 'Cole a URL direta do Neon com neondb_owner (oculta)' -AsSecureString
    $taskPassword = Read-Host 'Crie sua senha Master: minimo 12 caracteres (oculta)' -AsSecureString
    $taskConfirmation = Read-Host 'Repita sua senha Master (oculta)' -AsSecureString
    $taskSecrets = @($taskUrl, $taskPassword, $taskConfirmation)
    $taskPlain = @()
    foreach ($taskSecret in $taskSecrets) {
        $taskPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
        $taskPointers += $taskPtr
        $taskPlain += [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPtr)
    }
    if ($taskPlain[1] -cne $taskPlain[2]) { throw 'As senhas nao conferem. Execute novamente.' }
    $env:BOOTSTRAP_DATABASE_URL = $taskPlain[0].Trim()
    $env:BOOTSTRAP_MASTER_EMAIL = 'brunomariano.sv@gmail.com'
    $env:BOOTSTRAP_MASTER_PASSWORD = $taskPlain[1]
    & node node_modules/tsx/dist/cli.mjs apps/api/prisma/bootstrap-master.ts
    if ($LASTEXITCODE -ne 0) { throw 'Conta nao criada. Confira o resultado acima.' }
}
finally {
    foreach ($taskKey in $taskKeys) { [Environment]::SetEnvironmentVariable($taskKey, $taskPrevious[$taskKey], 'Process') }
    foreach ($taskPtr in $taskPointers) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPtr) }
    Remove-Variable taskPlain, taskSecrets, taskUrl, taskPassword, taskConfirmation, taskSecret -ErrorAction SilentlyContinue
    Pop-Location
}
