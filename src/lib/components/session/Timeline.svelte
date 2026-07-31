<!-- src/lib/components/session/Timeline.svelte -->
<script lang="ts">
  import TaskCard from './TaskCard.svelte';
  import { calculateSessionTimeline, calculateHeight } from './AnchorMath';
  import { getDb } from '$lib/db/database';
  import { getCurrentWindow, Window } from '@tauri-apps/api/window';
  import { updateLocalTaskInCRDT } from '$lib/sync/CRDTEngine';
  
  let { tasks, onTaskUpdate } = $props<{ tasks: any[], onTaskUpdate: () => Promise<void> }>();

  let inboxTasks = $derived(tasks.filter((t: any) => t.status === 'unassigned'));
  let plannedTasks = $derived(tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_session'));

  let sessionActive = $state(false);
  let t0Timestamp = $state<number | null>(null);
  let plannedHours = $state(4); 
  
  // --- CUSTOM POINTER ENGINE STATE ---
  let grabbedTaskId = $state<string | null>(null);
  let isGrabbing = $state(false);
  let hoveredZone = $state<string | null>(null);

  let inlineTaskTitle = $state('');
  let inlineTaskDuration = $state(15);

  let sessionTasks = $derived(
    sessionActive && t0Timestamp 
      ? calculateSessionTimeline(plannedTasks, t0Timestamp) 
      : plannedTasks
  );

  async function handleInlineQuickAdd(e: KeyboardEvent) {
    if (e.key === 'Enter' && inlineTaskTitle.trim()) {
      try {
        const db = await getDb();
        const newId = crypto.randomUUID();
        
        // Instantly add it to the 'pending' status so it drops right into the current session
        await db.execute(
          'INSERT INTO tasks (id, title, durationMinutes, status) VALUES ($1, $2, $3, $4)',
          [newId, inlineTaskTitle.trim(), inlineTaskDuration, 'pending']
        );
        
        // Sync to CRDT network
        updateLocalTaskInCRDT(newId, { title: inlineTaskTitle.trim(), durationMinutes: inlineTaskDuration, status: 'pending' });
        
        inlineTaskTitle = ''; // Reset input
        await onTaskUpdate(); // Refresh UI
      } catch (error) {
        console.error("[DB] Inline add failed:", error);
      }
    }
  }

  async function startSession() {
    t0Timestamp = Date.now();
    sessionActive = true;
    localStorage.setItem('dfin_t0', t0Timestamp.toString());
    try {
      if (sessionTasks.length > 0) {
        const db = await getDb();
        await db.execute('UPDATE tasks SET status = $1 WHERE id = $2', ['in_session', sessionTasks[0].id]);
      }
      const mainWindow = getCurrentWindow();
      await mainWindow.minimize();
      const widget = await Window.getByLabel('session-widget');
      if (widget) {
        await widget.show();
        await widget.setFocus();
      }
    } catch (error) {
      alert(`Window Error: ${error}`);
    }
  }

  // --- CUSTOM POINTER CONTROLLERS ---
  function handlePointerDown(e: PointerEvent, id: string) {
    if (e.button !== 0) return; // Only allow left-clicks
    e.preventDefault(); // Prevents accidental text selection while dragging
    
    console.log(`[POINTER] Grabbed Task ID: ${id}`);
    grabbedTaskId = id;
    isGrabbing = true;
  }

  async function handlePointerUp(e: PointerEvent) {
    if (!isGrabbing || !grabbedTaskId) return;

    console.log(`[POINTER] Released over Zone: ${hoveredZone}`);
    
    const id = grabbedTaskId;
    const targetStatus = hoveredZone;
    
    // Reset state immediately
    isGrabbing = false;
    grabbedTaskId = null;

    if (!targetStatus) {
      console.warn("[POINTER] Dropped outside valid zones. Canceling.");
      return;
    }

    try {
      const db = await getDb();
      // 1. Update local SQLite storage
      await db.execute('UPDATE tasks SET status = $1 WHERE id = $2', [targetStatus, id]);
      
      // 2. Fire the update into the CRDT Engine for peer-to-peer syncing
      updateLocalTaskInCRDT(id, { status: targetStatus });

      await onTaskUpdate(); 
      console.log(`[UI] Screen refresh complete.`);
    } catch (error) {
      console.error("[DB ERROR] SQLite Update Failed:", error);
    }
  }
</script>

<!-- Global release catcher: If you drop the mouse anywhere on the screen, it fires -->
<svelte:window onpointerup={handlePointerUp} />

<div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
  
  <!-- THE SESSION QUEUE (Tasks waiting to be done) -->
  <div class="flex flex-col h-full bg-[#0d0d0d] border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden">
    <div class="px-6 py-4 border-b border-white/5 bg-[#111111]">
      <h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
        Session Queue
        <span class="bg-white/10 text-gray-300 px-2 py-0.5 rounded-full text-[10px]">{tasks.filter((t: any) => t.status === 'pending').length}</span>
      </h2>
    </div>

    <!-- INLINE QUICK ADD -->
    <div class="px-6 py-3 border-b border-white/5 bg-[#0a0a0a] flex items-center gap-3">
      <div class="text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
      </div>
      <input 
        type="text" 
        bind:value={inlineTaskTitle}
        onkeydown={handleInlineQuickAdd}
        placeholder="Quick add to session... (Press Enter)"
        class="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
      />
      <input 
        type="number"
        bind:value={inlineTaskDuration}
        class="w-14 bg-[#141414] border border-white/10 rounded px-2 py-1 text-xs text-center text-gray-300 focus:outline-none focus:border-white/30"
        min="1"
      />
      <span class="text-[10px] text-gray-600 uppercase">min</span>
    </div>

    <!-- Drop Zone: Pending Tasks -->
    <div 
      class="flex-1 p-6 overflow-y-auto space-y-3"
      onpointerenter={() => hoveredZone = 'pending'}
      onpointerleave={() => { if(hoveredZone === 'pending') hoveredZone = null; }}
      role="list"
    >
      {#each tasks.filter((t: any) => t.status === 'pending') as task}
        <div 
          onpointerdown={(e) => handlePointerDown(e, task.id)}
          role="button" 
          tabindex="0"
        >
          <TaskCard {task} onRefresh={onTaskUpdate} />
        </div>
      {/each}
      {#if tasks.filter((t: any) => t.status === 'pending').length === 0}
         <p class="text-xs text-gray-600 italic text-center mt-10">Drag tasks here to build your session.</p>
      {/if}
    </div>
  </div>

  <!-- THE ACTIVE EXECUTION CANVAS (Tasks completed) -->
  <div class="flex flex-col h-full bg-[#0d0d0d] border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden relative">
    <div class="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-[#111111] to-[#1a1a1a]">
      <h2 class="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
        Execution Matrix
      </h2>
    </div>

    <!-- Drop Zone: Completed Tasks -->
    <div 
      class="flex-1 p-6 overflow-y-auto space-y-3"
      onpointerenter={() => hoveredZone = 'completed'}
      onpointerleave={() => { if(hoveredZone === 'completed') hoveredZone = null; }}
      role="list"
    >
      {#each tasks.filter((t: any) => t.status === 'completed') as task}
        <div 
          class="opacity-50 hover:opacity-100 transition-opacity" 
          onpointerdown={(e) => handlePointerDown(e, task.id)}
          role="button" 
          tabindex="0"
        >
          <TaskCard {task} onRefresh={onTaskUpdate} />
        </div>
      {/each}
    </div>
  </div>
</div>