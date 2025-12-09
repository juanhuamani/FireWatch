// Servicio coordinador para captura de foto

import cameraService from './cameraService';
import socketService from './socketService';
import databaseService from './databaseService';
import { CaptureRequest, CaptureResponse } from '../types';

class CaptureService {
  async handleCaptureRequest(request: CaptureRequest): Promise<void> {
    console.log('🚀 Iniciando captura de FOTO...');

    try {
      // SOLO capturar foto
      console.log('📸 Capturando foto con cámara...');
      const photoPath = await this.capturePhoto();

      // Convertir foto a base64
      let imageBase64: string | null = null;

      if (photoPath) {
        console.log('🔄 Convirtiendo foto a base64...');
        imageBase64 = await cameraService.convertPhotoToBase64(photoPath);
        if (imageBase64) {
          console.log('✅ Foto convertida a base64');
        }
      }

      // Preparar respuesta (SOLO con foto, sin audio)
      const response: CaptureResponse = {
        requestId: request.requestId,
        imageBase64: imageBase64 || undefined,
        audioBase64: undefined, // Sin audio
        timestamp: new Date(),
        error: !imageBase64 ? 'Error al capturar foto' : undefined,
      };

      // Guardar captura en SQLite (solo si hay imagen)
      if (photoPath && imageBase64) {
        try {
          await databaseService.saveLocalCapture({
            requestId: request.requestId,
            imagePath: photoPath,
            fireDetected: false,
            confidence: 0
          });
          console.log('💾 Captura guardada en SQLite');
        } catch (error) {
          console.error('⚠️  Error al guardar en SQLite:', error);
          // No fallar si SQLite falla, continuar con el envío
        }
      } else {
        console.log('⚠️  No se guardó en SQLite: no hay imagen');
      }

      // Enviar al servidor
      console.log('📤 Enviando foto al servidor...');
      socketService.sendCaptureResponse(response);

      console.log('✅ Captura completada y enviada al servidor');

      // Limpiar archivo temporal
      if (photoPath) {
        await cameraService.deletePhoto(photoPath);
      }

    } catch (error) {
      console.error('❌ Error durante la captura:', error);
      
      // Enviar error al servidor
      const errorResponse: CaptureResponse = {
        requestId: request.requestId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
      
      socketService.sendCaptureResponse(errorResponse);
    }
  }

  private async capturePhoto(): Promise<string | null> {
    try {
      console.log('📸 Capturando foto REAL...');
      
      // Captura real usando la cámara
      const photoPath = await cameraService.capturePhoto();
      
      if (photoPath) {
        console.log('✅ Foto capturada exitosamente');
        return photoPath;
      }
      
      console.log('❌ No se capturó foto');
      return null;
    } catch (error) {
      console.error('Error al capturar foto:', error);
      return null;
    }
  }

}

export default new CaptureService();