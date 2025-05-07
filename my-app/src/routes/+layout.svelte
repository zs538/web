<script lang="ts">
  import { page } from '$app/stores';
  
  // Access the user data from page.data
  $: user = $page.data.user;
  
  let showLogoutConfirm = false;
  function toggleLogoutConfirm() { showLogoutConfirm = !showLogoutConfirm; }
</script>

<div class="container">
  <nav class="nav">
    <ul>
      <li><a href="/">main</a></li>
      
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
  .container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    /* Allows left nav + 400px content centered on wide screens */
  }
  .nav {
    min-width: 120px;
    margin-right: 2rem;
    padding-top: 2rem;
  }
  .nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .nav li {
    margin-bottom: 0.75em;
    font-size: 1em;
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
    width: 400px;
    min-height: 100vh;
    padding-top: 2rem;
  }
  @media (max-width: 700px) {
    .container {
      flex-direction: column;
      align-items: center;
    }
    .nav {
      display: none;
    }
    .main-content {
      width: 100vw;
      min-width: 0;
      padding: 1rem 0;
    }
  }
</style>