
@echo off
title Sistema AIH - Limpeza Seletiva de Dados
color 0E
cls

echo.
echo ==================================================
echo    SISTEMA DE CONTROLE DE AIH - LIMPEZA SELETIVA
echo ==================================================
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
set /p confirmacao=Deseja continuar com a limpeza seletiva? (S/N): 

if /i "%confirmacao%" neq "S" (
    echo.
    echo Operacao cancelada pelo usuario.
    echo.
    pause
    exit /b
)

echo.
echo Executando limpeza seletiva...
echo.

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
