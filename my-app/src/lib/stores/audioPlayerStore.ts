import { writable } from 'svelte/store';

// Store to track which audio player is currently playing
// The value is the src URL of the audio that is currently playing, or null if none
export const activeAudioPlayer = writable<string | null>(null);
