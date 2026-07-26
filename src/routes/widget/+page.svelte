<!-- src/routes/widget/+page.svelte -->
<!-- src/routes/widget/+page.svelte (Script Block Only) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { getDb } from '$lib/db/database';
  import { calculateSessionTimeline } from '$lib/components/session/AnchorMath';

  let widgetWindow: any;
  let activeTask = $state<any>(null);
  let timeLeft = $state('00:00');
  let isOvertime = $state(false);
  
  let timerInterval: ReturnType<typeof setInterval>;
  let isLoading = false;

  onMount(async () => {
    widgetWindow = await getCurrentWindow();
    
    // Ignite the clock loop. It will now self-heal and fetch data 
    // the moment it detects a session start.
    timerInterval = setInterval(updateClock, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  async function loadActiveTask() {
    try {
      const db = await getDb();
      const tasks = await db.select<any[]>('SELECT * FROM tasks ORDER BY scheduledTime ASC');
      const t0 = parseInt(localStorage.getItem('dfin_t0') || '0');

      if (t0 > 0 && tasks.length > 0) {
        const mappedTasks = calculateSessionTimeline(tasks, t0);
        activeTask = mappedTasks.find((t: any) => t.status === 'in_session') || mappedTasks[0];
      }
    } catch (e) {
      console.error("Failed to load task:", e);
    }
  }

  async function updateClock() {
    // SELF-HEALING LOGIC: If no task is loaded, look for a new session broadcast
    if (!activeTask) {
      const t0 = parseInt(localStorage.getItem('dfin_t0') || '0');
      if (t0 > 0 && !isLoading) {
        isLoading = true;
        await loadActiveTask();
        isLoading = false;
      }
      return;
    }

    const now = Date.now();
    const endTimeMs = activeTask.actualStartMs + (activeTask.durationMinutes * 60 * 1000);
    const diffMs = endTimeMs - now;

    isOvertime = diffMs < 0;
    const absDiff = Math.abs(diffMs);

    const minutes = Math.floor(absDiff / 60000);
    const seconds = Math.floor((absDiff % 60000) / 1000);

    timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async function endSession() {
    if (widgetWindow) {
      // Clear the broadcast so it resets for the next session
      localStorage.removeItem('dfin_t0');
      activeTask = null;
      timeLeft = '00:00';
      isOvertime = false;
      await widgetWindow.hide();
    }
  }
</script>

<main class="h-screen w-screen bg-dfinBase border border-dfinAccent flex flex-col p-4 overflow-hidden rounded-xl">
  
  <div class="flex justify-between items-center mb-6 cursor-move" data-tauri-drag-region>
    <div class="flex items-center gap-2 pointer-events-none">
      <div class="w-2 h-2 rounded-full {isOvertime ? 'bg-red-500' : 'bg-green-500'} animate-pulse"></div>
      <h2 class="text-xs font-bold text-dfinText uppercase tracking-widest">Active Session</h2>
    </div>
    <button onclick={endSession} class="text-dfinMuted hover:text-red-400 transition-colors text-xl leading-none">
      &times;
    </button>
  </div>

  <div class="flex-grow flex flex-col items-center justify-center">
    <p class="text-xs text-dfinMuted text-center px-4 mb-2 truncate w-full">
      {activeTask ? activeTask.title : 'Loading Engine...'}
    </p>
    
    <!-- Dynamic Clock UI -->
    <p class="text-6xl font-mono {isOvertime ? 'text-red-500' : 'text-white'} transition-colors font-bold tracking-tight">
      {isOvertime ? '+' : ''}{timeLeft}
    </p>
    
    {#if isOvertime}
      <p class="text-[10px] text-red-500 uppercase tracking-widest mt-3 font-bold animate-pulse">Overtime Spillover</p>
    {/if}
  </div>

  <div class="mt-4">
    <input type="text" placeholder="Distraction dump..." disabled
      class="w-full bg-dfinSurface border border-dfinAccent rounded-lg p-3 text-xs text-dfinText focus:outline-none opacity-50 cursor-not-allowed" />
  </div>

</main>