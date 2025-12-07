/**
 * Script de Prueba - Simula Arduino enviando datos de sensores
 * 
 * Uso: node test-arduino.js
 */

const axios = require('axios');

// Configuración
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const INTERVAL = 3000; // Enviar cada 3 segundos

console.log('🤖 Simulador de Arduino - Fire ID');
console.log('==================================');
console.log(`Servidor: ${SERVER_URL}`);
console.log(`Intervalo: ${INTERVAL}ms`);
console.log('Presiona Ctrl+C para detener\n');

let iteration = 0;

// Función para generar datos aleatorios de sensores
function generateSensorData(simulateFire = false) {
  if (simulateFire) {
    // Simular condiciones de fuego
    return {
      temperature: 40 + Math.random() * 20, // 40-60°C
      light: 850 + Math.random() * 150,      // 850-1000
      smoke: 550 + Math.random() * 200,      // 550-750
      humidity: 15 + Math.random() * 10      // 15-25%
    };
  } else {
    // Condiciones normales con variación
    return {
      temperature: 20 + Math.random() * 10,  // 20-30°C
      light: 200 + Math.random() * 300,      // 200-500
      smoke: 50 + Math.random() * 150,       // 50-200
      humidity: 50 + Math.random() * 30      // 50-80%
    };
  }
}

// Función para enviar datos al servidor
async function sendSensorData() {
  iteration++;
  
  // Cada 10 iteraciones, simular condiciones de fuego
  const simulateFire = (iteration % 10 === 0);
  
  const data = generateSensorData(simulateFire);
  
  // Redondear valores
  data.temperature = parseFloat(data.temperature.toFixed(1));
  data.light = Math.round(data.light);
  data.smoke = Math.round(data.smoke);
  data.humidity = Math.round(data.humidity);

  try {
    console.log(`\n📊 Iteración ${iteration} ${simulateFire ? '🔥 [SIMULANDO FUEGO]' : ''}`);
    console.log('───────────────────────────────');
    console.log(`🌡️  Temperatura: ${data.temperature}°C`);
    console.log(`💡 Luminosidad: ${data.light}`);
    console.log(`💨 Humo: ${data.smoke}`);
    console.log(`💧 Humedad: ${data.humidity}%`);

    const response = await axios.post(`${SERVER_URL}/sensor-data`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.data.success) {
      console.log(`✅ Enviado - Estado: ${response.data.alertStatus}`);
      
      if (response.data.thresholdExceeded) {
        console.log('⚠️  ¡UMBRAL SUPERADO! - Se solicitará captura');
      }
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Error: No se puede conectar al servidor');
      console.log(`   Verifica que el servidor esté corriendo en ${SERVER_URL}`);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Verificar conexión inicial
async function checkServer() {
  try {
    const response = await axios.get(`${SERVER_URL}/status`, { timeout: 5000 });
    console.log('✅ Servidor accesible');
    console.log(`Estado actual: ${response.data.data.alertStatus}`);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ No se puede conectar al servidor');
    console.log(`   URL: ${SERVER_URL}`);
    console.log('   Asegúrate de que el servidor esté corriendo');
    console.log('   Comando: npm start\n');
    return false;
  }
}

// Función principal
async function main() {
  const serverOk = await checkServer();
  
  if (!serverOk) {
    process.exit(1);
  }

  console.log('🚀 Iniciando envío de datos...\n');
  
  // Enviar primer dato inmediatamente
  await sendSensorData();
  
  // Luego enviar cada X segundos
  setInterval(sendSensorData, INTERVAL);
}

// Manejo de cierre
process.on('SIGINT', () => {
  console.log('\n\n👋 Deteniendo simulador...');
  console.log(`Total de iteraciones: ${iteration}`);
  process.exit(0);
});

// Iniciar
main();

