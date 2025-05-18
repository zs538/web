import { writable } from 'svelte/store';

// Store to track which dropdown menu is currently active
// The value is the ID of the item with an active dropdown, or null if none
export const activeDropdown = writable<string | null>(null);
