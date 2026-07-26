<script lang="ts">
  // Accept the list of tasks as a prop
  let { tasks } = $props<{ tasks: any[] }>();
</script>

<div class="bg-dfinSurface p-5 rounded-xl border border-dfinAccent shadow-lg min-h-[400px]">
  <h2 class="text-lg font-semibold text-dfinText mb-4">Today's Blueprint</h2>

  {#if tasks.length === 0}
    <div class="flex h-40 items-center justify-center border-2 border-dashed border-dfinAccent rounded-lg">
      <p class="text-sm text-dfinMuted">No tasks scheduled yet.</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each tasks as task}
        <div class="p-4 rounded-lg bg-dfinBase border border-dfinAccent/50 flex justify-between items-center hover:border-dfinMuted transition-colors">
          <div>
            <h3 class="font-medium text-dfinText">{task.title}</h3>
            <p class="text-xs text-dfinMuted mt-1">{task.scheduledTime} &bull; {task.durationMinutes}m</p>
          </div>
          <div class="px-3 py-1 rounded-full bg-dfinAccent text-xs font-medium text-dfinText">
            {task.status}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>