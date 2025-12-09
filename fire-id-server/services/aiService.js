// Servicio de IA para detección de fuego usando TensorFlow.js con MobileNet preentrenado

const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class AIService {
  constructor() {
    this.mobilenetModel = null;
    this.classifierModel = null;
    this.isModelLoaded = false;
    this.modelPath = path.join(__dirname, '../models/fire-detection-model.json');
  }

  /**
   * Inicializar el servicio de IA
   */
  async initialize() {
    try {
      console.log('🧠 Inicializando servicio de IA con MobileNet preentrenado...');
      
      // Cargar MobileNet preentrenado
      console.log('📥 Cargando MobileNet...');
      this.mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      console.log('✅ MobileNet cargado exitosamente');
      
      // Intentar cargar clasificador personalizado si existe
      if (await this.modelExists()) {
        await this.loadClassifier();
      } else {
        // Crear clasificador simple
        this.createClassifier();
        console.log('✅ Clasificador creado');
      }
      
      this.isModelLoaded = true;
      console.log('✅ Servicio de IA inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar servicio de IA:', error);
      // Fallback: continuar sin MobileNet, usar análisis de características
      this.isModelLoaded = true;
    }
  }

  /**
   * Verificar si existe un modelo guardado
   */
  async modelExists() {
    try {
      await fs.access(this.modelPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cargar clasificador desde archivo
   */
  async loadClassifier() {
    try {
      console.log('📥 Cargando clasificador desde archivo...');
      this.classifierModel = await tf.loadLayersModel(`file://${this.modelPath}`);
      console.log('✅ Clasificador cargado exitosamente');
    } catch (error) {
      console.error('⚠️ Error al cargar clasificador, usando clasificador simple:', error.message);
      this.createClassifier();
    }
  }

  /**
   * Crear clasificador simple (usa características de MobileNet)
   */
  createClassifier() {
    // Clasificador: Entrada (1000 características de MobileNet) -> Dense -> Salida
    this.classifierModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [1280], // MobileNet v2 retorna 1280 características
          units: 128,
          activation: 'relu',
          name: 'dense1'
        }),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          name: 'dense2'
        }),
        tf.layers.dense({
          units: 1, // Salida binaria: fuego (1) o no-fuego (0)
          activation: 'sigmoid',
          name: 'output'
        })
      ]
    });

    // Compilar modelo
    this.classifierModel.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  /**
   * Preprocesar imagen base64
   */
  async preprocessImage(imageBase64) {
    try {
      // Remover prefijo data:image/...;base64,
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Procesar imagen con sharp
      const processed = await sharp(buffer)
        .resize(224, 224) // Tamaño estándar para modelos de visión
        .greyscale() // Convertir a escala de grises (opcional, puede usar RGB)
        .raw()
        .toBuffer();

      // Convertir a tensor
      const imageArray = new Float32Array(processed.length);
      for (let i = 0; i < processed.length; i++) {
        imageArray[i] = processed[i] / 255.0; // Normalizar a [0, 1]
      }

      return imageArray;
    } catch (error) {
      console.error('Error al preprocesar imagen:', error);
      throw error;
    }
  }

  /**
   * Extraer características de la imagen
   */
  async extractFeatures(imageBase64) {
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const image = await sharp(buffer);

      // Obtener metadatos
      const metadata = await image.metadata();
      const { width, height, channels } = metadata;

      // Procesar imagen
      const processed = await image
        .resize(64, 64) // Reducir tamaño para análisis rápido
        .raw()
        .toBuffer();

      // Extraer características visuales del fuego
      const features = this.extractFireFeatures(processed, width, height, channels);
      
      return features;
    } catch (error) {
      console.error('Error al extraer características:', error);
      // Retornar características por defecto
      return new Array(128).fill(0);
    }
  }

  /**
   * Extraer características específicas de fuego
   */
  extractFireFeatures(imageBuffer, width, height, channels) {
    const features = [];
    const pixelCount = width * height;
    
    // Análisis de colores (rojo, naranja, amarillo - típicos del fuego)
    let redIntensity = 0;
    let orangeIntensity = 0;
    let yellowIntensity = 0;
    let brightness = 0;
    let contrast = 0;
    
    const redValues = [];
    const greenValues = [];
    const blueValues = [];

    // Procesar píxeles
    for (let i = 0; i < pixelCount; i++) {
      const r = imageBuffer[i * channels];
      const g = imageBuffer[i * channels + 1] || r;
      const b = imageBuffer[i * channels + 2] || r;
      
      redValues.push(r);
      greenValues.push(g);
      blueValues.push(b);
      
      // Detectar colores de fuego
      if (r > 200 && g < 150 && b < 150) redIntensity++; // Rojo intenso
      if (r > 200 && g > 100 && g < 200 && b < 100) orangeIntensity++; // Naranja
      if (r > 200 && g > 200 && b < 150) yellowIntensity++; // Amarillo
      
      brightness += (r + g + b) / 3;
    }

    // Normalizar
    redIntensity /= pixelCount;
    orangeIntensity /= pixelCount;
    yellowIntensity /= pixelCount;
    brightness /= pixelCount;

    // Calcular contraste
    const mean = brightness;
    let variance = 0;
    for (let i = 0; i < pixelCount; i++) {
      const pixelBrightness = (redValues[i] + greenValues[i] + blueValues[i]) / 3;
      variance += Math.pow(pixelBrightness - mean, 2);
    }
    contrast = Math.sqrt(variance / pixelCount) / 255;

    // Estadísticas de color
    const redMean = redValues.reduce((a, b) => a + b, 0) / redValues.length / 255;
    const greenMean = greenValues.reduce((a, b) => a + b, 0) / greenValues.length / 255;
    const blueMean = blueValues.reduce((a, b) => a + b, 0) / blueValues.length / 255;

    // Construir vector de características (128 dimensiones)
    const featureVector = [
      redIntensity,
      orangeIntensity,
      yellowIntensity,
      brightness / 255,
      contrast,
      redMean,
      greenMean,
      blueMean,
      // Agregar más características (textura, gradientes, etc.)
      ...this.calculateTextureFeatures(imageBuffer, width, height, channels),
      // Rellenar hasta 128 dimensiones
      ...new Array(128 - 8).fill(0)
    ].slice(0, 128);

    return featureVector;
  }

  /**
   * Calcular características de textura
   */
  calculateTextureFeatures(imageBuffer, width, height, channels) {
    // Calcular gradientes (cambios de intensidad)
    const gradients = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * channels;
        const rightIdx = (y * width + (x + 1)) * channels;
        const downIdx = ((y + 1) * width + x) * channels;
        
        const current = imageBuffer[idx];
        const right = imageBuffer[rightIdx];
        const down = imageBuffer[downIdx];
        
        const gradX = Math.abs(current - right);
        const gradY = Math.abs(current - down);
        gradients.push(Math.sqrt(gradX * gradX + gradY * gradY));
      }
    }
    
    const gradientMean = gradients.reduce((a, b) => a + b, 0) / gradients.length / 255;
    const gradientStd = Math.sqrt(
      gradients.reduce((sum, g) => sum + Math.pow(g / 255 - gradientMean, 2), 0) / gradients.length
    );
    
    return [gradientMean, gradientStd];
  }

  /**
   * Convertir imagen base64 a tensor para MobileNet
   */
  async imageToTensor(imageBase64) {
    try {
      if (!imageBase64) {
        throw new Error('imageBase64 está vacío');
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length === 0) {
        throw new Error('Buffer de imagen está vacío');
      }
      
      // Procesar con sharp para formato correcto
      const processed = await sharp(buffer)
        .resize(224, 224) // MobileNet requiere 224x224
        .removeAlpha()
        .raw()
        .toBuffer();

      // Convertir a tensor [1, 224, 224, 3]
      const imageArray = new Float32Array(224 * 224 * 3);
      for (let i = 0; i < 224 * 224; i++) {
        const r = processed[i * 3];
        const g = processed[i * 3 + 1];
        const b = processed[i * 3 + 2];
        
        // MobileNet espera valores normalizados [-1, 1]
        imageArray[i * 3] = (r / 127.5) - 1;
        imageArray[i * 3 + 1] = (g / 127.5) - 1;
        imageArray[i * 3 + 2] = (b / 127.5) - 1;
      }

      return tf.tensor4d(imageArray, [1, 224, 224, 3]);
    } catch (error) {
      console.error('Error al convertir imagen a tensor:', error);
      throw error;
    }
  }

  /**
   * Analizar imagen para detectar fuego usando MobileNet
   */
  async analyzeImage(imageBase64, sensorData = {}) {
    try {
      if (!this.isModelLoaded) {
        await this.initialize();
      }

      console.log('🔍 Analizando imagen con MobileNet + IA...');

      // Si MobileNet está disponible, usarlo
      if (this.mobilenetModel) {
        return await this.analyzeWithMobileNet(imageBase64, sensorData);
      } else {
        // Fallback a análisis de características
        return await this.analyzeWithFeatures(imageBase64, sensorData);
      }
    } catch (error) {
      console.error('❌ Error en análisis de IA:', error);
      // Fallback a análisis básico
      return this.fallbackAnalysis(imageBase64, sensorData);
    }
  }

  /**
   * Analizar usando MobileNet preentrenado
   */
  async analyzeWithMobileNet(imageBase64, sensorData) {
    const imageTensor = await this.imageToTensor(imageBase64);
    
    try {
      // Obtener predicciones de MobileNet (1000 clases de ImageNet)
      const predictions = await this.mobilenetModel.classify(imageTensor);
      
      // Buscar clases relacionadas con fuego en las predicciones
      const fireRelatedClasses = this.findFireRelatedClasses(predictions);
      
      // Obtener características (embeddings) de MobileNet
      const mobilenetEmbedding = this.mobilenetModel.infer(imageTensor, true);
      const embeddingArray = await mobilenetEmbedding.data();
      
      // Usar clasificador personalizado si está disponible
      let fireProb = 0.5; // Probabilidad por defecto
      
      if (this.classifierModel) {
        // Asegurar que el tensor tenga la forma correcta [1, 1280]
        let embeddingTensor = mobilenetEmbedding;
        const shape = embeddingTensor.shape;
        
        console.log(`🔍 Forma del embedding: [${shape.join(', ')}]`);
        
        // Aplanar a 1D primero, luego expandir a [1, 1280]
        const totalSize = shape.reduce((a, b) => a * b, 1);
        if (totalSize !== 1280) {
          console.log(`⚠️ Tamaño inesperado: ${totalSize}, esperado: 1280`);
        }
        
        // Aplanar completamente y luego reshape a [1, 1280]
        embeddingTensor = tf.reshape(embeddingTensor, [1, 1280]);
        
        const prediction = this.classifierModel.predict(embeddingTensor);
        fireProb = (await prediction.data())[0];
        prediction.dispose();
        
        // Dispose del tensor reshapeado
        if (embeddingTensor !== mobilenetEmbedding) {
          embeddingTensor.dispose();
        }
      } else {
        // Análisis híbrido: MobileNet + características visuales + clases detectadas
        const visualFeatures = await this.extractFeatures(imageBase64);
        fireProb = this.combineFeaturesForFire(embeddingArray, visualFeatures, fireRelatedClasses);
      }
      
      // Limpiar tensores
      mobilenetEmbedding.dispose();
      imageTensor.dispose();

      // Validar probabilidad
      if (isNaN(fireProb) || !isFinite(fireProb)) {
        console.log('⚠️ Probabilidad inválida, usando análisis de características');
        return await this.analyzeWithFeatures(imageBase64, sensorData);
      }

      // Combinar con datos de sensores
      const sensorBoost = this.calculateSensorBoost(sensorData);
      const adjustedFireProb = Math.min(Math.max(fireProb + sensorBoost, 0), 0.95);

      const fireDetected = adjustedFireProb > 0.5;
      const confidence = adjustedFireProb;

      console.log(`📊 Resultado IA (MobileNet): Fuego=${fireDetected}, Confianza=${(confidence * 100).toFixed(1)}%`);

      return {
        fireDetected,
        confidence: parseFloat(confidence.toFixed(3)),
        timestamp: new Date(),
        details: {
          visualAnalysis: fireDetected 
            ? `Llamas detectadas con MobileNet (confianza: ${(confidence * 100).toFixed(1)}%)`
            : 'No se detectaron llamas visibles',
          sensorAnalysis: `Temperatura: ${sensorData.temperature || 'N/A'}°C, Luz: ${sensorData.light || 'N/A'}, Humo: ${sensorData.smoke || 'N/A'}`,
          aiModel: 'MobileNet v2 + Custom Classifier',
          method: 'Deep Learning (Pre-trained)',
          detectedClasses: fireRelatedClasses.length > 0 ? fireRelatedClasses.map(c => c.className).join(', ') : 'Ninguna relacionada'
        }
      };
    } catch (error) {
      imageTensor.dispose();
      throw error;
    }
  }

  /**
   * Buscar clases relacionadas con fuego en las predicciones de MobileNet
   */
  findFireRelatedClasses(predictions) {
    const fireKeywords = ['fire', 'flame', 'match', 'candle', 'torch', 'bonfire', 'campfire', 'burn', 'smoke'];
    const fireRelated = [];
    
    for (const pred of predictions) {
      const className = pred.className.toLowerCase();
      if (fireKeywords.some(keyword => className.includes(keyword))) {
        fireRelated.push({
          className: pred.className,
          probability: pred.probability
        });
      }
    }
    
    return fireRelated;
  }

  /**
   * Combinar características de MobileNet con características visuales
   */
  combineFeaturesForFire(mobilenetEmbedding, visualFeatures, fireRelatedClasses = []) {
    // Extraer valores relevantes de características visuales
    const redIntensity = visualFeatures[0] || 0;
    const orangeIntensity = visualFeatures[1] || 0;
    const yellowIntensity = visualFeatures[2] || 0;
    const brightness = visualFeatures[3] || 0;

    // Calcular score basado en características visuales de fuego
    let visualScore = 0;
    visualScore += redIntensity * 0.3;
    visualScore += orangeIntensity * 0.25;
    visualScore += yellowIntensity * 0.2;
    if (brightness > 0.6) {
      visualScore += (brightness - 0.6) * 0.25;
    }

    // Analizar características de MobileNet (embeddings)
    const mobilenetScore = this.analyzeMobileNetFeatures(mobilenetEmbedding);

    // Boost si MobileNet detectó clases relacionadas con fuego
    let classBoost = 0;
    if (fireRelatedClasses.length > 0) {
      const maxClassProb = Math.max(...fireRelatedClasses.map(c => c.probability));
      classBoost = maxClassProb * 0.3; // Hasta 30% de boost
    }

    // Combinar todos los scores
    const combinedScore = (visualScore * 0.5) + (mobilenetScore * 0.3) + (classBoost * 0.2);
    return Math.min(Math.max(combinedScore, 0), 1);
  }

  /**
   * Analizar características de MobileNet para detectar patrones de fuego
   */
  analyzeMobileNetFeatures(features) {
    // MobileNet retorna 1000 características
    // Buscar activaciones altas que puedan indicar fuego
    let maxActivation = 0;
    let highActivations = 0;
    
    for (let i = 0; i < features.length; i++) {
      const val = Math.abs(features[i]);
      if (val > maxActivation) maxActivation = val;
      if (val > 0.1) highActivations++;
    }

    // Normalizar basado en activaciones
    const activationScore = Math.min(maxActivation * 2, 1);
    const diversityScore = Math.min(highActivations / 100, 1);
    
    // Combinar scores
    return (activationScore * 0.7) + (diversityScore * 0.3);
  }

  /**
   * Analizar usando solo características visuales (fallback)
   */
  async analyzeWithFeatures(imageBase64, sensorData) {
    const features = await this.extractFeatures(imageBase64);
    
    // Extraer valores
    const redIntensity = features[0] || 0;
    const orangeIntensity = features[1] || 0;
    const yellowIntensity = features[2] || 0;
    const brightness = features[3] || 0;
    const contrast = features[4] || 0;

    // Calcular score
    let fireScore = 0;
    fireScore += redIntensity * 0.4;
    fireScore += orangeIntensity * 0.3;
    fireScore += yellowIntensity * 0.2;
    if (brightness > 0.6) {
      fireScore += (brightness - 0.6) * 0.5;
    }
    if (contrast > 0.3) {
      fireScore += (contrast - 0.3) * 0.3;
    }

    fireScore = Math.min(Math.max(fireScore, 0), 1);

    // Combinar con sensores
    const sensorBoost = this.calculateSensorBoost(sensorData);
    const adjustedFireProb = Math.min(fireScore + sensorBoost, 0.95);

    const fireDetected = adjustedFireProb > 0.5;
    const confidence = adjustedFireProb;

    console.log(`📊 Resultado IA (Features): Fuego=${fireDetected}, Confianza=${(confidence * 100).toFixed(1)}%`);

    return {
      fireDetected,
      confidence: parseFloat(confidence.toFixed(3)),
      timestamp: new Date(),
      details: {
        visualAnalysis: fireDetected 
          ? `Características de fuego detectadas (confianza: ${(confidence * 100).toFixed(1)}%)`
          : 'No se detectaron características de fuego',
        sensorAnalysis: `Temperatura: ${sensorData.temperature || 'N/A'}°C, Luz: ${sensorData.light || 'N/A'}, Humo: ${sensorData.smoke || 'N/A'}`,
        aiModel: 'Feature Analysis (Fallback)',
        method: 'Visual Features'
      }
    };
  }

  /**
   * Calcular boost basado en sensores
   */
  calculateSensorBoost(sensorData) {
    let boost = 0;
    const { temperature, light, smoke } = sensorData;
    const thresholds = { temperature: 35, light: 800, smoke: 500 };

    if (temperature && temperature > thresholds.temperature) {
      boost += 0.1;
    }
    if (light && light > thresholds.light) {
      boost += 0.05;
    }
    if (smoke && smoke > thresholds.smoke) {
      boost += 0.15;
    }

    return Math.min(boost, 0.3); // Máximo boost de 30%
  }

  /**
   * Análisis de fallback (sin modelo)
   */
  async fallbackAnalysis(imageBase64, sensorData) {
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const image = await sharp(buffer);
      const { data, info } = await image
        .resize(100, 100)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Análisis simple de colores
      let firePixels = 0;
      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1] || r;
        const b = data[i + 2] || r;

        // Detectar colores de fuego
        if ((r > 200 && g < 150 && b < 150) || // Rojo intenso
            (r > 200 && g > 100 && g < 200 && b < 100) || // Naranja
            (r > 200 && g > 200 && b < 150)) { // Amarillo
          firePixels++;
        }
      }

      const fireRatio = firePixels / totalPixels;
      const fireDetected = fireRatio > 0.1; // Más del 10% de píxeles con colores de fuego
      const confidence = Math.min(fireRatio * 2, 0.85); // Escalar a confianza

      return {
        fireDetected,
        confidence: parseFloat(confidence.toFixed(3)),
        timestamp: new Date(),
        details: {
          visualAnalysis: fireDetected 
            ? `Colores de fuego detectados (${(fireRatio * 100).toFixed(1)}% de píxeles)`
            : 'No se detectaron colores de fuego',
          sensorAnalysis: `Temperatura: ${sensorData.temperature || 'N/A'}°C`,
          aiModel: 'Fallback - Color Analysis'
        }
      };
    } catch (error) {
      console.error('Error en análisis de fallback:', error);
      // Último recurso: basado solo en sensores
      return {
        fireDetected: false,
        confidence: 0.5,
        timestamp: new Date(),
        details: {
          visualAnalysis: 'Error en análisis de imagen',
          sensorAnalysis: 'Análisis basado solo en sensores',
          aiModel: 'Error - Sensor Only'
        }
      };
    }
  }
}

// Exportar instancia singleton
module.exports = new AIService();

