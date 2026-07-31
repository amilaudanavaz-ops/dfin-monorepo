<!-- src/lib/components/session/TaskCard.svelte -->
<script lang="ts">
  import { getDb } from '$lib/db/database';
  import { updateLocalTaskInCRDT } from '$lib/sync/CRDTEngine';

  let { task, onRefresh } = $props<{ task: any, onRefresh: () => Promise<void> }>();

  let isEditing = $state(false);
  let editTitle = $state(task.title);
  let editDuration = $state(task.durationMinutes);

  async function handleDelete() {
    // A quick safety check before permanent deletion
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const db = await getDb();
      await db.execute('DELETE FROM tasks WHERE id = $1', [task.id]);
      
      // Notify the parent UI to refresh
      await onRefresh();
    } catch (error) {
      console.error("[DB] Failed to delete task:", error);
    }
  }

  async function handleSave() {
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE tasks SET title = $1, durationMinutes = $2 WHERE id = $3',
        [editTitle, editDuration, task.id]
      );
      
      // Update the CRDT engine for network sync
      updateLocalTaskInCRDT(task.id, { title: editTitle, durationMinutes: editDuration });
      
      isEditing = false;
      await onRefresh();
    } catch (error) {
      console.error("[DB] Failed to update task:", error);
    }
  }
</script>

<div class="group relative p-4 bg-[#141414] border border-white/5 rounded-xl hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.03)] transition-all cursor-pointer">
  
  {#if isEditing}
    <!-- INLINE EDIT MODE -->
    <div class="space-y-3">
      <input 
        type="text" 
        bind:value={editTitle} 
        class="w-full bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-white/30"
        placeholder="Task Title"
      />
      <div class="flex items-center gap-2">
        <input 
          type="number" 
          bind:value={editDuration} 
          class="w-20 bg-[#0a0a0a] border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-white/30"
          min="1"
        />
        <span class="text-xs text-gray-500">min</span>
        <div class="flex-1"></div>
        <button onclick={() => isEditing = false} class="text-xs text-gray-500 hover:text-white px-2">Cancel</button>
        <button onclick={handleSave} class="text-xs bg-white text-black font-bold px-3 py-1.5 rounded-md hover:bg-gray-200">Save</button>
      </div>
    </div>
  {:else}
    <!-- DEFAULT DISPLAY MODE -->
    <div class="pr-12 pointer-events-none">
      <h3 class="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{task.title}</h3>
      <p class="text-xs text-gray-500 mt-1.5">{task.durationMinutes}m</p>
    </div>

    <!-- ACTION BUTTONS (Hidden until hover) -->
    <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
      <button 
        onclick={(e) => { e.stopPropagation(); isEditing = true; }} 
        class="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        title="Edit Task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
      <button 
        onclick={(e) => { e.stopPropagation(); handleDelete(); }} 
        class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
        title="Delete Task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  {/if}
</div>