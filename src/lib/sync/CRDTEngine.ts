// src/lib/sync/CRDTEngine.ts
import * as Y from 'yjs';
import { getDb } from '$lib/db/database';

export const ydoc = new Y.Doc();
export const yTasks = ydoc.getMap('tasks');

// A hook to let Svelte know when network data arrives
let onSyncCallback: (() => void) | null = null;

export function setSyncCallback(callback: () => void) {
  onSyncCallback = callback;
}

// Extracts all tasks from the Yjs map into a standard array for Svelte
export function getTasksFromCRDT(): any[] {
  return Array.from(yTasks.values());
}

export async function initializeCRDT() {
  try {
    const db = await getDb();
    
    const tasks = (await db.select('SELECT * FROM tasks')) as any[];

    ydoc.transact(() => {
      tasks.forEach((task: any) => {
        yTasks.set(task.id, task);
      });
    });

    console.log(`[CRDT] Engine Initialized. Tracking ${yTasks.size} tasks.`);
    
    yTasks.observe(event => {
      console.log('[CRDT] State mutation detected:', event.keysChanged);
      // Whenever data changes (local or via network), tell Svelte to redraw
      if (onSyncCallback) {
        onSyncCallback();
      }
    });

  } catch (error) {
    console.error('[CRDT] Failed to initialize engine:', error);
  }
}

export function updateLocalTaskInCRDT(id: string, updates: Record<string, any>) {
  const existingTask = yTasks.get(id) || { id };
  const updatedTask = { ...existingTask, ...updates };
  
  ydoc.transact(() => {
    yTasks.set(id, updatedTask);
  });
  
  console.log(`[CRDT] Local mutation applied (Upserted) to Task ID: ${id}`);
}