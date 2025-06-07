<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { galleryStore, galleryActions } from '$lib/stores/galleryStore';

  $: gallery = $galleryStore;
  $: currentImage = gallery.images[gallery.currentIndex];
  $: hasMultipleImages = gallery.images.length > 1;

  // Zoom functionality
  let isZoomed = false;
  let imageElement: HTMLImageElement;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let imagePosition = { x: 0, y: 0 };
  let hasDragged = false;

  const ZOOM_SCALE = 2;
  const DRAG_THRESHOLD = 2;

  // Reset zoom state when image changes
  $: if (currentImage) {
    resetZoom();
  }

  function resetZoom() {
    isZoomed = false;
    imagePosition = { x: 0, y: 0 };
    hasDragged = false;
  }

  function toggleZoom() {
    if (hasDragged) {
      hasDragged = false;
      return;
    }

    isZoomed = !isZoomed;
    if (!isZoomed) {
      imagePosition = { x: 0, y: 0 };
    }
  }

  function startDrag(event: MouseEvent) {
    if (!isZoomed) return;
    event.preventDefault();

    isDragging = true;
    hasDragged = false;
    dragStart = {
      x: event.clientX - (imagePosition.x * ZOOM_SCALE),
      y: event.clientY - (imagePosition.y * ZOOM_SCALE)
    };
  }

  function updateDrag(event: MouseEvent) {
    if (!isDragging || !isZoomed || !imageElement) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    // Mark as dragged if movement exceeds threshold
    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      hasDragged = true;
    }

    // Calculate new position with zoom scale compensation
    let newX = deltaX / ZOOM_SCALE;
    let newY = deltaY / ZOOM_SCALE;

    // Apply boundaries to prevent dragging too far off screen
    if (imageElement) {
      const rect = imageElement.getBoundingClientRect();
      const maxX = rect.width / (ZOOM_SCALE * 2); // Half width
      const maxY = rect.height / (ZOOM_SCALE * 2); // Half height

      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));
    }

    imagePosition = { x: newX, y: newY };
  }

  function endDrag() {
    isDragging = false;
  }

  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (!gallery.isOpen) return;

    switch (event.key) {
      case 'Escape':
        galleryActions.closeGallery();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        galleryActions.previousImage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        galleryActions.nextImage();
        break;
    }
  }

  // Prevent body scroll when gallery is open
  $: if (browser) {
    if (gallery.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  onMount(() => {
    if (browser) {
      document.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('keydown', handleKeydown);
      // Restore scrolling when component is destroyed
      document.body.style.overflow = '';
    }
  });
</script>

{#if gallery.isOpen && currentImage}
  <div class="gallery-overlay">
    <!-- Background area that closes gallery when clicked -->
    <div class="gallery-background" on:click={() => galleryActions.closeGallery()}></div>

    <!-- Gallery content -->
    <div class="gallery-wrapper">
      <!-- Navigation -->
      {#if hasMultipleImages}
        <button class="nav-btn nav-prev" on:click={() => galleryActions.previousImage()}>
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 10H2M8 4L2 10L8 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="nav-btn nav-next" on:click={() => galleryActions.nextImage()}>
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 10H30M24 4L30 10L24 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}

      <!-- Image -->
      <div class="image-wrapper">
        <img
          bind:this={imageElement}
          src={currentImage.url}
          alt={currentImage.caption || 'Gallery image'}
          class="main-image"
          class:zoomed={isZoomed}
          class:dragging={isDragging}
          style="transform: scale({isZoomed ? ZOOM_SCALE : 1}) translate({imagePosition.x}px, {imagePosition.y}px); cursor: {isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'};"
          draggable="false"
          on:click={toggleZoom}
          on:mousedown={startDrag}
          on:mousemove={updateDrag}
          on:mouseup={endDrag}
          on:mouseleave={endDrag}
          on:dragstart|preventDefault
        />
      </div>

      <!-- Counter -->
      {#if hasMultipleImages}
        <div class="counter">{gallery.currentIndex + 1} / {gallery.images.length}</div>
      {/if}

      <!-- Caption -->
      {#if currentImage.caption}
        <div class="caption">{currentImage.caption}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .gallery-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
  }

  .gallery-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    cursor: default;
  }

  .gallery-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 60vh;
    width: 120px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn:hover {
    opacity: 0.7;
  }

  .nav-prev {
    left: 0;
  }

  .nav-next {
    right: 0;
  }

  .image-wrapper {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-image {
    max-width: 60vw;
    max-height: 80vh; /* Increased from 60vh to 80vh for better media viewing */
    object-fit: contain;
    display: block;
    transition: transform 0.3s ease;
    transform-origin: center;

    /* Prevent browser default drag/select behavior */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    pointer-events: auto;
  }

  /* Disable transition during active dragging for smooth movement */
  .main-image.dragging {
    transition: none;
  }

  .counter {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    pointer-events: auto;
  }

  .caption {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    max-width: 80%;
    text-align: center;
    pointer-events: auto;
  }
</style>
