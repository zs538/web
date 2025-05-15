import { goto } from '$app/navigation';

/**
 * Navigate to a page with optimized loading
 * This uses client-side navigation for instant transitions
 */
export function navigate(path: string): Promise<void> {
  // Top bar loading animation removed

  return goto(path, {
    replaceState: false,
    noScroll: false,
    keepFocus: false,
    invalidateAll: false // Don't invalidate all data, let components handle loading
  });
}
