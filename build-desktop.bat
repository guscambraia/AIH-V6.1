
@echo off
echo 🔨 Compilando Sistema AIH para Desktop...
echo.

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado! Instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Copiar package.json específico do Electron
copy package-electron.json package.json

REM Instalar dependências
echo 📦 Instalando dependências...
npm install

REM Instalar Electron e builder se não estiverem instalados
echo ⚡ Instalando Electron...
npm install electron electron-builder --save-dev

REM Criar pasta de assets se não existir
if not exist "assets" mkdir assets

REM Copiar ícone padrão se não existir
if not exist "assets\icon.ico" (
    echo 🖼️ Criando ícone padrão...
    REM Aqui você pode copiar um ícone padrão ou criar um
)

REM Compilar aplicação
echo 🏗️ Compilando aplicação...
npm run build-win

echo.
echo ✅ Compilação concluída!
echo 📁 Verifique a pasta 'dist' para os executáveis
echo.
pause
