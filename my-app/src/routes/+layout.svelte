<script lang="ts">
  import { page } from '$app/stores';
  import { navigate } from '$lib/utils/navigation';

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
      <div class="logo" role="img" aria-label="aicum logo"></div>
    </div>
    <ul>
      <li><a href="/" on:click={e => handleNavigation(e, '/')}>aicum</a></li>

      <!-- Check if user exists -->
      {#if user}
        <li><a href="/myposts" on:click={e => handleNavigation(e, '/myposts')}>my posts</a></li>
        <li><a href="/create" on:click={e => handleNavigation(e, '/create')}>create post</a></li>

        <!-- Check if user is admin -->
        {#if user.role === 'admin'}
          <li><a href="/admin/log" on:click={e => handleNavigation(e, '/admin/log')}>audit log</a></li>
          <li><a href="/admin/users" on:click={e => handleNavigation(e, '/admin/users')}>user manager</a></li>
        {/if}

        <li>
          {#if !showLogoutConfirm}
            <a href="/logout" on:click|preventDefault={toggleLogoutConfirm}>logout</a>
          {:else}
            <a href="/" on:click|preventDefault={toggleLogoutConfirm}>cancel</a>
            <span class="separator"></span>
            <a href="/logout">confirm</a>
          {/if}
        </li>
      {:else}
        <li><a href="/login" on:click={e => handleNavigation(e, '/login')}>login</a></li>
      {/if}

      <li style="height: 1em"></li>
      <li><a href="/about" on:click={e => handleNavigation(e, '/about')}>about</a></li>
    </ul>
  </nav>
  <main class="main-content">
    <slot />
  </main>
</div>

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

  :global(body) {
    font-family: 'ManifoldExtended', sans-serif;
    margin: 0;
    padding: 0;
  }

  /* Global loading indicator removed */

  :global(.suisse-font) {
    font-family: 'SuisseIntl', sans-serif;
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
    width: 180px;
    padding-top: 1rem;
    position: fixed;
    top: 0;
    right: 50%;
    margin-right: 260px; /* Reduced spacing between nav and main content */
    height: 100vh;
    overflow-y: hidden;
  }
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    padding: 0;
  }
  .logo {
    width: 140px;
    height: 140px;
    background-image: url('/hearthands.jpg');
    background-size: cover;
    background-position: center;
    border-radius: 4px;
    pointer-events: none;
    user-select: none;
  }
  .nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
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
    display: inline-block;
    width: 0.5px;
    height: 0.7em;
    margin: 0 3px;
    background-color: #ddd;
    vertical-align: middle;
    position: relative;
    top: -0.05em;
  }
  .main-content {
    width: 500px; /* Increased from 400px to 500px (added 100px) */
    min-height: 100vh;
    padding-top: 2rem;
    position: absolute;
    left: 50%;
    margin-left: -250px; /* Half of the new width */
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