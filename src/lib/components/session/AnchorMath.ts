// src/lib/components/session/AnchorMath.ts

// 1 minute of time = 2 pixels on the screen
export const PX_PER_MINUTE = 2;

export function calculateHeight(durationMinutes: number): number {
  return durationMinutes * PX_PER_MINUTE;
}

// Helper to format a Unix timestamp or Date into HH:MM
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}