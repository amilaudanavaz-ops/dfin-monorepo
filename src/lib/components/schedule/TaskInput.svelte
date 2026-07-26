<script lang="ts">
  // Accept a callback prop to handle the save action
  let { onSave } = $props<{ onSave: (task: any) => Promise<void> }>();

  // Svelte 5 Reactive State
  let title = $state('');
  let durationMinutes = $state(60);
  let scheduledDate = $state(new Date().toISOString().split('T')[0]);
  let scheduledTime = $state('09:00');
  let isSubmitting = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;

    isSubmitting = true;
    
    await onSave({
      id: crypto.randomUUID(),
      title,
      durationMinutes,
      scheduledDate,
      scheduledTime,
      status: 'pending'
    });

    // Reset form
    title = '';
    isSubmitting = false;
  }
</script>

<form onsubmit={handleSubmit} class="bg-dfinSurface p-5 rounded-xl border border-dfinAccent shadow-lg">
  <h2 class="text-lg font-semibold text-dfinText mb-4">Schedule Task</h2>
  
  <div class="space-y-4">
    <div>
      <label class="block text-xs text-dfinMuted mb-1" for="title">Task Title</label>
      <input id="title" type="text" bind:value={title} required
        class="w-full bg-dfinBase border border-dfinAccent rounded-lg p-2 text-dfinText focus:outline-none focus:border-white transition-colors" 
        placeholder="e.g., Review Financials" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-xs text-dfinMuted mb-1" for="date">Date</label>
        <input id="date" type="date" bind:value={scheduledDate} required
          class="w-full bg-dfinBase border border-dfinAccent rounded-lg p-2 text-dfinText focus:outline-none focus:border-white [color-scheme:dark]" />
      </div>
      <div>
        <label class="block text-xs text-dfinMuted mb-1" for="time">Start Time</label>
        <input id="time" type="time" bind:value={scheduledTime} required
          class="w-full bg-dfinBase border border-dfinAccent rounded-lg p-2 text-dfinText focus:outline-none focus:border-white [color-scheme:dark]" />
      </div>
    </div>

    <div>
      <label class="block text-xs text-dfinMuted mb-1" for="duration">Duration (Minutes)</label>
      <input id="duration" type="number" min="5" step="5" bind:value={durationMinutes} required
        class="w-full bg-dfinBase border border-dfinAccent rounded-lg p-2 text-dfinText focus:outline-none focus:border-white" />
    </div>

    <button type="submit" disabled={isSubmitting}
      class="w-full py-3 mt-2 bg-dfinAccent hover:bg-opacity-80 rounded-lg text-dfinText font-semibold transition-all shadow-[0_0_10px_rgba(38,38,38,0.5)] disabled:opacity-50">
      {isSubmitting ? 'Saving...' : 'Add to Schedule'}
    </button>
  </div>
</form>