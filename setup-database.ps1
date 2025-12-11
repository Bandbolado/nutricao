# Script para configurar o banco de dados Supabase
# Execute este script e siga as instruções

$projectId = "accvkabjzkdvogzlkrxe"
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectId/sql/new"

Write-Host "`n🚀 CONFIGURAÇÃO DO BANCO DE DADOS" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "📋 Este script vai preparar os SQLs para você executar no Supabase.`n" -ForegroundColor Yellow

# Ler os arquivos SQL
$baseTables = Get-Content "migrations\create_base_tables.sql" -Raw
$newFeatures = Get-Content "migrations\create_new_features.sql" -Raw

# Combinar em um único SQL
$fullSQL = $baseTables + "`n`n" + $newFeatures

# Salvar SQL combinado
$outputFile = "migrations\EXECUTE_ALL.sql"
$fullSQL | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ SQL combinado criado em: $outputFile`n" -ForegroundColor Green

# Copiar para clipboard
$fullSQL | Set-Clipboard
Write-Host "📋 SQL copiado para a área de transferência!`n" -ForegroundColor Green

Write-Host "🔗 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Abrindo Supabase SQL Editor no navegador..." -ForegroundColor White
Write-Host "2. Cole o SQL (Ctrl+V) no editor" -ForegroundColor White
Write-Host "3. Clique no botão 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host "4. Aguarde a execução completar`n" -ForegroundColor White

# Aguardar confirmação
Read-Host "Pressione ENTER para abrir o navegador"

# Abrir navegador
Start-Process $sqlEditorUrl

Write-Host "`n⏳ Aguardando você executar o SQL no navegador...`n" -ForegroundColor Yellow
Read-Host "Após executar o SQL no Supabase, pressione ENTER para continuar"

Write-Host "`n✅ Perfeito! Agora vou iniciar o bot...`n" -ForegroundColor Green

# Iniciar o bot
Write-Host "🤖 Iniciando bot..." -ForegroundColor Cyan
node server.js
