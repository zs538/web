import { writable } from 'svelte/store';

// Store to track which post has an active delete confirmation
// The value is the ID of the post with an active confirmation, or null if none
export const activeDeleteConfirm = writable<string | null>(null);
