
@echo off
echo ==================================================
echo    INSTALANDO DEPENDENCIAS DO SISTEMA AIH
echo ==================================================
echo.

echo Verificando se o Node.js esta instalado...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js primeiro: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

echo Instalando dependencias...
npm install

if %errorlevel% neq 0 (
    echo.
    echo ERRO: Falha na instalacao das dependencias!
    echo Tentando instalar sqlite3 separadamente...
    npm install sqlite3
)

echo.
echo ==================================================
echo    DEPENDENCIAS INSTALADAS COM SUCESSO!
echo ==================================================
echo.

pause
