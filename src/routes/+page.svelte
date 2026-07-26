<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb } from '$lib/db/database';

  let tasks = $state<{ id: string; title: string; durationMinutes: number }[]>([]);
  let dbStatus = $state('Initializing database...');

  onMount(async () => {
    try {
      const db = await getDb();
      dbStatus = 'Database connected successfully (Offline SQLite).';
      await loadTasks();
    } catch (error) {
      dbStatus = `Database connection failed: ${error}`;
    }
  });

  async function loadTasks() {
    const db = await getDb();
    tasks = await db.select('SELECT * FROM tasks');
  }

  async function addDummyTask() {
    try {
      console.log("Button clicked, fetching DB...");
      const db = await getDb();
      const uniqueId = crypto.randomUUID();
      
      console.log("Executing SQL insert...");
      await db.execute(
        'INSERT INTO tasks (id, title, durationMinutes, scheduledDate, status) VALUES ($1, $2, $3, $4, $5)',
        [uniqueId, 'Test UI Component', 60, '2026-07-26', 'pending']
      );
      
      console.log("Insert successful, reloading tasks...");
      await loadTasks(); 
    } catch (error) {
      // This will force the error to show up as a popup on your screen
      alert(`Error inserting task: ${error}`);
      console.error(error);
    }
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center p-8">
  <div class="max-w-md w-full bg-dfinSurface border border-dfinAccent rounded-xl p-6 shadow-2xl">
    
    <h1 class="text-2xl font-bold mb-2">DFIN Architecture</h1>
    <p class="text-sm text-dfinMuted mb-6">{dbStatus}</p>

    <button 
      onclick={addDummyTask}
      class="w-full py-3 mb-6 bg-dfinAccent hover:bg-opacity-80 rounded-lg text-dfinText font-semibold transition-all shadow-[0_0_15px_rgba(38,38,38,0.5)]">
      + Insert Dummy Task
    </button>

    <div class="space-y-3">
      {#if tasks.length === 0}
        <p class="text-center text-sm text-dfinMuted italic">No tasks in local storage.</p>
      {:else}
        {#each tasks as task}
          <div class="p-4 rounded-lg bg-dfinBase border border-dfinAccent/50 flex justify-between items-center">
            <span class="font-medium text-dfinText">{task.title}</span>
            <span class="text-xs text-dfinMuted">{task.durationMinutes}m</span>
          </div>
        {/each}
      {/if}
    </div>

  </div>
</main>