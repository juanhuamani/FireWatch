/**
 * Script de Prueba Rápida - Verificar Conexión
 * 
 * Uso: node test-conexion.js
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

console.log('\n🔥 Fire ID - Prueba de Conexión');
console.log('================================\n');

async function testConnection() {
  try {
    // 1. Verificar servidor
    console.log('1️⃣ Verificando servidor...');
    const response = await axios.get(`${SERVER_URL}/status`, { timeout: 5000 });
    
    if (response.data.success) {
      console.log('   ✅ Servidor funcionando correctamente\n');
      
      // Mostrar información
      const { sensorData, alertStatus, connectedClients, thresholds } = response.data.data;
      
      console.log('📊 Estado del Sistema:');
      console.log('   Estado: ' + alertStatus);
      console.log('   Clientes conectados: ' + connectedClients);
      console.log('');
      
      console.log('🌡️  Última Lectura de Sensores:');
      console.log(`   Temperatura: ${sensorData.temperature}°C`);
      console.log(`   Luminosidad: ${sensorData.light}`);
      console.log(`   Humo: ${sensorData.smoke}`);
      console.log(`   Humedad: ${sensorData.humidity}%`);
      console.log('');
      
      console.log('⚙️  Umbrales Configurados:');
      console.log(`   Temperatura: ${thresholds.temperature}°C`);
      console.log(`   Luminosidad: ${thresholds.light}`);
      console.log(`   Humo: ${thresholds.smoke}`);
      console.log(`   Humedad: ${thresholds.humidity}%`);
      console.log('');
      
      // 2. Prueba de envío de datos
      console.log('2️⃣ Probando envío de datos de sensores...');
      const testData = {
        temperature: 26.5,
        light: 350,
        smoke: 120,
        humidity: 58
      };
      
      const postResponse = await axios.post(`${SERVER_URL}/sensor-data`, testData, {
        timeout: 5000
      });
      
      if (postResponse.data.success) {
        console.log('   ✅ Envío de datos funciona correctamente\n');
      }
      
      // Resumen
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('✅ TODAS LAS PRUEBAS PASARON');
      console.log('');
      console.log('🎯 Siguiente paso:');
      console.log('   1. Abre tu app móvil Fire ID');
      console.log('   2. Ve a Configuración (⚙️)');
      console.log('   3. Ingresa: http://172.19.32.1:3000');
      console.log('   4. Guarda los cambios');
      console.log('   5. Verifica que aparezca "● Conectado"');
      console.log('');
      console.log('📱 Para simular Arduino:');
      console.log('   npm run test:arduino');
      console.log('');
      console.log('🌐 Ver dashboard web:');
      console.log('   http://localhost:3000');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    }
  } catch (error) {
    console.log('   ❌ Error al conectar con el servidor\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔍 Diagnóstico:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ El servidor no está corriendo');
      console.log('');
      console.log('💡 Solución:');
      console.log('   1. Abre una nueva terminal');
      console.log('   2. cd fire-id-server');
      console.log('   3. npm start');
      console.log('');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   ❌ Timeout - El servidor no responde');
      console.log('');
      console.log('💡 Solución:');
      console.log('   - Verifica que el servidor esté corriendo');
      console.log('   - Verifica tu firewall');
      console.log('');
    } else {
      console.log(`   Error: ${error.message}`);
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

async function main() {
  await testConnection();
}

main();

