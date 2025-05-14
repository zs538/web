<script lang="ts">
  import { page } from '$app/stores';

  // Access the user data from page.data
  $: user = $page.data.user;

  let showLogoutConfirm = false;
  function toggleLogoutConfirm() { showLogoutConfirm = !showLogoutConfirm; }
</script>

<div class="container">
  <nav class="nav">
    <div class="logo-container">
      <div class="logo" role="img" aria-label="aicum logo"></div>
    </div>
    <ul>
      <li><a href="/">aicum</a></li>

      <!-- Check if user exists -->
      {#if user}
        <li><a href="/myposts">my posts</a></li>
        <li><a href="/create">create post</a></li>

        <!-- Check if user is admin -->
        {#if user.role === 'admin'}
          <li><a href="/admin/log">audit log</a></li>
          <li><a href="/admin/users">user manager</a></li>
        {/if}

        <li>
          {#if !showLogoutConfirm}
            <button type="button" class="link-btn" on:click={toggleLogoutConfirm}>logout</button>
          {:else}
            <button type="button" class="link-btn" on:click={toggleLogoutConfirm}>cancel</button>
            <span> </span>
            <a href="/logout">confirm</a>
          {/if}
        </li>
      {:else}
        <li><a href="/login">login</a></li>
      {/if}

      <li style="height: 1em"></li>
      <li><a href="/about">about</a></li>
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
    min-width: 120px;
    padding-top: 1rem;
    position: fixed;
    top: 0;
    right: 50%;
    margin-right: 300px; /* 400px/2 + increased spacing */
    height: 100vh;
    overflow-y: auto;
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
  }
  .nav a, .link-btn {
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }
  .nav a:hover, .link-btn:hover {
    text-decoration: underline;
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