const { spawn } = require('child_process');
const { createServer } = require('vite');

async function startDev() {
  console.log('🚀 Starting Electron development environment...');
  
  // Start Vite dev server
  const vite = await createServer({
    configFile: './vite.config.ts',
    server: {
      port: 5173,
      host: true
    }
  });
  
  await vite.listen();
  console.log('✅ Vite dev server started on http://localhost:5173');
  
  // Start Electron
  const electron = spawn('electron', ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:5173'
    }
  });
  
  electron.on('close', () => {
    console.log('🛑 Electron closed');
    vite.close();
    process.exit();
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    electron.kill();
    vite.close();
    process.exit();
  });
}

startDev().catch(console.error); 