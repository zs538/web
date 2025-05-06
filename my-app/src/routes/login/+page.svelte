<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let form;

  function redirectIfLoggedIn() {
    if (browser && $page.data.user) {
      goto('/me', { replaceState: true });
    }
  }

  onMount(() => {
    redirectIfLoggedIn();

    // Also check when the tab or page becomes visible (handles bfcache/back button)
    const handler = () => redirectIfLoggedIn();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });
</script>

<div class="login-container">
  <h1>Log In</h1>

  <form method="POST" use:enhance>
    <div class="form-group">
      <label for="username">Username</label>
      <input 
        type="text" 
        id="username" 
        name="username" 
        required
        minlength="1"
      >
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        required
        minlength="1"
      >
    </div>

    {#if form?.message}
      <div class="error-message">{form.message}</div>
    {/if}

    <button type="submit">Log In</button>
  </form>
</div>

<style>
  .login-container {
    max-width: 400px;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin: 2rem auto;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 1rem;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
  }

  button:hover {
    background: #2563eb;
  }

  .error-message {
    color: #ef4444;
    margin: 1rem 0;
    text-align: center;
  }
</style>