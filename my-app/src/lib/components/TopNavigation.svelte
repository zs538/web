<script lang="ts">
  import { page } from '$app/stores';
  import { navigate } from '$lib/utils/navigation';

  // Get user data from page store
  $: user = $page.data.user;
  $: isLoggedIn = !!user;
  $: isAdmin = user?.role === 'admin';

  // Navigation function
  async function handleNavigation(path: string) {
    await navigate(path);
  }

  // Logout function
  function handleLogout() {
    window.location.href = '/logout';
  }
</script>

<nav class="top-nav">
  <div class="nav-container">
    <!-- Left side: Main navigation links -->
    <div class="nav-left">
      <a href="/" class="nav-link" class:active={$page.url.pathname === '/'}>
        aicum
      </a>

      {#if isLoggedIn}
        <a href="/create" class="nav-link" class:active={$page.url.pathname === '/create'}>
          Create
        </a>
        <a href="/myposts" class="nav-link" class:active={$page.url.pathname === '/myposts'}>
          My Posts
        </a>
        <a href="/settings" class="nav-link" class:active={$page.url.pathname === '/settings'}>
          Settings
        </a>
      {/if}

      {#if isAdmin}
        <a href="/user-manager" class="nav-link" class:active={$page.url.pathname === '/user-manager'}>
          Users
        </a>
        <a href="/log" class="nav-link" class:active={$page.url.pathname === '/log'}>
          Log
        </a>
      {/if}
    </div>

    <!-- Right side: Login/Logout and About -->
    <div class="nav-right">
      {#if isLoggedIn}
        <button class="nav-link logout-btn" on:click={handleLogout}>
          Logout
        </button>
      {:else}
        <a href="/login" class="nav-link">Login</a>
      {/if}

      <a href="/about" class="nav-link" class:active={$page.url.pathname === '/about'}>
        About
      </a>
    </div>
  </div>
</nav>

<style>
  .top-nav {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 960px;
    height: 22px;
    background-color: #fff;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    border-radius: 0 0 4px 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    width: 100%;
    padding: 0 16px;
    box-sizing: border-box;
    position: relative;
  }



  .nav-left,
  .nav-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nav-link {
    color: #000;
    text-decoration: none;
    font-size: 11px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  .logout-btn {
    color: #000;
    font-size: 11px;
  }

  /* Responsive adjustments */
  @media (max-width: 960px) {
    .top-nav {
      left: 16px;
      right: 16px;
      width: auto;
      transform: none;
    }
  }

  @media (max-width: 768px) {
    .top-nav {
      left: 12px;
      right: 12px;
    }

    .nav-container {
      padding: 0 12px;
    }

    .nav-left,
    .nav-right {
      gap: 12px;
    }

    .nav-link {
      font-size: 10px;
    }
  }

  @media (max-width: 480px) {
    .top-nav {
      left: 8px;
      right: 8px;
    }

    .nav-container {
      padding: 0 8px;
    }

    .nav-left,
    .nav-right {
      gap: 8px;
    }

    .nav-link {
      font-size: 9px;
    }
  }
</style>
