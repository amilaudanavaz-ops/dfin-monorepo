<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb } from '$lib/db/database';
  import TaskInput from '$lib/components/schedule/TaskInput.svelte';
  import Calendar from '$lib/components/schedule/Calendar.svelte';
  import Timeline from '$lib/components/session/Timeline.svelte';
  import { startReminderEngine } from '$lib/sync/ReminderEngine';
  import { connectToLocalNode } from '$lib/sync/WebSocketClient';
  import { initializeCRDT, setSyncCallback, getTasksFromCRDT } from '$lib/sync/CRDTEngine';
  
  let tasks = $state<any[]>([]);
  let errorMsg = $state('');
  let activeView = $state('schedule');
  
  onMount(async () => {
    await loadTasks();
    await initializeCRDT();
    await startReminderEngine();

    // Wire the CRDT network sync callback to instantly update the UI state
    setSyncCallback(() => {
      console.log("[UI] Network data received. Refreshing canvas...");
      tasks = getTasksFromCRDT();
    });
    
    connectToLocalNode();
  });

  async function loadTasks() {
    try {
      const db = await getDb();
      // Fetch tasks ordered by time
      tasks = (await db.select('SELECT * FROM tasks ORDER BY scheduledTime ASC')) as any[];
    } catch (e) {
      errorMsg = `Failed to load tasks: ${e}`;
    }
  }

  async function handleSaveTask(newTask: any) {
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO tasks (id, title, durationMinutes, scheduledDate, scheduledTime, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [newTask.id, newTask.title, newTask.durationMinutes, newTask.scheduledDate, newTask.scheduledTime, newTask.status]
      );
      await loadTasks(); // Refresh the UI
    } catch (e) {
      alert(`Database error: ${e}`);
    }
  }
</script>

<main class="min-h-screen p-8 max-w-6xl mx-auto flex flex-col">
  <header class="mb-8 flex justify-between items-end">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-white">DFIN</h1>
      {#if errorMsg} <p class="text-red-500 text-xs mt-2">{errorMsg}</p> {/if}
    </div>
    
    <!-- View Toggle Tabs -->
    <div class="flex bg-dfinSurface border border-dfinAccent rounded-lg p-1">
      <button 
        onclick={() => activeView = 'schedule'}
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeView === 'schedule' ? 'bg-dfinAccent text-white' : 'text-dfinMuted hover:text-white'}">
        1. Blueprint
      </button>
      <button 
        onclick={() => activeView = 'session'}
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeView === 'session' ? 'bg-dfinAccent text-white' : 'text-dfinMuted hover:text-white'}">
        2. Session
      </button>
    </div>
  </header>

  <div class="flex-grow">
    {#if activeView === 'schedule'}
      <!-- SCHEDULE VIEW -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-1">
          <TaskInput onSave={handleSaveTask} />
        </div>
        <div class="md:col-span-2">
          <Calendar {tasks} />
        </div>
      </div>
    {:else}
      <!-- SESSION VIEW -->
      <div class="max-w-3xl mx-auto">
        <Timeline {tasks} onTaskUpdate={loadTasks} />
      </div>
    {/if}
  </div>
</main>