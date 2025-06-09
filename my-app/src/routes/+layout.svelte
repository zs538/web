<script lang="ts">
  import { browser } from '$app/environment';
  import ImageGallery from '$lib/components/ImageGallery.svelte';
  import InfoBar from '$lib/components/InfoBar.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let lastScrollY = 0;
  let stickyTop = 0;

  // Get user data from page store
  $: user = $page.data.user;
  $: isLoggedIn = !!user;
  $: isAdmin = user?.role === 'admin';

  onMount(() => {
    if (!browser) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 48) {
        // Scrolling down and past the bar height - move bar up (include border)
        stickyTop = -49;
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - bring bar back
        stickyTop = 0;
      } else if (currentScrollY <= 48) {
        // At the top - normal position
        stickyTop = 0;
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script>

<!-- Top Bar -->
<div class="top-bar" style="top: {stickyTop}px">
</div>

<!-- Left Navigation Bar -->
<nav class="left-nav">
  <a href="/" class="nav-link">aicum</a>

  {#if isLoggedIn}
    <a href="/myposts" class="nav-link">My Posts</a>
    <a href="/create" class="nav-link">Create</a>
  {/if}

  {#if isAdmin}
    <a href="/log" class="nav-link">Log</a>
    <a href="/user-manager" class="nav-link">User Manager</a>
  {/if}

  {#if isLoggedIn}
    <a href="/logout" class="nav-link">Logout</a>
  {:else}
    <a href="/login" class="nav-link">Login</a>
  {/if}

  <div class="nav-spacer"></div>

  <a href="/about" class="nav-link">About</a>

  {#if isLoggedIn}
    <a href="/settings" class="nav-link">Settings</a>
  {/if}
</nav>

<!-- Right Info Bar -->
<InfoBar />

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



  .top-bar {
    position: sticky;
    left: calc(50% - 250px); /* Same positioning as main content */
    width: 500px;
    height: 48px;
    background-color: #fff;
    border-bottom: 1px solid #ddd;
    z-index: 100;
    transition: top 0.3s ease;
  }

  .left-nav {
    position: fixed;
    left: calc(50% - 250px - 180px); /* Pull back a bit from main content */
    top: 0;
    width: 180px;
    height: 100vh;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px; /* No top padding, 20px on other sides */
    margin-top: 48px; /* Top margin matches top bar height (48px) */
    border-top: 1px solid #ddd; /* Top line - total spacing = 48px + 1px = 49px */
    box-sizing: border-box;
    z-index: 50;
  }

  .nav-link {
    color: #000;
    text-decoration: none;
    font-size: 14px;
    font-family: 'ManifoldExtended', sans-serif;
    padding: 6px 0;
    transition: opacity 0.2s ease;
  }

  .nav-link:hover {
    opacity: 0.7;
  }

  .nav-spacer {
    height: 16px;
  }

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
    width: 100%;
  }

  /* Add left vertical line for main content */
  .container::before {
    content: '';
    position: fixed;
    top: 0;
    bottom: 0;
    left: calc(50% - 250px); /* Left edge of main content */
    width: 1px;
    background-color: #ddd;
    z-index: 101;
  }

  /* Add right vertical line for main content */
  .container::after {
    content: '';
    position: fixed;
    top: 0;
    bottom: 0;
    right: calc(50% - 250px); /* Right edge of main content */
    width: 1px;
    background-color: #ddd;
    z-index: 101;
  }
  .main-content {
    width: 500px; /* 500px content width, no side padding */
    min-height: 100vh;
    padding: 0; /* Remove all padding since we have the top bar */
    margin: 0 auto;
    box-sizing: border-box;
  }
  @media (max-width: 564px) {
    .top-bar {
      width: calc(100vw - 32px);
      left: 16px;
      transform: none;
    }



    .main-content {
      width: calc(100vw - 32px); /* Full width minus 16px padding on each side */
      margin: 0;
      padding: 0 16px; /* Remove top padding, keep only side padding */
    }
  }
  @media (max-width: 768px) {
    .top-bar {
      width: calc(100vw - 32px);
      left: 16px;
      transform: none;
    }



    .main-content {
      width: 100vw;
      padding: 0 16px; /* Remove top padding, keep only side padding */
    }
  }
</style>