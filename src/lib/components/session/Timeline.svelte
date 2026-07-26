<!-- src/lib/components/session/Timeline.svelte -->
<script lang="ts">
  import TaskCard from './TaskCard.svelte';
  
  let { tasks } = $props<{ tasks: any[] }>();
</script>

<div class="bg-dfinBase p-6 rounded-xl border border-dfinAccent shadow-2xl relative overflow-hidden min-h-[500px]">
  
  <!-- T0 Anchor Header -->
  <div class="flex justify-between items-center mb-8 border-b border-dfinAccent pb-4">
    <div>
      <h2 class="text-xl font-bold text-dfinText flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-white animate-pulse"></div>
        Session Engine
      </h2>
      <p class="text-xs text-dfinMuted mt-1">Waiting for $T_0$ Initialization...</p>
    </div>
    <button class="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
      Start Session
    </button>
  </div>

  <!-- The Timeline Track -->
  <div class="relative pl-8 border-l border-dfinAccent/50 space-y-4">
    
    <!-- Visual Indicator for T0 (Current Time Line) -->
    <div class="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-white"></div>
    <div class="absolute left-0 top-[3px] w-full h-[1px] bg-white/20 z-0"></div>

    {#if tasks.length === 0}
      <p class="text-sm text-dfinMuted italic pt-4">No tasks queued for this session.</p>
    {:else}
      {#each tasks as task}
        <div class="relative z-10">
          <!-- Timeline tick mark -->
          <div class="absolute -left-[37px] top-4 w-4 h-[1px] bg-dfinAccent"></div>
          <TaskCard {task} />
        </div>
      {/each}
    {/if}
  </div>
</div>