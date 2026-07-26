// src/lib/db/database.ts
import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  // This creates (or loads) a physical file named "dfin.db" in the app's local OS storage
  dbInstance = await Database.load('sqlite:dfin.db');

  // Initialize the raw SQLite tables as a fallback/persistent layer
  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      scheduledDate TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  return dbInstance;
}