@echo off
title Sistema AIH - Limpeza Seletiva de Dados
color 0E
cls

echo.
echo ==================================================
echo    SISTEMA DE CONTROLE DE AIH - LIMPEZA SELETIVA
echo ==================================================
echo.

echo Verificando dependencias...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js primeiro: https://nodejs.org/
    pause
    exit /b 1
)

echo Verificando se sqlite3 esta instalado...
node -e "require('sqlite3')" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo AVISO: Modulo sqlite3 nao encontrado!
    echo Executando instalacao automatica...
    echo.
    npm install sqlite3
    if %errorlevel% neq 0 (
        echo.
        echo ERRO: Nao foi possivel instalar sqlite3!
        echo Execute: npm install sqlite3
        pause
        exit /b 1
    )
    echo sqlite3 instalado com sucesso!
)

echo.
echo    Este script vai LIMPAR APENAS OS DADOS:
echo    - Todas as AIHs cadastradas
echo    - Todas as movimentacoes
echo    - Todas as glosas
echo    - Todos os logs de acesso e exclusao
echo.
echo    SERAO MANTIDOS:
echo    - Usuarios cadastrados
echo    - Profissionais cadastrados
echo    - Tipos de glosa configurados
echo    - Administradores do sistema
echo.
echo ==================================================
echo.

set /p confirmacao="Deseja continuar com a limpeza seletiva? (S/N): "
if /i not "%confirmacao%"=="S" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo Executando limpeza seletiva...
node limpar-dados-somente.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==================================================
    echo    LIMPEZA SELETIVA CONCLUIDA COM SUCESSO!
    echo ==================================================
    echo.
    echo O sistema esta pronto para receber novos dados
    echo mantendo todas as configuracoes existentes.
    echo.
) else (
    echo.
    echo ==================================================
    echo    ERRO NA LIMPEZA SELETIVA!
    echo ==================================================
    echo.
    echo Verifique os logs acima para mais detalhes.
    echo.
)

echo.
echo Pressione qualquer tecla para fechar...
pause >nul