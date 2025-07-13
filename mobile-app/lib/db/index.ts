import { Platform } from 'react-native';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as schema from './schema';

// Database configuration
const DATABASE_NAME = 'saas_app.db';
const DATABASE_VERSION = 1;

// Create database instance based on platform
let db: ReturnType<typeof drizzle>;

if (Platform.OS === 'web') {
  // For web, we'll use IndexedDB through SQL.js
  // This provides a consistent SQLite interface across platforms
  const initWebDB = async () => {
    const initSqlJs = await import('sql.js');
    const SQL = await initSqlJs.default({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    
    // Try to load existing database from IndexedDB
    let data: Uint8Array | undefined;
    try {
      const savedDB = localStorage.getItem(`${DATABASE_NAME}_data`);
      if (savedDB) {
        data = new Uint8Array(JSON.parse(savedDB));
      }
    } catch (error) {
      console.warn('Failed to load saved database:', error);
    }
    
    const sqliteDB = new SQL.Database(data);
    
    // Save database to localStorage on changes
    const saveDB = () => {
      const data = sqliteDB.export();
      localStorage.setItem(`${DATABASE_NAME}_data`, JSON.stringify(Array.from(data)));
    };
    
    // Auto-save every 30 seconds
    setInterval(saveDB, 30000);
    
    // Save on page unload
    window.addEventListener('beforeunload', saveDB);
    
    return drizzle(sqliteDB as any, { schema });
  };
  
  // Initialize web database asynchronously
  initWebDB().then(webDB => {
    db = webDB;
  });
} else {
  // For mobile, use Expo SQLite
  const sqlite = openDatabaseSync(DATABASE_NAME);
  db = drizzle(sqlite, { schema });
  
  // Run migrations on mobile
  try {
    migrate(db, { migrationsFolder: 'lib/db/migrations' });
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

export { db };
export * from './schema';
export * from './types';

// Database utilities
export const dbUtils = {
  async waitForDB(): Promise<typeof db> {
    if (Platform.OS === 'web') {
      // Wait for web database to initialize
      while (!db) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return db;
  },

  async clearDatabase(): Promise<void> {
    const database = await this.waitForDB();
    
    if (Platform.OS === 'web') {
      localStorage.removeItem(`${DATABASE_NAME}_data`);
      location.reload(); // Reload to reinitialize
    } else {
      // Clear all tables (implement based on schema)
      // This would need to be implemented based on your specific tables
      console.warn('Clear database not implemented for mobile');
    }
  },

  async getDatabaseSize(): Promise<number> {
    if (Platform.OS === 'web') {
      const data = localStorage.getItem(`${DATABASE_NAME}_data`);
      return data ? JSON.parse(data).length : 0;
    } else {
      // For mobile, you'd need to implement size calculation
      return 0;
    }
  },
};