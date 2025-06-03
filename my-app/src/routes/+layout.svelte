<script lang="ts">
  import { page } from '$app/stores';
  import { navigate } from '$lib/utils/navigation';
  import { browser } from '$app/environment';
  import ImageGallery from '$lib/components/ImageGallery.svelte';
  import InteractiveCanvas from '$lib/components/InteractiveCanvas.svelte';

  // Access the user data from page.data
  $: user = $page.data.user;

  let showLogoutConfirm = false;
  function toggleLogoutConfirm() { showLogoutConfirm = !showLogoutConfirm; }

  // Handle navigation with client-side routing
  function handleNavigation(e: MouseEvent, path: string) {
    e.preventDefault();
    navigate(path);
  }
</script>

<div class="container">
  <nav class="nav">
    <div class="logo-container">
      <InteractiveCanvas
        imageUrl="/hearthands.jpg"
        width={150}
        height={150}
        intensity={0.8}
        rippleSpeed={1.0}
      />
    </div>
    <div class="nav-separator"></div>
    <ul>
      <li><a href="/" on:click={e => handleNavigation(e, '/')}>aicum</a></li>

      <!-- Check if user exists -->
      {#if user}
        <li><a href="/myposts" on:click={e => handleNavigation(e, '/myposts')}>my posts</a></li>
        <li><a href="/create" on:click={e => handleNavigation(e, '/create')}>create post</a></li>

        <!-- Check if user is admin -->
        {#if user.role === 'admin'}
          <li><a href="/admin/log" on:click={e => handleNavigation(e, '/admin/log')}>audit log</a></li>
          <li><a href="/user-manager" on:click={e => handleNavigation(e, '/user-manager')}>user manager</a></li>
        {/if}

        <li>
          {#if !showLogoutConfirm}
            <a href="/logout" on:click|preventDefault={toggleLogoutConfirm}>logout</a>
          {:else}
            <a href="/" on:click|preventDefault={toggleLogoutConfirm}>cancel</a>
            <svg class="separator" xmlns="http://www.w3.org/2000/svg" width="1" height="16" viewBox="0 0 1 16" fill="currentColor" aria-hidden="true">
              <line x1="0.5" y1="0" x2="0.5" y2="16" stroke="currentColor" stroke-width="0.5"/>
            </svg>
            <a href="/logout">confirm</a>
          {/if}
        </li>
      {:else}
        <li><a href="/login" on:click={e => handleNavigation(e, '/login')}>login</a></li>
      {/if}

      <li style="height: 1em"></li>
      <li><a href="/about" on:click={e => handleNavigation(e, '/about')}>about</a></li>
      {#if user}
        <li><a href="/settings" on:click={e => handleNavigation(e, '/settings')}>settings</a></li>
      {/if}
    </ul>
  </nav>
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
  .nav {
    width: 190px;
    padding-top: 1rem;
    position: fixed;
    top: 0;
    right: 50%;
    margin-right: 280px; /* Spacing between nav and main content */
    height: 100vh;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    padding: 0;
    width: 180px;
    height: 150px;
    min-height: 150px;
    flex-shrink: 0;
  }

  .nav-separator {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.6) 10%, rgba(0, 0, 0, 0.6) 90%, transparent 100%);
    margin: 0.5rem 0;
  }

  .nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 180px;
  }
  .nav li {
    margin-bottom: 0.5em;
    font-size: 1.2em;
    white-space: nowrap;
  }
  .nav a {
    color: inherit;
    text-decoration: none;
    background: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .nav a:hover {
    text-decoration: underline;
  }

  .nav .separator {
    color: #999;
    margin: 0 3px;
    vertical-align: middle;
    position: relative;
    top: -0.05em;
    flex-shrink: 0;
  }
  .main-content {
    width: 500px; /* Increased from 400px to 500px (added 100px) */
    min-height: 100vh;
    padding-top: 2rem;
    padding-bottom: 2rem;
    position: absolute;
    left: 50%;
    margin-left: -250px; /* Half of the new width */
    box-sizing: border-box;
  }
  @media (max-width: 920px) {
    .container {
      justify-content: center;
    }
    .nav {
      position: static;
      margin-right: 30px;
      height: auto;
      overflow-y: visible;
    }
    .main-content {
      position: static;
      margin-left: 0;
    }
  }
  @media (max-width: 700px) {
    .container {
      flex-direction: column;
      align-items: center;
    }
    .nav {
      display: none;
      position: static;
      margin-right: 0;
      height: auto;
      overflow-y: visible;
    }
    .main-content {
      width: 100vw;
      min-width: 0;
      padding: 1rem 0;
      position: static;
      margin-left: 0;
    }
  }
</style>