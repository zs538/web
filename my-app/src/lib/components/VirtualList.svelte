<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  
  // Props
  export let items: any[] = [];
  export let height = '100%';
  export let itemHeight = 300; // Estimated average height of each item
  export let overscan = 3; // Number of items to render outside of view
  export let scrollContainer: HTMLElement | null = null; // Container to listen for scroll events
  
  // Internal state
  let containerElement: HTMLElement;
  let visibleItems: any[] = [];
  let startIndex = 0;
  let endIndex = 0;
  let totalHeight = 0;
  let observer: IntersectionObserver;
  let resizeObserver: ResizeObserver;
  let scrollListener: () => void;
  
  // Calculate which items should be visible
  function updateVisibleItems() {
    if (!containerElement || !scrollContainer || items.length === 0) return;
    
    const containerRect = containerElement.getBoundingClientRect();
    const scrollRect = scrollContainer.getBoundingClientRect();
    
    // Calculate visible range based on scroll position
    const visibleTop = Math.max(0, scrollContainer.scrollTop - scrollRect.top);
    const visibleBottom = visibleTop + scrollContainer.clientHeight;
    
    // Calculate which items should be visible
    startIndex = Math.max(0, Math.floor(visibleTop / itemHeight) - overscan);
    endIndex = Math.min(items.length - 1, Math.ceil(visibleBottom / itemHeight) + overscan);
    
    // Update visible items
    visibleItems = items.slice(startIndex, endIndex + 1);
    
    // Update total height
    totalHeight = items.length * itemHeight;
  }
  
  // Update when items change
  $: {
    if (items) {
      updateVisibleItems();
    }
  }
  
  onMount(async () => {
    // Wait for the DOM to update
    await tick();
    
    // Use the window as scroll container if none provided
    if (!scrollContainer) {
      scrollContainer = window.document.documentElement;
    }
    
    // Set up scroll listener
    scrollListener = () => {
      updateVisibleItems();
    };
    
    scrollContainer.addEventListener('scroll', scrollListener, { passive: true });
    
    // Set up resize observer to update on container size changes
    resizeObserver = new ResizeObserver(() => {
      updateVisibleItems();
    });
    
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }
    
    // Initial update
    updateVisibleItems();
  });
  
  onDestroy(() => {
    // Clean up listeners
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', scrollListener);
    }
    
    if (resizeObserver && containerElement) {
      resizeObserver.unobserve(containerElement);
      resizeObserver.disconnect();
    }
  });
</script>

<div 
  class="virtual-list-container" 
  bind:this={containerElement}
  style="height: {height}; position: relative;"
>
  <div class="virtual-list-spacer" style="height: {totalHeight}px;">
    {#each visibleItems as item, i (items[startIndex + i].id)}
      <div 
        class="virtual-list-item" 
        style="position: absolute; top: {(startIndex + i) * itemHeight}px; width: 100%;"
      >
        <slot item={item} index={startIndex + i} />
      </div>
    {/each}
  </div>
</div>

<style>
  .virtual-list-container {
    overflow: hidden;
    width: 100%;
  }
  
  .virtual-list-spacer {
    position: relative;
    width: 100%;
  }
</style>
