<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment'; 
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let form;

  // Redirect logged-in users to myposts instead of /me
  function redirectIfLoggedIn() {
  if (browser && $page.data.user) {
    goto('/', { replaceState: true });  // Change from /myposts to /
  }
}


  onMount(() => {
    redirectIfLoggedIn();
    
    // Handle visibility changes (back button)
    const handler = () => redirectIfLoggedIn();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });
</script>

<h1>Login</h1>

<form method="POST" use:enhance>
  <div>
    <label for="username">Username</label>
    <input type="text" id="username" name="username" required minlength="1">
  </div>

  <div>
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required minlength="1">
  </div>

  {#if form?.message}
    <div class="error">{form.message}</div>
  {/if}

  <button type="submit">Login</button>
</form>

<style>
  h1 {
    margin-bottom: 1.5rem;
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  
  div {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  label {
    font-size: 1rem;
  }
  
  input {
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    width: 100%;
  }
  
  button {
    padding: 0.5rem;
    cursor: pointer;
    margin-top: 0.5rem;
    align-self: flex-start;
  }
  
  .error {
    color: red;
  }
</style>