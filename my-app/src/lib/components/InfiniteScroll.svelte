<!-- 
  InfiniteScroll.svelte - A component that loads more content when the user scrolls to the bottom
  Props:
  - threshold: How close to the bottom (in pixels) before loading more content
  - hasMore: Boolean indicating if there's more content to load
  - loading: Boolean indicating if content is currently being loaded
  - loadMore: Function to call when more content should be loaded
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let threshold = 200; // How close to the bottom before loading more
  export let hasMore = false; // Are there more items to load?
  export let loading = false; // Is content currently being loaded?
  export let loadMore: () => void; // Function to call to load more items
  
  let observer: IntersectionObserver;
  let observerElement: HTMLDivElement;
  
  onMount(() => {
    // Create an intersection observer to detect when the user scrolls near the bottom
    observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // If the element is visible and we're not already loading and there's more to load
        if (entry.isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`, // Bottom margin
        threshold: 0.1 // Trigger when at least 10% of the element is visible
      }
    );
    
    // Start observing the element
    if (observerElement) {
      observer.observe(observerElement);
    }
  });
  
  onDestroy(() => {
    // Clean up the observer when the component is destroyed
    if (observer && observerElement) {
      observer.unobserve(observerElement);
      observer.disconnect();
    }
  });
</script>

<!-- The element that will be observed -->
<div bind:this={observerElement} class="observer-element">
  {#if loading}
    <div class="loading-indicator">
      <div class="loading-spinner"></div>
    </div>
  {/if}
</div>

<style>
  .observer-element {
    width: 100%;
    height: 10px;
    margin-top: 20px;
  }
  
  .loading-indicator {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }
  
  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #000;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
