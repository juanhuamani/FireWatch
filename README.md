# 🔥 FireWatch - Sistema de Detección de Fuego IoT

Sistema híbrido IoT para detección temprana de incendios mediante sensores Arduino, aplicación móvil React Native y análisis con Deep Learning (TensorFlow.js + MobileNet).

---

## 📋 Descripción

FireWatch es un sistema completo que combina:
- **Sensores IoT** (Arduino) para monitoreo continuo
- **Aplicación móvil** para captura de evidencia visual
- **Deep Learning** para análisis inteligente de imágenes
- **Notificaciones push** para alertas inmediatas

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐
│   Arduino   │ → Lee sensores (Temperatura, Luz, Humo, Humedad)
│  (ESP32)    │ → Envía datos al servidor cada 3 segundos
└──────┬──────┘
       │
       ↓ HTTP POST
┌─────────────┐
│   Backend   │ → Compara valores con umbrales
│   Node.js   │ → Si excede umbral → Solicita captura
│ + Socket.io │ → Recibe foto de la app
└──────┬──────┘ → Envía a IA para análisis
       │
       ↓ WebSocket
┌─────────────┐
│ App Móvil   │ → Recibe solicitud de captura
│React Native │ → Abre cámara nativa
│  FireWatch  │ → Captura foto
└──────┬──────┘ → Envía al servidor (Base64)
       │
       ↓
┌─────────────┐
│   Backend   │ → Guarda archivos
│   Node.js   │ → Envía a TensorFlow.js
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Deep Learn │ → MobileNet v2 (Pre-entrenado)
│ TensorFlow  │ → Extrae características
│     .js     │ → Clasifica: Fuego / No-Fuego
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Alertas    │ → Notificación push en móvil
│ Sistema     │ → Cambia estado: Normal → Riesgo → Confirmado
└─────────────┘
```

---

## 📁 Estructura del Proyecto

```
Fire ID/
│
├── 📱 FireIDApp/              # Aplicación Móvil React Native
│   ├── src/
│   │   ├── components/        # Componentes UI
│   │   ├── screens/           # Pantallas (Dashboard, Settings)
│   │   ├── services/          # Servicios (Socket, Camera, Notifications)
│   │   ├── constants/         # Configuración y tema
│   │   └── navigation/        # Navegación
│   ├── android/               # Código nativo Android
│   └── package.json
│
└── 🖥️ fire-id-server/          # Servidor Backend
    ├── server.js               # Servidor principal
    ├── services/
    │   └── aiService.js        # Servicio de IA (TensorFlow.js)
    ├── captures/               # Imágenes capturadas (gitignored)
    ├── models/                 # Modelos de IA entrenados (gitignored)
    └── package.json
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Android Studio (para compilar app Android)
- Dispositivo Android o emulador

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd "Fire ID"
```

### 2. Configurar el Servidor Backend

```bash
cd fire-id-server
npm install
npm start
```

✅ Servidor corriendo en: `http://localhost:3000`

### 3. Configurar la Aplicación Móvil

```bash
cd FireIDApp
npm install
```

**Para Android:**
```bash
npm run android
```

**Para desarrollo:**
```bash
# Terminal 1
npm start

# Terminal 2
npm run android
```

### 4. Configurar la App en el Dispositivo

1. Abre la app **FireWatch**
2. Toca el botón ⚙️ (esquina inferior derecha)
3. Ingresa la URL del servidor:
   - Encuentra tu IP local: `ipconfig` (Windows) o `ifconfig` (Linux/Mac)
   - Ejemplo: `http://192.168.1.34:3000`
4. Guarda la configuración

✅ La app debería mostrar **"CONECTADO"**

---

## 🎯 Características Principales

### 📱 Aplicación Móvil (FireWatch)

- ✅ **Dashboard en tiempo real** con datos de sensores
- ✅ **Captura automática de foto** cuando se detectan anomalías
- ✅ **Notificaciones push** para alertas
- ✅ **Diseño Neumorphism** moderno y minimalista
- ✅ **Configuración de umbrales** personalizables
- ✅ **Estado del sistema**: Normal / Riesgo / Confirmado

### 🖥️ Servidor Backend

- ✅ **API REST** para recibir datos de Arduino
- ✅ **WebSocket (Socket.io)** para comunicación en tiempo real
- ✅ **Deep Learning** con TensorFlow.js + MobileNet v2
- ✅ **Análisis de imágenes** para detección de fuego
- ✅ **Dashboard web** en tiempo real
- ✅ **Sistema de logs** y historial

### 🧠 Sistema de IA

- ✅ **MobileNet v2** preentrenado (ImageNet)
- ✅ **Análisis híbrido**: Características visuales + Deep Learning
- ✅ **Detección de clases** relacionadas con fuego
- ✅ **Integración con sensores** para mayor precisión
- ✅ **Análisis de fallback** si el modelo falla

---

## 🔧 Configuración

### Variables de Entorno (Servidor)

Crea un archivo `.env` en `fire-id-server/`:

```env
PORT=3000
HOST=0.0.0.0
AI_SERVICE_URL=http://localhost:5000/analyze  # Opcional: IA externa
```

### Configuración de la App

La URL del servidor se configura desde la app:
- Pantalla de Settings → URL del Servidor

### Umbrales por Defecto

- 🌡️ **Temperatura**: 35°C
- 💡 **Luminosidad**: 800
- 💨 **Humo**: 500
- 💧 **Humedad**: 30%

---

## 🧪 Pruebas

### Probar el Sistema Completo

1. **Inicia el servidor:**
```bash
cd fire-id-server
npm start
```

2. **Inicia la app:**
```bash
cd FireIDApp
npm run android
```

3. **Simula datos de Arduino:**
```bash
cd fire-id-server
node test-arduino.js
```

4. **Prueba captura manual:**
```bash
cd fire-id-server
node test-capture.js
```

### Verificar Funcionamiento

- ✅ App muestra "CONECTADO"
- ✅ Datos de sensores aparecen en tiempo real
- ✅ Al exceder umbral → Se solicita captura
- ✅ Notificación push aparece en el móvil
- ✅ Cámara se abre automáticamente
- ✅ Foto se envía al servidor
- ✅ IA analiza la imagen
- ✅ Estado cambia según resultado

---

## 📊 Tecnologías Utilizadas

### Frontend (App Móvil)
- **React Native** 0.82.1
- **TypeScript**
- **React Navigation** - Navegación
- **Socket.io Client** - WebSocket
- **React Native Image Picker** - Cámara
- **React Native Push Notification** - Notificaciones
- **React Native Linear Gradient** - UI
- **AsyncStorage** - Almacenamiento local

### Backend (Servidor)
- **Node.js** + **Express**
- **Socket.io** - WebSocket Server
- **TensorFlow.js** - Deep Learning
- **@tensorflow-models/mobilenet** - Modelo preentrenado
- **Sharp** - Procesamiento de imágenes
- **Axios** - HTTP Client

### Hardware
- **ESP32/ESP8266** - Microcontrolador
- **DHT11/DHT22** - Temperatura y Humedad
- **MQ-2** - Sensor de Humo
- **LDR** - Sensor de Luminosidad

---

## 🎨 Diseño UI

- **Estilo**: Neumorphism / Minimalismo Suave
- **Colores**: Gris claro (#E8ECEF) con acentos de fuego
- **Componentes**: Cards elevadas, gradientes sutiles, sombras suaves
- **Responsive**: Adaptado a diferentes tamaños de pantalla

---

## 📝 Flujo de Detección

1. **Arduino** lee sensores continuamente
2. Si algún valor **excede el umbral** → Arduino envía trigger
3. **Servidor** recibe trigger → Solicita captura a la app
4. **App móvil** recibe solicitud → Muestra notificación push
5. Usuario toca notificación → **Cámara se abre**
6. Usuario toma foto → **Foto se envía al servidor**
7. **Servidor** guarda imagen → Envía a TensorFlow.js
8. **MobileNet** analiza imagen → Extrae características
9. **Clasificador** predice probabilidad de fuego
10. Si fuego detectado → **Estado cambia a "Confirmado"**
11. **Alertas** se envían (notificaciones, email, etc.)

---

## 🔐 Permisos Requeridos

### Android (App)
- `CAMERA` - Para capturar fotos
- `POST_NOTIFICATIONS` - Para notificaciones push
- `VIBRATE` - Para alertas
- `INTERNET` - Para comunicación con servidor

---

## 🐛 Troubleshooting

### App no se conecta
- ✅ Verifica que el servidor esté corriendo
- ✅ Usa IP local (no localhost): `http://192.168.1.XX:3000`
- ✅ Misma red WiFi
- ✅ Firewall desactivado o puerto 3000 permitido

### Notificaciones no aparecen
- ✅ Permisos de notificación otorgados
- ✅ Android 13+: Permisos explícitos requeridos
- ✅ Verifica en configuración del dispositivo

### IA retorna NaN
- ✅ El modelo se inicializa correctamente
- ✅ Verifica logs del servidor
- ✅ El sistema usa fallback automáticamente

### Cámara no se abre
- ✅ Permisos de cámara otorgados
- ✅ Verifica en configuración del dispositivo
- ✅ Reinicia la app

---

## 📚 Documentación Adicional

- **Código Arduino**: Ver ejemplo en `FireIDApp/arduino-example.ino`
- **API del Servidor**: Ver `fire-id-server/server.js` (comentarios)
- **Servicio de IA**: Ver `fire-id-server/services/aiService.js`

---

## 🚀 Próximos Pasos (Opcional)

- [ ] Entrenar modelo personalizado con dataset de fuego
- [ ] Implementar alertas reales (WhatsApp, Email, Telegram)
- [ ] Base de datos para historial persistente
- [ ] Dashboard web avanzado
- [ ] Autenticación y seguridad
- [ ] Deploy en producción

---

## 📄 Licencia

MIT

---

## 👨‍💻 Desarrollo

**FireWatch** - Sistema de Detección Inteligente de Fuego  
Desarrollado con React Native, Node.js y TensorFlow.js

🔥 **FireWatch** - Detección Inteligente
