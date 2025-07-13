
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let configWindow;
let serverProcess;
let serverPort = 5000;

// Configuração padrão
const defaultConfig = {
    databaseType: 'local', // 'local' ou 'remote'
    remoteHost: '',
    remotePort: '',
    remoteDatabase: '',
    remoteUser: '',
    remotePassword: '',
    localDatabasePath: path.join(__dirname, 'db', 'aih.db')
};

function createConfigWindow() {
    configWindow = new BrowserWindow({
        width: 600,
        height: 500,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        resizable: false,
        center: true,
        title: 'Configuração do Sistema AIH'
    });

    configWindow.loadFile('config-window.html');
    configWindow.setMenu(null);

    configWindow.on('closed', () => {
        configWindow = null;
        if (!mainWindow) {
            app.quit();
        }
    });
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        title: 'Sistema de Controle de AIH',
        show: false
    });

    // Criar menu personalizado
    const menuTemplate = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Configurações de Banco',
                    click: () => {
                        if (configWindow) {
                            configWindow.focus();
                        } else {
                            createConfigWindow();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Backup Manual',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            title: 'Salvar Backup',
                            defaultPath: `backup-aih-${new Date().toISOString().split('T')[0]}.db`,
                            filters: [
                                { name: 'Banco de Dados', extensions: ['db'] }
                            ]
                        });

                        if (!result.canceled) {
                            // Implementar backup
                            mainWindow.webContents.send('backup-manual', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                { role: 'reload', label: 'Recarregar' },
                { role: 'forceReload', label: 'Forçar Recarga' },
                { role: 'toggleDevTools', label: 'Ferramentas de Desenvolvimento' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom Padrão' },
                { role: 'zoomIn', label: 'Aumentar Zoom' },
                { role: 'zoomOut', label: 'Diminuir Zoom' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Tela Cheia' }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre o Sistema AIH',
                            message: 'Sistema de Controle de Auditoria de AIH',
                            detail: 'Versão 2.0\nDesenvolvido para auditoria hospitalar'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopServer();
    });

    // Aguardar servidor iniciar e então carregar
    setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${serverPort}`);
    }, 2000);
}

function startServer(config) {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(__dirname, 'server.js');
        
        // Definir variáveis de ambiente baseadas na configuração
        const env = { ...process.env };
        
        if (config.databaseType === 'remote') {
            env.DB_TYPE = 'remote';
            env.DB_HOST = config.remoteHost;
            env.DB_PORT = config.remotePort;
            env.DB_NAME = config.remoteDatabase;
            env.DB_USER = config.remoteUser;
            env.DB_PASS = config.remotePassword;
        } else {
            env.DB_TYPE = 'local';
            env.DB_PATH = config.localDatabasePath;
        }

        env.PORT = serverPort;
        env.ELECTRON_MODE = 'true';

        serverProcess = spawn('node', [serverPath], {
            env: env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('Servidor AIH iniciado')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        serverProcess.on('error', (error) => {
            console.error('Erro ao iniciar servidor:', error);
            reject(error);
        });

        serverProcess.on('close', (code) => {
            console.log(`Servidor encerrado com código: ${code}`);
        });

        // Timeout para caso o servidor não responda
        setTimeout(() => {
            resolve(); // Continuar mesmo se não detectar a mensagem
        }, 5000);
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

function loadConfig() {
    const configPath = path.join(__dirname, 'app-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...defaultConfig, ...config };
        }
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
    }
    return defaultConfig;
}

function saveConfig(config) {
    const configPath = path.join(__dirname, 'app-config.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
}

// Handlers IPC
ipcMain.handle('get-config', () => {
    return loadConfig();
});

ipcMain.handle('save-config', async (event, config) => {
    const saved = saveConfig(config);
    if (saved) {
        // Reiniciar servidor com nova configuração
        stopServer();
        try {
            await startServer(config);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Erro ao salvar configuração' };
});

ipcMain.handle('test-connection', async (event, config) => {
    // Implementar teste de conexão
    if (config.databaseType === 'local') {
        // Verificar se o diretório existe
        const dbDir = path.dirname(config.localDatabasePath);
        try {
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            return { success: true, message: 'Banco local configurado' };
        } catch (error) {
            return { success: false, message: 'Erro ao configurar banco local: ' + error.message };
        }
    } else {
        // Testar conexão remota (implementar conforme necessário)
        return { success: true, message: 'Configuração remota salva (teste de conexão não implementado)' };
    }
});

// Eventos do app
app.whenReady().then(async () => {
    const config = loadConfig();
    
    // Verificar se é primeira execução
    const configPath = path.join(__dirname, 'app-config.json');
    const isFirstRun = !fs.existsSync(configPath);
    
    if (isFirstRun) {
        createConfigWindow();
    } else {
        try {
            await startServer(config);
            createMainWindow();
        } catch (error) {
            console.error('Erro ao iniciar servidor:', error);
            createConfigWindow();
        }
    }
});

app.on('window-all-closed', () => {
    stopServer();
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const config = loadConfig();
        startServer(config).then(() => {
            createMainWindow();
        });
    }
});

// Tratar fechamento da aplicação
app.on('before-quit', (event) => {
    stopServer();
});
