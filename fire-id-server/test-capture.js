/**
 * Script de Prueba - Solicitar captura manual
 * 
 * Uso: node test-capture.js
 */

const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log('📸 Test de Captura Manual - Fire ID');
console.log('===================================\n');

async function triggerCapture() {
  try {
    console.log(`🔗 Conectando a: ${SERVER_URL}/trigger-capture`);
    
    const response = await axios.post(`${SERVER_URL}/trigger-capture`, {}, {
      timeout: 5000
    });

    if (response.data.success) {
      console.log('✅ Captura solicitada correctamente');
      console.log(`📋 Request ID: ${response.data.requestId}`);
      console.log('\n📱 Verifica tu app móvil, debería aparecer una alerta para capturar.');
    } else {
      console.log('❌ Error al solicitar captura');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ No se puede conectar al servidor');
      console.log(`   URL: ${SERVER_URL}`);
      console.log('   Asegúrate de que el servidor esté corriendo\n');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function checkStatus() {
  try {
    console.log(`\n📊 Obteniendo estado del sistema...`);
    
    const response = await axios.get(`${SERVER_URL}/status`, {
      timeout: 5000
    });

    const { sensorData, alertStatus, connectedClients, thresholds } = response.data.data;

    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  Estado del Sistema                 │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│  Estado: ${alertStatus.padEnd(27)}│`);
    console.log(`│  Clientes: ${connectedClients}${' '.repeat(25)}│`);
    console.log('├─────────────────────────────────────┤');
    console.log('│  Sensores:                          │');
    console.log(`│    🌡️  Temperatura: ${sensorData.temperature}°C${' '.repeat(15)}│`);
    console.log(`│    💡 Luminosidad: ${sensorData.light}${' '.repeat(18)}│`);
    console.log(`│    💨 Humo: ${sensorData.smoke}${' '.repeat(23)}│`);
    console.log(`│    💧 Humedad: ${sensorData.humidity}%${' '.repeat(19)}│`);
    console.log('├─────────────────────────────────────┤');
    console.log('│  Umbrales:                          │');
    console.log(`│    Temperatura: ${thresholds.temperature}°C${' '.repeat(18)}│`);
    console.log(`│    Luminosidad: ${thresholds.light}${' '.repeat(20)}│`);
    console.log(`│    Humo: ${thresholds.smoke}${' '.repeat(25)}│`);
    console.log(`│    Humedad: ${thresholds.humidity}%${' '.repeat(22)}│`);
    console.log('└─────────────────────────────────────┘\n');

  } catch (error) {
    console.log('❌ Error al obtener estado:', error.message);
  }
}

async function main() {
  // Mostrar estado
  await checkStatus();
  
  // Solicitar captura
  await triggerCapture();
  
  console.log('\n✨ Prueba completada\n');
}

main();

