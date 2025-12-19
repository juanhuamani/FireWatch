# 🐳 Docker - Fire ID Server

Guía para ejecutar el servidor Fire ID usando Docker.

## 📋 Requisitos Previos

- Docker instalado
- Docker Compose instalado (opcional, pero recomendado)

## 🚀 Inicio Rápido

### Opción 1: Usando Docker Compose (Recomendado)

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Opción 2: Usando Docker directamente

```bash
# Construir la imagen
docker build -t fire-id-server .

# Ejecutar el contenedor
docker run -d \
  --name fire-id-server \
  -p 3000:3000 \
  -v $(pwd)/captures:/app/captures \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public:/app/public \
  fire-id-server

# Ver logs
docker logs -f fire-id-server

# Detener
docker stop fire-id-server
docker rm fire-id-server
```

## ⚙️ Configuración

### Variables de Entorno

Puedes configurar variables de entorno de dos formas:

#### 1. Modificar docker-compose.yml

Edita el archivo `docker-compose.yml` y agrega/modifica las variables en la sección `environment`:

```yaml
environment:
  - PORT=3000
  - HOST=0.0.0.0
  - AI_SERVICE_URL=http://tu-servicio-ia:5000/analyze
```

#### 2. Usar archivo .env

Crea un archivo `.env` en el directorio del proyecto:

```env
PORT=3000
HOST=0.0.0.0
AI_SERVICE_URL=http://localhost:5000/analyze
```

Y modifica `docker-compose.yml` para leerlo:

```yaml
env_file:
  - .env
```

### Volúmenes

Los siguientes directorios se montan como volúmenes para persistir datos:

- `./captures` - Fotos y archivos capturados
- `./data` - Base de datos SQLite
- `./public` - Archivos estáticos

## 🔍 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f fire-id-server
```

### Ejecutar comandos dentro del contenedor
```bash
docker-compose exec fire-id-server sh
```

### Reconstruir la imagen
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Ver estado del contenedor
```bash
docker-compose ps
```

### Verificar salud del servicio
```bash
docker-compose exec fire-id-server wget -q -O- http://localhost:3000/status
```

## 🌐 Acceso

Una vez iniciado, el servidor estará disponible en:

- **Local**: http://localhost:3000
- **Red local**: http://TU_IP:3000

Para encontrar tu IP local:
```bash
# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

## 🧪 Pruebas

### Probar el servidor
```bash
curl http://localhost:3000/status
```

### Simular datos de Arduino
```bash
curl -X POST http://localhost:3000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 25.5,
    "light": 450,
    "smoke": 120,
    "humidity": 60
  }'
```

### Solicitar captura manual
```bash
curl -X POST http://localhost:3000/trigger-capture
```

## 🔧 Troubleshooting

### El contenedor no inicia

1. Verifica los logs:
```bash
docker-compose logs fire-id-server
```

2. Verifica que el puerto 3000 no esté en uso:
```bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

3. Reconstruye la imagen:
```bash
docker-compose build --no-cache
```

### Los datos no se persisten

Verifica que los volúmenes estén montados correctamente:
```bash
docker-compose exec fire-id-server ls -la /app/captures
docker-compose exec fire-id-server ls -la /app/data
```

### Problemas con permisos

Si tienes problemas con permisos en los volúmenes:
```bash
# Ajustar permisos en el host
sudo chown -R $USER:$USER captures data public
```

## 📦 Producción

Para producción, considera:

1. **Usar un archivo .env separado** para secretos
2. **Configurar HTTPS** usando un reverse proxy (nginx, traefik)
3. **Implementar backups** de la base de datos
4. **Configurar límites de recursos**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

5. **Usar un registro de imágenes** (Docker Hub, GitHub Container Registry)

## 🔐 Seguridad

- No expongas el puerto 3000 directamente en producción
- Usa un reverse proxy con SSL/TLS
- Limita el acceso a la red interna cuando sea posible
- Mantén las imágenes actualizadas

## 📚 Recursos

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Fire ID Server README](./README.md)

