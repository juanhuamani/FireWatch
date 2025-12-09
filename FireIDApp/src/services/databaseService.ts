// Servicio de SQLite para la app móvil

import SQLite from 'react-native-sqlite-storage';

class DatabaseService {
  private db: any = null;

  constructor() {
    // Constructor vacío, la inicialización se hace en initialize()
  }

  /**
   * Inicializar la base de datos
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'fireid.db',
        location: 'default'
      });

      console.log('🗄️  Base de datos SQLite inicializada');
      await this.initializeTables();
    } catch (error) {
      console.error('❌ Error al inicializar base de datos:', error);
      throw error;
    }
  }

  /**
   * Crear tablas
   */
  private async initializeTables(): Promise<void> {
    try {
      // Tabla de alertas locales
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS local_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alert_id INTEGER,
          alert_type TEXT,
          severity TEXT,
          message TEXT,
          fire_detected INTEGER,
          confidence REAL,
          image_path TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved INTEGER DEFAULT 0
        )
      `);

      // Tabla de capturas locales
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS local_captures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id TEXT UNIQUE,
          image_path TEXT,
          fire_detected INTEGER,
          confidence REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de datos sincronizados
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT,
          entity_id INTEGER,
          synced INTEGER DEFAULT 0,
          last_sync DATETIME
        )
      `);

      // Tabla de configuración local
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS app_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE,
          value TEXT,
          type TEXT
        )
      `);

      console.log('✅ Tablas de base de datos creadas/verificadas');
    } catch (error) {
      console.error('❌ Error al crear tablas:', error);
      throw error;
    }
  }

  /**
   * Ejecutar sentencia SQL
   */
  private async executeSql(
    sql: string,
    params: any[] = []
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      this.db.transaction((tx: any) => {
        tx.executeSql(sql, params, (_, result) => resolve(result), (_, error) => {
          console.error('SQL Error:', error, 'SQL:', sql);
          reject(error);
        });
      });
    });
  }

  /**
   * Guardar alerta local
   */
  async saveLocalAlert(alertData: any): Promise<void> {
    try {
      // Verificar que la DB esté inicializada
      if (!this.db) {
        console.warn('⚠️  Base de datos no inicializada, inicializando...');
        await this.initialize();
      }

      await this.executeSql(
        `INSERT INTO local_alerts (alert_type, severity, message, fire_detected, confidence, image_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          alertData.type || 'warning',
          alertData.severity || 'medium',
          alertData.message,
          alertData.fireDetected ? 1 : 0,
          alertData.confidence || 0,
          alertData.imagePath || null
        ]
      );
      console.log('✅ Alerta guardada en SQLite correctamente');
    } catch (error) {
      console.error('❌ Error al guardar alerta local:', error);
      // No lanzar error para no romper el flujo principal
    }
  }

  /**
   * Obtener alertas locales no sincronizadas
   */
  async getUnsyncedAlerts(): Promise<any[]> {
    try {
      const result = await this.executeSql(
        `SELECT * FROM local_alerts 
         WHERE id NOT IN (SELECT entity_id FROM sync_status WHERE entity_type = 'alert')
         ORDER BY timestamp DESC`
      );
      return result.rows.raw() || [];
    } catch (error) {
      console.error('❌ Error al obtener alertas no sincronizadas:', error);
      return [];
    }
  }

  /**
   * Obtener todas las alertas locales
   */
  async getAllLocalAlerts(): Promise<any[]> {
    try {
      const result = await this.executeSql(
        `SELECT * FROM local_alerts ORDER BY timestamp DESC`
      );
      return result.rows.raw() || [];
    } catch (error) {
      console.error('❌ Error al obtener alertas:', error);
      return [];
    }
  }

  /**
   * Guardar captura local
   */
  async saveLocalCapture(captureData: any): Promise<void> {
    try {
      // Verificar que la DB esté inicializada
      if (!this.db) {
        console.warn('⚠️  Base de datos no inicializada, inicializando...');
        await this.initialize();
      }

      await this.executeSql(
        `INSERT INTO local_captures (request_id, image_path, fire_detected, confidence)
         VALUES (?, ?, ?, ?)`,
        [
          captureData.requestId,
          captureData.imagePath || null,
          captureData.fireDetected ? 1 : 0,
          captureData.confidence || 0
        ]
      );
      console.log('✅ Captura guardada en SQLite correctamente');
    } catch (error) {
      console.error('❌ Error al guardar captura local:', error);
      // No lanzar error para no romper el flujo principal
    }
  }

  /**
   * Obtener capturas locales
   */
  async getLocalCaptures(limit: number = 50): Promise<any[]> {
    try {
      const result = await this.executeSql(
        `SELECT * FROM local_captures ORDER BY timestamp DESC LIMIT ?`,
        [limit]
      );
      return result.rows.raw() || [];
    } catch (error) {
      console.error('❌ Error al obtener capturas:', error);
      return [];
    }
  }

  /**
   * Guardar configuración
   */
  async saveConfig(key: string, value: string, type: string = 'string'): Promise<void> {
    try {
      await this.executeSql(
        `INSERT OR REPLACE INTO app_config (key, value, type)
         VALUES (?, ?, ?)`,
        [key, value, type]
      );
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const result = await this.executeSql(
        `SELECT value FROM app_config WHERE key = ?`,
        [key]
      );

      if (result.rows.length > 0) {
        return result.rows.item(0).value;
      }
      return null;
    } catch (error) {
      console.error('❌ Error al obtener configuración:', error);
      return null;
    }
  }

  /**
   * Marcar como sincronizado
   */
  async markAsSynced(entityType: string, entityId: number): Promise<void> {
    try {
      await this.executeSql(
        `INSERT OR REPLACE INTO sync_status (entity_type, entity_id, synced, last_sync)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
        [entityType, entityId]
      );
    } catch (error) {
      console.error('❌ Error al marcar como sincronizado:', error);
    }
  }

  /**
   * Limpiar base de datos
   */
  async clearAll(): Promise<void> {
    try {
      await this.executeSql('DELETE FROM local_alerts');
      await this.executeSql('DELETE FROM local_captures');
      await this.executeSql('DELETE FROM sync_status');
      console.log('✅ Base de datos limpiada');
    } catch (error) {
      console.error('❌ Error al limpiar base de datos:', error);
    }
  }

  /**
   * Cerrar base de datos
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close(
          () => {
            console.log('🗄️  Base de datos cerrada');
            resolve();
          },
          (error) => {
            console.error('❌ Error al cerrar base de datos:', error);
            reject(error);
          }
        );
      } else {
        resolve();
      }
    });
  }
}

export default new DatabaseService();
