# Dockerfile para Fire ID Backend Server
FROM node:20-alpine

# Instalar dependencias del sistema necesarias para módulos nativos
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    libc6-compat \
    wget

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p captures data public

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Comando para iniciar el servidor
CMD ["node", "server.js"]

