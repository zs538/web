import { writable } from 'svelte/store';

// Store to track which log has an active details popup
// The value is the ID of the log with an active details popup, or null if none
export const activeLogDetails = writable<string | null>(null);
