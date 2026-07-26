<!-- src/lib/components/session/TaskCard.svelte -->
<script lang="ts">
  import { calculateHeight } from './AnchorMath';
  
  let { task } = $props<{ task: any }>();
  
  // Calculate dynamic height based on duration
  let cardHeight = $derived(calculateHeight(task.durationMinutes));
</script>

<div 
  class="w-full bg-dfinAccent bg-shining-dark border-l-4 border-l-white rounded-r-lg p-4 shadow-lg flex flex-col justify-between transition-all hover:brightness-110"
  style="height: {cardHeight}px; min-height: 60px;"
>
  <div class="flex justify-between items-start">
    <h3 class="font-bold text-dfinText truncate">{task.title}</h3>
    <span class="text-xs font-mono text-dfinMuted">{task.durationMinutes}m</span>
  </div>
  
  <div class="text-xs text-dfinMuted flex justify-between items-end">
    <span>Original: {task.scheduledTime}</span>
    <!-- The actual start time will be injected here by the T0 engine later -->
    <span class="text-white font-medium">Pending $T_0$</span>
  </div>
</div>