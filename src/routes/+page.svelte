<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb } from '$lib/db/database';
  import TaskInput from '$lib/components/schedule/TaskInput.svelte';
  import Calendar from '$lib/components/schedule/Calendar.svelte';
  import Timeline from '$lib/components/session/Timeline.svelte';
  import { startReminderEngine } from '$lib/sync/ReminderEngine';
  import { connectToLocalNode } from '$lib/sync/WebSocketClient';
  import { initializeCRDT, setSyncCallback, getTasksFromCRDT } from '$lib/sync/CRDTEngine';
  import TaskCard from '$lib/components/session/TaskCard.svelte';

  let tasks = $state<any[]>([]);
  let errorMsg = $state('');
  let activeView = $state('schedule');

  // Derive the global inbox to power the sidebar
  let inboxTasks = $derived(tasks.filter((t: any) => t.status === 'unassigned'));

  onMount(async () => {
    await loadTasks();
    await initializeCRDT();
    await startReminderEngine();

    setSyncCallback(() => {
      console.log("[UI] Network data received. Refreshing canvas...");
      tasks = getTasksFromCRDT();
    });
    
    connectToLocalNode();
  });

  async function loadTasks() {
    try {
      const db = await getDb();
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
      await loadTasks(); 
    } catch (e) {
      alert(`Database error: ${e}`);
    }
  }
</script>

<!-- Root Container: Deep Matte Black -->
<div class="min-h-screen bg-[#080808] text-white flex overflow-hidden font-sans selection:bg-white/20">
  
  <!-- UNIVERSAL SIDEBAR / INBOX -->
  <aside class="w-80 flex-shrink-0 bg-[#0d0d0d] border-r border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.9)] flex flex-col z-20">
    
    <!-- Branding Header -->
    <div class="p-6 border-b border-white/5">
      <h1 class="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
        DFIN.
      </h1>
      {#if errorMsg} <p class="text-red-500 text-xs mt-2">{errorMsg}</p> {/if}
    </div>

    <!-- Global Brain Dump -->
    <div class="p-5 border-b border-white/5 bg-[#111111] shadow-[inset_0_-2px_15px_rgba(0,0,0,0.5)]">
      <h2 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Brain Dump</h2>
      <TaskInput onSave={handleSaveTask} />
    </div>

    <!-- Inbox List -->
    <div class="flex-1 overflow-y-auto p-5 space-y-3">
      <div class="flex justify-between items-center mb-4 px-1">
        <h2 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Inbox</h2>
        <span class="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{inboxTasks.length}</span>
      </div>
      
      {#if inboxTasks.length === 0}
        <div class="p-6 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
          <p class="text-xs text-gray-500 italic">No pending tasks.</p>
        </div>
      {:else}
        {#each inboxTasks as task}
          <!-- Replaced with our new premium TaskCard component -->
          <div class="mb-3">
            <TaskCard {task} onRefresh={loadTasks} />
          </div>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- MAIN CANVAS -->
  <main class="flex-1 flex flex-col h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#141414] via-[#080808] to-[#050505]">
    
    <!-- Workspace Navigation -->
    <header class="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl z-10">
      <div class="flex space-x-2 bg-black/50 p-1 rounded-lg border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
        <button 
          onclick={() => activeView = 'schedule'}
          class="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 {activeView === 'schedule' ? 'bg-[#1a1a1a] text-white shadow-[0_0_15px_rgba(255,255,255,0.04)] border border-white/10' : 'text-gray-600 hover:text-gray-300 border border-transparent'}">
          Long-Term Blueprint
        </button>
        <button 
          onclick={() => activeView = 'session'}
          class="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-300 {activeView === 'session' ? 'bg-[#1a1a1a] text-white shadow-[0_0_15px_rgba(255,255,255,0.04)] border border-white/10' : 'text-gray-600 hover:text-gray-300 border border-transparent'}">
          Session Focus
        </button>
      </div>
    </header>

    <!-- Dynamic Content Area -->
    <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">
      {#if activeView === 'schedule'}
        <div class="max-w-5xl mx-auto">
          <Calendar {tasks} />
        </div>
      {:else}
        <div class="max-w-4xl mx-auto">
          <Timeline {tasks} onTaskUpdate={loadTasks} />
        </div>
      {/if}
    </div>
  </main>
</div>