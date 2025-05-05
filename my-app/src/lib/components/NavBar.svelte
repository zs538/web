<script lang="ts">
    import { page } from '$app/stores';
    import { derived } from 'svelte/store';
  
    // Compute the logo target dynamically based on current route
    const logoHref = derived(page, ($page) => {
      if ($page.url.pathname === '/') return '/about';
      if ($page.url.pathname === '/about') return '/';
      return '/';
    });
  </script>
  
  <nav class="navbar">
    <div class="nav-left">
      <a href={$logoHref} class="site-logo">iK</a>
    </div>
    <div class="nav-right">
      <a href="/login" class="nav-link">Login</a>
    </div>
  </nav>
  
  <style>
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.7rem 1.3rem;
      background: rgba(0,0,0,0);
      color: #000;
      font-family: system-ui, sans-serif;
      font-size: 1rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .nav-left, .nav-right {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .site-logo {
      font-weight: bold;
      letter-spacing: 1.5px;
      color: #000;
      text-decoration: none;
      font-size: 1.25em;
      transition: color 0.15s;
    }
    .site-logo:hover {
      text-decoration: underline;
    }
    .nav-link {
        color: inherit;
      text-decoration: none;
      transition: color 0.15s;
      padding: 3px 0;
    }
    .nav-link:hover,
    .nav-link:focus {
      
      outline: none;
    }
  </style>