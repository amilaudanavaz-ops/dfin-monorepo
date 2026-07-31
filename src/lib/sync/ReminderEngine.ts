// src/lib/sync/ReminderEngine.ts
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { getDb } from '$lib/db/database';

let reminderInterval: ReturnType<typeof setInterval>;
// Keep track of tasks we've already notified the user about
const notifiedTasks = new Set<string>(); 

export async function startReminderEngine() {
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) return;
  // 1. Request OS Permission
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  // 2. Start the background checker if permitted
  if (permissionGranted) {
    // Check every 60 seconds
    reminderInterval = setInterval(checkUpcomingTasks, 60000);
    checkUpcomingTasks(); // Run an immediate check on boot
  }
}

async function checkUpcomingTasks() {
  try {
    const db = await getDb();
    // Only fetch pending tasks
    const tasks = (await db.select('SELECT * FROM tasks WHERE...')) as any[];
    const now = new Date();

    tasks.forEach((task: any) => {
      if (notifiedTasks.has(task.id)) return;

      const taskStart = new Date(`${task.scheduledDate}T${task.scheduledTime}:00`);
      
      // Calculate minutes difference
      const diffMinutes = (taskStart.getTime() - now.getTime()) / (1000 * 60);

      // If the task starts in exactly 5 minutes (or falls within the 0-5 min window)
      if (diffMinutes > 0 && diffMinutes <= 5) {
        sendNotification({
          title: 'DFIN Session Alert',
          body: `Prepare to focus: "${task.title}" begins in 5 minutes.`
        });
        notifiedTasks.add(task.id);
      }
    });
  } catch (error) {
    console.error("Reminder Engine Error:", error);
  }
}