<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { browser } from '$app/environment';
  import { galleryStore, galleryActions } from '$lib/stores/galleryStore';

  $: gallery = $galleryStore;
  $: currentImage = gallery.images[gallery.currentIndex];
  $: hasMultipleImages = gallery.images.length > 1;

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
      <!-- Close button -->
      <button class="close-btn" on:click={() => galleryActions.closeGallery()}>×</button>

      <!-- Navigation -->
      {#if hasMultipleImages}
        <button class="nav-btn nav-prev" on:click={() => galleryActions.previousImage()}>‹</button>
        <button class="nav-btn nav-next" on:click={() => galleryActions.nextImage()}>›</button>
      {/if}

      <!-- Image -->
      <div class="image-wrapper">
        <img src={currentImage.url} alt={currentImage.caption || 'Gallery image'} class="main-image" />
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
    cursor: pointer;
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

  .close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1001;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1001;
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .nav-prev {
    left: 20px;
  }

  .nav-next {
    right: 20px;
  }

  .image-wrapper {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-image {
    max-width: 60vw;
    max-height: 60vh;
    object-fit: contain;
    display: block;
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
