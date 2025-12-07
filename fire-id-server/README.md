# 🔥 Fire ID Backend Server

Servidor backend para el sistema de detección de fuego IoT Fire ID.

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Desarrollo (con auto-reload)
npm run dev
```

## ⚙️ Configuración

El servidor funcionará con la configuración por defecto, pero puedes personalizar:

1. Copia `config.example.txt` a `.env`
2. Edita los valores según tus necesidades
3. Reinicia el servidor

### Configuración por Defecto

- **Puerto**: 3000
- **Host**: 0.0.0.0 (acepta conexiones externas)
- **IA**: Análisis simulado (hasta que configures el servicio real)

## 📡 Endpoints

### REST API

#### `GET /`
Página de inicio con estado del sistema

#### `GET /status`
Obtiene el estado actual del sistema
```json
{
  "success": true,
  "data": {
    "sensorData": { ... },
    "alertStatus": "Normal",
    "thresholds": { ... },
    "connectedClients": 1
  }
}
```

#### `POST /sensor-data`
Recibe datos de sensores (Arduino)
```json
{
  "temperature": 25.5,
  "light": 450,
  "smoke": 120,
  "humidity": 60
}
```

#### `POST /trigger-capture`
Solicita captura manual desde la app
```json
{
  "success": true,
  "requestId": "manual_1234567890"
}
```

#### `GET /history`
Obtiene el historial de eventos

#### `GET /logs`
Obtiene los logs del sistema

#### `POST /update-thresholds`
Actualiza umbrales manualmente
```json
{
  "temperature": 35,
  "light": 800,
  "smoke": 500,
  "humidity": 30
}
```

### WebSocket Events

**URL**: `ws://TU_IP:3000`

#### Eventos del Servidor → App

**`sensorData`** - Datos de sensores en tiempo real
```javascript
{
  temperature: 25.5,
  light: 450,
  smoke: 120,
  humidity: 60,
  timestamp: Date
}
```

**`captureRequest`** - Solicitud de captura
```javascript
{
  requestId: "capture_1234567890",
  timestamp: Date,
  reason: "Umbral superado: Temperatura alta"
}
```

**`alertStatus`** - Estado de alerta
```javascript
"Normal" | "Riesgo" | "Confirmado"
```

**`analysisResult`** - Resultado de análisis IA
```javascript
{
  fireDetected: true,
  confidence: 0.85,
  timestamp: Date,
  details: { ... }
}
```

#### Eventos de la App → Servidor

**`captureResponse`** - Respuesta con archivos capturados
```javascript
{
  requestId: "capture_1234567890",
  imageBase64: "data:image/jpeg;base64,...",
  audioBase64: "data:audio/m4a;base64,...",
  timestamp: Date,
  error: null
}
```

**`thresholdUpdate`** - Actualización de umbrales
```javascript
{
  temperature: 35,
  light: 800,
  smoke: 500,
  humidity: 30
}
```

## 🤖 Integración con Arduino

Tu Arduino debe enviar datos a `POST /sensor-data`:

```cpp
// Ejemplo de código Arduino
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "http://192.168.1.100:3000/sensor-data";

void sendSensorData() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{";
  payload += "\"temperature\":" + String(temperature) + ",";
  payload += "\"light\":" + String(light) + ",";
  payload += "\"smoke\":" + String(smoke) + ",";
  payload += "\"humidity\":" + String(humidity);
  payload += "}";
  
  int httpCode = http.POST(payload);
  http.end();
}
```

## 📱 Integración con App Móvil

En la app móvil, configura la URL del servidor:

```
http://TU_IP_LOCAL:3000
```

Para encontrar tu IP local:
- Windows: `ipconfig`
- Linux/Mac: `ifconfig` o `ip addr`

Usa la dirección IPv4 de tu red local (ejemplo: 192.168.1.100)

## 🧠 Integración con IA

### Opción 1: Análisis Simulado (Por Defecto)

El servidor usa análisis simulado basado en los datos de sensores.

### Opción 2: Servicio de IA Real

1. Crea un servicio Flask/FastAPI
2. Endpoint: `POST /analyze`
3. Configura en `.env`: `AI_SERVICE_URL=http://localhost:5000/analyze`

El servicio debe responder:
```json
{
  "fireDetected": true,
  "confidence": 0.85,
  "timestamp": "2024-12-06T...",
  "details": {
    "visualAnalysis": "Llamas detectadas",
    "audioAnalysis": "Sonido de fuego",
    "sensorAnalysis": "..."
  }
}
```

## 📁 Estructura de Archivos

```
fire-id-server/
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── .gitignore            # Archivos ignorados
├── config.example.txt    # Configuración de ejemplo
├── README.md             # Esta documentación
├── test-arduino.js       # Script de prueba para Arduino
├── captures/             # Archivos capturados (auto-creado)
└── public/               # Archivos estáticos (auto-creado)
```

## 🧪 Pruebas

### Probar el servidor

```bash
# Iniciar servidor
npm start

# En tu navegador, abre:
http://localhost:3000
```

### Simular Arduino

```bash
# Usar el script de prueba
node test-arduino.js
```

### Probar captura manual

```bash
curl -X POST http://localhost:3000/trigger-capture
```

### Ver estado

```bash
curl http://localhost:3000/status
```

## 📊 Flujo del Sistema

```
1. Arduino lee sensores → POST /sensor-data
2. Servidor recibe datos → Verifica umbrales
3. Si umbral superado → Emite captureRequest (WebSocket)
4. App recibe request → Captura foto + audio
5. App envía captureResponse → Servidor recibe archivos
6. Servidor → Envía a IA para análisis
7. IA retorna resultado → Servidor actualiza estado
8. Si fuego confirmado → Envía alertas
```

## 🚨 Sistema de Alertas

Actualmente las alertas son simuladas (se muestran en consola).

Para implementar alertas reales, configura:

### Email (Nodemailer)
```bash
npm install nodemailer
```

### WhatsApp (Twilio)
```bash
npm install twilio
```

### Telegram
```bash
npm install node-telegram-bot-api
```

## 🔧 Troubleshooting

### El servidor no inicia
- Verifica que el puerto 3000 esté libre
- Intenta con otro puerto: `PORT=3001 npm start`

### App móvil no se conecta
- Verifica la IP del servidor
- Asegúrate de estar en la misma red WiFi
- Desactiva firewall temporalmente
- Prueba con: `http://TU_IP:3000`

### Arduino no envía datos
- Verifica la URL en el código Arduino
- Verifica conexión WiFi del Arduino
- Revisa Serial Monitor para errores

## 📝 Logs

Los logs se muestran en consola con formato:
```
[2024-12-06T18:30:00] [TIPO] Mensaje
```

Tipos de logs:
- `CONNECTION` - Conexiones/desconexiones
- `SENSOR` - Datos de sensores
- `CAPTURE` - Capturas de foto/audio
- `AI` - Análisis de IA
- `ALERT` - Alertas de fuego
- `WARNING` - Advertencias
- `ERROR` - Errores

## 🎯 Estado del Sistema

El servidor mantiene el estado en memoria:
- Últimos datos de sensores
- Estado de alerta actual
- Umbrales configurados
- Historial de eventos (últimos 50)
- Logs del sistema (últimos 100)

## 🔐 Seguridad

**Para producción:**
- [ ] Implementa autenticación
- [ ] Usa HTTPS
- [ ] Configura CORS apropiadamente
- [ ] Limita tamaño de uploads
- [ ] Implementa rate limiting
- [ ] Usa variables de entorno para secretos

## 📚 Recursos

- [Express.js Docs](https://expressjs.com/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📄 Licencia

MIT

---

**Desarrollado para Fire ID - Sistema de Detección de Fuego IoT** 🔥

