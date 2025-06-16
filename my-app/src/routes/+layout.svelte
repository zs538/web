<script lang="ts">
  import { browser } from '$app/environment';
  import ImageGallery from '$lib/components/ImageGallery.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { goto } from '$app/navigation';

  // Get user data from page store
  $: user = $page.data.user;
  $: isLoggedIn = !!user;
  $: isAdmin = user?.role === 'admin';

  // Logout confirmation popup state
  let showLogoutConfirm = false;
  let isLoggingOut = false;

  function openLogoutConfirm() {
    showLogoutConfirm = true;
  }

  function closeLogoutConfirm() {
    showLogoutConfirm = false;
  }

  // Handle click outside to close popup
  function handleClickOutside(event: MouseEvent) {
    if (event.target instanceof Element) {
      if (showLogoutConfirm && event.target.classList.contains('confirm-dialog-backdrop')) {
        closeLogoutConfirm();
      }
    }
  }

  // Handle logout confirmation
  async function confirmLogout() {
    isLoggingOut = true;
    try {
      // Navigate to logout endpoint
      await goto('/logout');
    } catch (error) {
      console.error('Logout error:', error);
      isLoggingOut = false;
    }
  }

  // Initialize click handler
  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

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
    <button class="nav-link logout-btn" on:click={openLogoutConfirm}>Logout</button>
  {:else}
    <a href="/login" class="nav-link">Login</a>
  {/if}

  <div class="nav-spacer"></div>

  <a href="/about" class="nav-link">About</a>

  {#if isLoggedIn}
    <a href="/settings" class="nav-link">Settings</a>
  {/if}
</nav>

<div class="container">
  <main class="main-content">
    <slot />
  </main>
</div>

<!-- Global Image Gallery - only render on client side -->
{#if browser}
  <ImageGallery />
{/if}

<!-- Logout Confirmation Popup -->
{#if showLogoutConfirm}
  <div class="confirm-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
    <div class="confirm-dialog" transition:slide={{ duration: 200, easing: quintOut }}>
      <h3>Confirm Logout</h3>
      <p>Are you sure you want to log out?</p>

      <div class="confirm-actions">
        <button type="button" class="cancel-btn" on:click={closeLogoutConfirm}>Cancel</button>
        <button type="button" class="confirm-btn" on:click={confirmLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  </div>
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



  .left-nav {
    position: fixed;
    left: 0; /* Move to very left of screen */
    top: 0;
    width: 180px;
    height: 100vh;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    padding: 20px;
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

  .logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
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


  .main-content {
    width: 500px;
    min-height: 100vh;
    padding: 20px 0 0 0;
    margin: 0 auto;
    box-sizing: border-box;
  }
  @media (max-width: 768px) {
    .left-nav {
      /* Keep navigation on left side even on mobile */
      left: 0;
      width: 160px; /* Slightly smaller on mobile */
    }

    .main-content {
      width: calc(100vw - 180px); /* Account for nav width */
      margin: 0;
      padding: 20px 16px 0 16px;
    }
  }

  @media (max-width: 564px) {
    .left-nav {
      width: 140px; /* Even smaller on very small screens */
    }

    .main-content {
      width: calc(100vw - 160px); /* Account for smaller nav width */
      padding: 20px 16px 0 8px; /* Less left padding to avoid nav overlap */
    }
  }

  /* Logout Confirmation Popup styles - matching settings page */
  .confirm-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    will-change: opacity, backdrop-filter;
    transition: background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                -webkit-backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .confirm-dialog {
    background: white;
    padding: 20px;
    border-radius: 2px;
    max-width: 400px;
    width: 100%;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .confirm-dialog h3 {
    font-family: 'ManifoldExtended', sans-serif;
    margin-top: 0;
    font-size: 1.2rem;
    font-weight: normal;
  }

  .confirm-dialog p {
    margin: 15px 0;
    font-size: 1rem;
    color: #333;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .cancel-btn {
    padding: 0 0.5rem;
    background: transparent;
    border: 1px solid #333;
    border-radius: 0;
    color: #333;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    width: 130px;
    height: 40px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .cancel-btn:hover {
    background: rgba(51, 51, 51, 0.1);
  }

  .confirm-btn {
    padding: 0 0.5rem;
    background: transparent;
    color: #e74c3c;
    border: 1px solid #e74c3c;
    border-radius: 0;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    width: 130px;
    height: 40px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .confirm-btn:hover:not(:disabled) {
    background: rgba(231, 76, 60, 0.1);
  }

  .confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>