// src/lib/db/database.ts
import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb() {
  // BROWSER MOCK: If Tauri is missing, return a dummy database to prevent crashes
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    console.warn("[MOCK] Running in browser. SQLite disabled.");
    return {
      execute: async () => [],
      select: async () => []
    } as any;
  }

  // NORMAL TAURI BOOT
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:dfin.db');
  }
  return dbInstance;
}