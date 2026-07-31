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

  let sessionTasks = $derived(
    sessionActive && t0Timestamp 
      ? calculateSessionTimeline(plannedTasks, t0Timestamp) 
      : plannedTasks
  );

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
      
      // 2. NEW: Fire the update into the CRDT Engine for peer-to-peer syncing
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

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-150 {isGrabbing ? 'select-none cursor-grabbing' : ''}">
  
  <!-- LEFT COLUMN: INBOX -->
  <div class="md:col-span-1 bg-dfinSurface p-5 rounded-xl border border-dfinAccent shadow-lg flex flex-col transition-colors {hoveredZone === 'unassigned' && isGrabbing ? 'border-white bg-dfinSurface/80' : ''}"
       onpointerenter={() => hoveredZone = 'unassigned'}
       onpointerleave={() => { if (hoveredZone === 'unassigned') hoveredZone = null; }}>
       
    <h2 class="text-sm font-bold text-dfinText uppercase tracking-widest mb-4 border-b border-dfinAccent pb-2 {isGrabbing ? 'pointer-events-none' : ''}">
      Inbox
    </h2>
    
    <div class="grow space-y-3 overflow-y-auto min-h-[200px] {isGrabbing ? 'pointer-events-none' : ''}">
      {#if inboxTasks.length === 0}
        <div class="h-full w-full flex items-center justify-center border-2 border-dashed border-dfinAccent/30 rounded-lg">
          <p class="text-xs text-dfinMuted italic">Drop to unschedule</p>
        </div>
      {:else}
        {#each inboxTasks as task}
          <!-- The Grab Target -->
          <div class="p-3 bg-dfinBase border border-dfinAccent/50 rounded-lg hover:border-white transition-colors {isGrabbing ? 'cursor-grabbing opacity-50' : 'cursor-grab'}"
               role="button"
               tabindex="0"
               onpointerdown={(e) => handlePointerDown(e, task.id)}>
            <h3 class="font-medium text-sm text-dfinText pointer-events-none">{task.title}</h3>
            <p class="text-xs text-dfinMuted pointer-events-none">{task.durationMinutes}m</p>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- RIGHT COLUMN: CANVAS -->
  <div class="md:col-span-2 bg-dfinBase p-6 rounded-xl border border-dfinAccent shadow-2xl relative flex flex-col transition-colors {hoveredZone === 'pending' && isGrabbing ? 'border-white bg-dfinBase/80' : ''}"
       onpointerenter={() => hoveredZone = 'pending'}
       onpointerleave={() => { if (hoveredZone === 'pending') hoveredZone = null; }}>
    
    <div class="flex justify-between items-center mb-6 border-b border-dfinAccent pb-4 {isGrabbing ? 'pointer-events-none' : ''}">
      <div>
        <h2 class="text-xl font-bold text-dfinText flex items-center gap-2">
          <div class="w-3 h-3 rounded-full {sessionActive ? 'bg-green-500' : 'bg-white animate-pulse'}"></div>
          Session Canvas
        </h2>
        <div class="flex items-center gap-2 mt-2">
          <label class="text-xs text-dfinMuted" for="hours">Planned Duration:</label>
          <input id="hours" type="number" min="1" max="12" bind:value={plannedHours} disabled={sessionActive}
            class="bg-dfinSurface border border-dfinAccent rounded text-xs text-white p-1 w-12 text-center" />
          <span class="text-xs text-dfinMuted">Hours</span>
        </div>
      </div>
      
      {#if !sessionActive}
        <button onclick={startSession} class="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)] pointer-events-auto">
          Start Session
        </button>
      {/if}
    </div>

    <div class="relative grow overflow-y-auto pl-8 border-l border-dfinAccent/30 {isGrabbing ? 'pointer-events-none' : ''}"
         style="height: {calculateHeight(plannedHours * 60)}px; min-height: 400px;">
      
      <div class="absolute inset-0 pointer-events-none" 
           style="background-size: 100% {calculateHeight(60)}px; background-image: linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);">
      </div>
      <div class="absolute -left-1.25 top-0 w-2 h-2 rounded-full bg-white z-20 pointer-events-none"></div>

      {#if sessionTasks.length === 0}
        <div class="h-full flex items-center justify-center">
          <p class="text-sm text-dfinMuted italic">Drag tasks here to build your session.</p>
        </div>
      {:else}
        <div class="space-y-4 relative z-10 pt-2">
          {#each sessionTasks as task}
            <!-- The Grab Target -->
            <div class="relative {!sessionActive ? (isGrabbing ? 'cursor-grabbing opacity-50' : 'cursor-grab') : ''}"
                 role="button"
                 tabindex="0"
                 onpointerdown={(e) => !sessionActive && handlePointerDown(e, task.id)}>
                 
              <div class="absolute -left-9.25 top-4 w-4 h-px bg-dfinAccent pointer-events-none"></div>
              <div class="pointer-events-none">
                <TaskCard {task} />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>