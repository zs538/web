<script lang="ts">
  import { browser } from '$app/environment';
  import ImageGallery from '$lib/components/ImageGallery.svelte';
  import TopNavigation from '$lib/components/TopNavigation.svelte';
</script>

<TopNavigation />

<div class="container">
  <main class="main-content">
    <slot />
  </main>
</div>

<!-- Global Image Gallery - only render on client side -->
{#if browser}
  <ImageGallery />
{/if}

<style>
  @font-face {
    font-family: 'ManifoldExtended';
    src: url('/ManifoldExtendedCF-Medium.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'SuisseIntl';
    src: url('/Suisse_Intl_Medium.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'SuisseIntl';
    src: url('/Suisse_Intl_Light.ttf') format('truetype');
    font-weight: 300;
    font-style: normal;
  }

  :global(html) {
    scrollbar-gutter: stable; /* Modern browsers: Reserve space for scrollbar to prevent layout shifts */
  }

  :global(body) {
    font-family: 'ManifoldExtended', sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden; /* Prevent horizontal scrolling */
  }

  /* Global loading indicator removed */

  :global(.suisse-font) {
    font-family: 'SuisseIntl', sans-serif;
  }

  /* Global select element styling */
  :global(select) {
    background-color: #ffffff;
  }

  :global(select option) {
    background-color: #ffffff;
    color: #333;
  }

  .container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    position: relative;
    width: 100%;
  }
  .main-content {
    width: 564px; /* 500px content + 32px padding on each side */
    min-height: 100vh;
    padding: 32px 32px 2rem 32px; /* 32px top padding, 32px side padding */
    margin: 0 auto;
    box-sizing: border-box;
  }
  @media (max-width: 628px) {
    .main-content {
      width: calc(100vw - 64px); /* Full width minus 32px padding on each side */
      margin: 0;
    }
  }
  @media (max-width: 768px) {
    .main-content {
      width: 100vw;
      padding: 32px 16px 1rem 16px; /* 32px top padding, reduced padding on mobile */
    }
  }
</style>