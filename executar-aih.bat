
@echo off
echo.
echo ====================================
echo  Sistema de Controle de AIH
echo ====================================
echo.
echo Iniciando servidor...

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js antes de continuar.
    pause
    exit /b 1
)

REM Instalar dependências se necessário
if not exist node_modules (
    echo Instalando dependencias...
    npm install
)

REM Aguardar 3 segundos e abrir navegador em segundo plano
start /b timeout /t 3 /nobreak >nul && start http://localhost:5000

REM Iniciar servidor
echo Servidor iniciando em http://localhost:5000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
npm start
