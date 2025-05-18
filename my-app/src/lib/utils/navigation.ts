import { goto } from '$app/navigation';

/**
 * Navigate to a page with optimized loading and data invalidation
 * This uses client-side navigation for instant transitions while ensuring fresh data
 * @param path - The path to navigate to
 * @returns Promise that resolves when navigation is complete
 */
export function navigate(path: string): Promise<void> {
  // Determine if we're navigating between content pages that need fresh data
  const isContentPage = path === '/' || path === '/myposts' || path === '/create';

  return goto(path, {
    replaceState: false,
    noScroll: false,
    keepFocus: true, // Keep focus for better accessibility
    invalidateAll: isContentPage // Only invalidate all data for content pages
  });
}
