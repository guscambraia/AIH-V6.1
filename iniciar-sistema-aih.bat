
@echo off
title Sistema de Controle de AIH
color 0A

echo.
echo ========================================
echo   SISTEMA DE CONTROLE DE AUDITORIA AIH
echo ========================================
echo.

REM Verificar se estamos na pasta correta
if not exist "server.js" (
    echo ERRO: Arquivo server.js nao encontrado!
    echo Certifique-se de que este script esta na pasta do projeto.
    pause
    exit /b 1
)

REM Verificar Node.js
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao instalado!
    echo Baixe em: https://nodejs.org
    pause
    exit /b 1
)
echo     Node.js OK!

REM Verificar/Instalar dependências
echo [2/4] Verificando dependencias...
if not exist "node_modules" (
    echo     Instalando dependencias pela primeira vez...
    npm install
) else (
    echo     Dependencias OK!
)

REM Verificar se porta 5000 está livre
echo [3/4] Verificando porta 5000...
netstat -an | find "5000" >nul
if %errorlevel% equ 0 (
    echo     AVISO: Porta 5000 pode estar em uso
    echo     O sistema tentara iniciar mesmo assim...
) else (
    echo     Porta 5000 disponivel!
)

REM Aguardar e abrir navegador
echo [4/4] Preparando para iniciar...
echo.
echo Sistema iniciando...
echo O navegador abrira automaticamente em 5 segundos!
echo.

REM Abrir navegador após 5 segundos em background
start /b timeout /t 5 /nobreak >nul && start http://localhost:5000

echo ========================================
echo  SERVIDOR ATIVO em http://localhost:5000
echo ========================================
echo.
echo Para PARAR o servidor: Pressione Ctrl+C
echo Para MINIMIZAR: Clique no botao minimizar
echo.

REM Iniciar servidor
npm start

REM Se chegou aqui, o servidor foi encerrado
echo.
echo ========================================
echo  SERVIDOR ENCERRADO
echo ========================================
echo.
pause
