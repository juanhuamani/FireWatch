/**
 * Fire ID Backend Server
 * Sistema de Detección de Fuego IoT
 * 
 * Integra:
 * - Arduino (sensores IoT)
 * - App móvil React Native (captura foto/audio)
 * - Sistema de IA (análisis)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const aiService = require('./services/aiService');

// ==================== CONFIGURACIÓN ====================

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos
app.use('/captures', express.static(path.join(__dirname, 'captures')));
app.use(express.static(path.join(__dirname, 'public')));

// Variables de configuración
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000/analyze';

// ==================== ESTADO DEL SISTEMA ====================

let systemState = {
  sensorData: {
    temperature: 25,
    light: 300,
    smoke: 100,
    humidity: 60,
    timestamp: new Date()
  },
  alertStatus: 'Normal', // Normal, Riesgo, Confirmado
  thresholds: {
    temperature: 35,
    light: 800,
    smoke: 500,
    humidity: 30
  },
  connectedClients: 0,
  history: []
};

// Registro de eventos
const eventLog = [];

function logEvent(type, message, data = null) {
  const event = {
    timestamp: new Date().toISOString(),
    type,
    message,
    data
  };
  eventLog.push(event);
  console.log(`[${event.timestamp}] [${type.toUpperCase()}] ${message}`);
  
  // Mantener solo los últimos 100 eventos
  if (eventLog.length > 100) {
    eventLog.shift();
  }
}

// ==================== SOCKET.IO - COMUNICACIÓN CON APP MÓVIL ====================

io.on('connection', (socket) => {
  systemState.connectedClients++;
  logEvent('connection', `📱 App móvil conectada: ${socket.id}`, { 
    clientId: socket.id,
    totalClients: systemState.connectedClients 
  });

  // Enviar estado actual al conectarse
  socket.emit('sensorData', systemState.sensorData);
  socket.emit('alertStatus', systemState.alertStatus);

  // ========== Escuchar respuesta de captura ==========
  socket.on('captureResponse', async (data) => {
    logEvent('capture', '📸 Respuesta de captura recibida', {
      requestId: data.requestId,
      hasImage: !!data.imageBase64,
      hasAudio: !!data.audioBase64,
      error: data.error
    });

    if (data.error) {
      logEvent('error', `❌ Error en captura: ${data.error}`);
      return;
    }

    try {
      // Guardar archivos localmente
      const captureDir = path.join(__dirname, 'captures', data.requestId);
      if (!fs.existsSync(captureDir)) {
        fs.mkdirSync(captureDir, { recursive: true });
      }

      let imageFile = null;
      let audioFile = null;

      // Guardar imagen
      if (data.imageBase64) {
        const imageBuffer = Buffer.from(
          data.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          'base64'
        );
        imageFile = path.join(captureDir, 'photo.jpg');
        fs.writeFileSync(imageFile, imageBuffer);
        logEvent('file', '💾 Imagen guardada', { path: imageFile });
      }

      // Guardar audio
      if (data.audioBase64) {
        const audioBuffer = Buffer.from(
          data.audioBase64.replace(/^data:audio\/\w+;base64,/, ''),
          'base64'
        );
        audioFile = path.join(captureDir, 'audio.m4a');
        fs.writeFileSync(audioFile, audioBuffer);
        logEvent('file', '💾 Audio guardado', { path: audioFile });
      }

      // Enviar a IA para análisis
      const aiResult = await analyzeWithAI(data);
      
      // Actualizar estado según resultado
      if (aiResult.fireDetected && aiResult.confidence > 0.7) {
        systemState.alertStatus = 'Confirmado';
        io.emit('alertStatus', 'Confirmado');
        
        logEvent('alert', '🔥 ¡FUEGO CONFIRMADO!', aiResult);
        
        // Enviar alertas
        await sendAlerts(aiResult, data.requestId);
      } else {
        systemState.alertStatus = 'Normal';
        io.emit('alertStatus', 'Normal');
        logEvent('info', '✅ No se detectó fuego', aiResult);
      }

      // Enviar resultado a la app
      socket.emit('analysisResult', aiResult);
      
      // Guardar en historial
      systemState.history.push({
        timestamp: new Date(),
        requestId: data.requestId,
        sensorData: systemState.sensorData,
        aiResult: aiResult,
        imageFile: imageFile,
        audioFile: audioFile
      });

      // Mantener solo los últimos 50 registros
      if (systemState.history.length > 50) {
        systemState.history.shift();
      }

    } catch (error) {
      logEvent('error', '❌ Error al procesar captura', { error: error.message });
      console.error(error);
    }
  });

  // ========== Escuchar actualización de umbrales ==========
  socket.on('thresholdUpdate', (thresholds) => {
    logEvent('config', '⚙️ Umbrales actualizados', thresholds);
    systemState.thresholds = thresholds;
  });

  // ========== Desconexión ==========
  socket.on('disconnect', () => {
    systemState.connectedClients--;
    logEvent('connection', `📱 App móvil desconectada: ${socket.id}`, {
      clientId: socket.id,
      totalClients: systemState.connectedClients
    });
  });
});

// ==================== API REST - ENDPOINTS PARA ARDUINO ====================

/**
 * POST /sensor-data
 * Arduino envía datos de sensores
 */
app.post('/sensor-data', (req, res) => {
  const { temperature, light, smoke, humidity } = req.body;
  
  logEvent('sensor', '📊 Datos de sensores recibidos', { 
    temperature, 
    light, 
    smoke, 
    humidity 
  });

  // Actualizar estado
  systemState.sensorData = {
    temperature: parseFloat(temperature),
    light: parseFloat(light),
    smoke: parseFloat(smoke),
    humidity: humidity ? parseFloat(humidity) : undefined,
    timestamp: new Date()
  };

  // Enviar a todas las apps móviles conectadas
  io.emit('sensorData', systemState.sensorData);

  // Verificar si se superan umbrales
  const thresholdExceeded = checkThresholds(systemState.sensorData, systemState.thresholds);
  
  if (thresholdExceeded.exceeded) {
    logEvent('warning', '⚠️ ¡Umbral superado! Solicitando captura...', thresholdExceeded);
    systemState.alertStatus = 'Riesgo';
    io.emit('alertStatus', 'Riesgo');
    
    // Solicitar captura a la app móvil
    const captureRequest = {
      requestId: `capture_${Date.now()}`,
      timestamp: new Date(),
      reason: `Umbral superado: ${thresholdExceeded.reasons.join(', ')}`
    };
    io.emit('captureRequest', captureRequest);
  }

  res.json({ 
    success: true, 
    message: 'Datos recibidos',
    alertStatus: systemState.alertStatus,
    thresholdExceeded: thresholdExceeded.exceeded
  });
});

/**
 * GET /status
 * Obtener estado actual del sistema
 */
app.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      sensorData: systemState.sensorData,
      alertStatus: systemState.alertStatus,
      thresholds: systemState.thresholds,
      connectedClients: systemState.connectedClients,
      serverTime: new Date()
    }
  });
});

/**
 * POST /trigger-capture
 * Endpoint manual para solicitar captura
 */
app.post('/trigger-capture', (req, res) => {
  logEvent('trigger', '📸 Captura solicitada manualmente');
  
  const captureRequest = {
    requestId: `manual_${Date.now()}`,
    timestamp: new Date(),
    reason: 'Solicitud manual'
  };
  
  io.emit('captureRequest', captureRequest);
  
  res.json({ 
    success: true, 
    message: 'Captura solicitada',
    requestId: captureRequest.requestId
  });
});

/**
 * GET /history
 * Obtener historial de eventos
 */
app.get('/history', (req, res) => {
  res.json({
    success: true,
    data: systemState.history
  });
});

/**
 * GET /logs
 * Obtener logs del sistema
 */
app.get('/logs', (req, res) => {
  res.json({
    success: true,
    data: eventLog
  });
});

/**
 * POST /update-thresholds
 * Actualizar umbrales manualmente
 */
app.post('/update-thresholds', (req, res) => {
  const { temperature, light, smoke, humidity } = req.body;
  
  systemState.thresholds = {
    temperature: parseFloat(temperature) || systemState.thresholds.temperature,
    light: parseFloat(light) || systemState.thresholds.light,
    smoke: parseFloat(smoke) || systemState.thresholds.smoke,
    humidity: humidity ? parseFloat(humidity) : systemState.thresholds.humidity
  };

  logEvent('config', '⚙️ Umbrales actualizados vía API', systemState.thresholds);

  res.json({
    success: true,
    message: 'Umbrales actualizados',
    thresholds: systemState.thresholds
  });
});

/**
 * GET /
 * Página de inicio
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fire ID Server</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #F44336; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .normal { background: #4CAF50; color: white; }
        .riesgo { background: #FF9800; color: white; }
        .confirmado { background: #F44336; color: white; }
        .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .endpoint { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 3px; }
        code { background: #333; color: #0f0; padding: 2px 5px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>🔥 Fire ID Backend Server</h1>
      <p>Sistema de Detección de Fuego IoT</p>
      
      <div class="status ${systemState.alertStatus.toLowerCase()}">
        <strong>Estado Actual:</strong> ${systemState.alertStatus}
      </div>
      
      <div class="info">
        <h3>📊 Última Lectura de Sensores</h3>
        <p>🌡️ Temperatura: ${systemState.sensorData.temperature}°C</p>
        <p>💡 Luminosidad: ${systemState.sensorData.light}</p>
        <p>💨 Humo: ${systemState.sensorData.smoke}</p>
        <p>💧 Humedad: ${systemState.sensorData.humidity}%</p>
        <p>📱 Clientes conectados: ${systemState.connectedClients}</p>
      </div>

      <div class="info">
        <h3>⚙️ Umbrales Configurados</h3>
        <p>🌡️ Temperatura: ${systemState.thresholds.temperature}°C</p>
        <p>💡 Luminosidad: ${systemState.thresholds.light}</p>
        <p>💨 Humo: ${systemState.thresholds.smoke}</p>
        <p>💧 Humedad: ${systemState.thresholds.humidity}%</p>
      </div>

      <h3>🔌 Endpoints Disponibles</h3>
      
      <div class="endpoint">
        <strong>GET</strong> <code>/status</code> - Estado del sistema
      </div>
      <div class="endpoint">
        <strong>GET</strong> <code>/history</code> - Historial de eventos
      </div>
      <div class="endpoint">
        <strong>GET</strong> <code>/logs</code> - Logs del sistema
      </div>
      <div class="endpoint">
        <strong>POST</strong> <code>/sensor-data</code> - Enviar datos de sensores (Arduino)
      </div>
      <div class="endpoint">
        <strong>POST</strong> <code>/trigger-capture</code> - Solicitar captura manual
      </div>
      <div class="endpoint">
        <strong>POST</strong> <code>/update-thresholds</code> - Actualizar umbrales
      </div>

      <h3>📱 WebSocket Events</h3>
      <p><strong>Servidor:</strong> <code>ws://${req.headers.host}</code></p>
      <p>• sensorData - Datos de sensores</p>
      <p>• captureRequest - Solicitud de captura</p>
      <p>• alertStatus - Estado de alerta</p>
      <p>• analysisResult - Resultado de análisis</p>

      <p style="margin-top: 30px; text-align: center; color: #999;">
        Fire ID Server v1.0.0 | ${new Date().toLocaleString('es-ES')}
      </p>
    </body>
    </html>
  `);
});

// ==================== FUNCIONES AUXILIARES ====================

function checkThresholds(sensorData, thresholds) {
  const reasons = [];
  let exceeded = false;

  if (sensorData.temperature > thresholds.temperature) {
    reasons.push(`Temperatura alta (${sensorData.temperature}°C > ${thresholds.temperature}°C)`);
    exceeded = true;
  }
  
  if (sensorData.light > thresholds.light) {
    reasons.push(`Luminosidad alta (${sensorData.light} > ${thresholds.light})`);
    exceeded = true;
  }
  
  if (sensorData.smoke > thresholds.smoke) {
    reasons.push(`Humo detectado (${sensorData.smoke} > ${thresholds.smoke})`);
    exceeded = true;
  }
  
  if (sensorData.humidity && sensorData.humidity < thresholds.humidity) {
    reasons.push(`Humedad baja (${sensorData.humidity}% < ${thresholds.humidity}%)`);
    exceeded = true;
  }

  return { exceeded, reasons };
}

async function analyzeWithAI(captureData) {
  // Verificar si hay servicio de IA externo configurado
  if (AI_SERVICE_URL && AI_SERVICE_URL !== 'http://localhost:5000/analyze') {
    try {
      logEvent('ai', '🤖 Enviando datos a servicio de IA externo...');
      
      const response = await axios.post(AI_SERVICE_URL, {
        imageBase64: captureData.imageBase64,
        audioBase64: captureData.audioBase64,
        timestamp: captureData.timestamp,
        sensorData: systemState.sensorData
      }, {
        timeout: 30000 // 30 segundos
      });

      logEvent('ai', '🤖 Respuesta de IA externa recibida', response.data);
      return response.data;

    } catch (error) {
      logEvent('error', '❌ Error al comunicar con servicio de IA externo, usando TensorFlow.js local', {
        error: error.message
      });
      // Continuar con análisis local
    }
  }

  // Usar servicio de IA local con TensorFlow.js
  try {
    logEvent('ai', '🧠 Analizando con TensorFlow.js (IA local)...');
    
    const result = await aiService.analyzeImage(
      captureData.imageBase64,
      systemState.sensorData
    );

    logEvent('ai', '✅ Análisis de IA completado', {
      fireDetected: result.fireDetected,
      confidence: result.confidence
    });

    return result;

  } catch (error) {
    logEvent('error', '❌ Error en análisis de IA local, usando análisis simulado', {
      error: error.message
    });
    return simulateAIAnalysis();
  }
}

function simulateAIAnalysis() {
  // Análisis simulado basado en datos de sensores
  const { temperature, light, smoke } = systemState.sensorData;
  const { temperature: tempThreshold, light: lightThreshold, smoke: smokeThreshold } = systemState.thresholds;

  // Calcular "probabilidad" basada en cuánto se superan los umbrales
  let fireScore = 0;
  
  if (temperature > tempThreshold) {
    fireScore += (temperature - tempThreshold) / tempThreshold;
  }
  if (light > lightThreshold) {
    fireScore += (light - lightThreshold) / lightThreshold;
  }
  if (smoke > smokeThreshold) {
    fireScore += (smoke - smokeThreshold) / smokeThreshold;
  }

  const fireDetected = fireScore > 1.0;
  const confidence = Math.min(fireScore / 3, 0.95);

  return {
    fireDetected,
    confidence: parseFloat(confidence.toFixed(2)),
    timestamp: new Date(),
    details: {
      visualAnalysis: fireDetected ? 'Llamas detectadas (simulado)' : 'No se detectaron llamas',
      audioAnalysis: fireDetected ? 'Sonido de fuego detectado (simulado)' : 'Sonido normal',
      sensorAnalysis: `Temperatura: ${temperature}°C, Luz: ${light}, Humo: ${smoke}`
    },
    simulated: true
  };
}

async function sendAlerts(aiResult, requestId) {
  logEvent('alert', '🚨 ENVIANDO ALERTAS DE FUEGO');
  
  const message = `
🔥 ALERTA DE FUEGO DETECTADO

Confianza: ${(aiResult.confidence * 100).toFixed(1)}%
Ubicación: Sensor Principal
Hora: ${new Date().toLocaleString('es-ES')}

Datos de Sensores:
🌡️ Temperatura: ${systemState.sensorData.temperature}°C
💡 Luminosidad: ${systemState.sensorData.light}
💨 Humo: ${systemState.sensorData.smoke}
💧 Humedad: ${systemState.sensorData.humidity}%

ID de Captura: ${requestId}
  `.trim();

  // Aquí implementarías el envío real de alertas
  // Por ahora solo simulamos
  
  console.log('\n' + '='.repeat(60));
  console.log(message);
  console.log('='.repeat(60) + '\n');

  logEvent('alert', '📧 Email simulado enviado');
  logEvent('alert', '💬 WhatsApp simulado enviado');
  logEvent('alert', '📱 Telegram simulado enviado');

  // TODO: Implementar envíos reales
  // - sendEmailAlert(message, requestId)
  // - sendWhatsAppAlert(message, requestId)
  // - sendTelegramAlert(message, requestId)
}

// ==================== INICIAR SERVIDOR ====================

// Crear carpetas necesarias
const capturesDir = path.join(__dirname, 'captures');
if (!fs.existsSync(capturesDir)) {
  fs.mkdirSync(capturesDir, { recursive: true });
}

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Inicializar servicio de IA
aiService.initialize().catch(err => {
  console.error('⚠️ Error al inicializar servicio de IA:', err);
  console.log('⚠️ El sistema continuará con análisis simulado');
});

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

server.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 FIRE ID BACKEND SERVER');
  console.log('='.repeat(60));
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Acceso desde red: http://${getLocalIP()}:${PORT}`);
  console.log('='.repeat(60));
  console.log('\n📱 Configuración para App Móvil:');
  console.log(`   URL: http://${getLocalIP()}:${PORT}`);
  console.log('');
  console.log('🤖 Configuración para Arduino:');
  console.log(`   URL: http://${getLocalIP()}:${PORT}/sensor-data`);
  console.log('');
  console.log('🧠 Servicio de IA:');
  if (AI_SERVICE_URL && AI_SERVICE_URL !== 'http://localhost:5000/analyze') {
    console.log(`   Externo: ${AI_SERVICE_URL}`);
  } else {
    console.log('   Local: TensorFlow.js (Deep Learning)');
  }
  console.log('');
  console.log('⏳ Esperando conexiones...\n');
});

// Obtener IP local
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Manejo de errores
process.on('uncaughtException', (error) => {
  logEvent('error', '❌ Error no capturado', { error: error.message });
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  logEvent('error', '❌ Promesa rechazada no manejada', { reason });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

