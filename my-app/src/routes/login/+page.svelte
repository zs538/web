<script lang="ts">
  import { enhance } from '$app/forms';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { getStores } from '$app/stores';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  const { page } = getStores();

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

<div class="login-container">
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

  <div class="submit-container">
    {#if form?.message}
      <div class="error-message" transition:slide>
        {form.message}
      </div>
    {:else}
      <div class="error-placeholder"></div>
    {/if}
    <button type="submit">Login</button>
  </div>
</form>
</div>

<style>
  /* Apply box-sizing to all elements */
  :global(*) {
    box-sizing: border-box;
  }

  .login-container {
    width: 100%;
    max-width: 500px;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    max-width: 500px;
    width: 100%;
    box-sizing: border-box; /* Ensure consistent sizing */
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
    box-sizing: border-box; /* Ensure padding and border are included in width */
    transition: all 0.15s ease;
  }

  input:focus {
    outline: none;
    border: 1px solid #3498db;
    background-color: #ffffff;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  /* Style the submit container to position error and button */
  .submit-container {
    display: flex;
    flex-direction: row !important; /* Override the column direction from general div styling */
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  button {
    padding: 0; /* Remove padding since we're using fixed height */
    background: #333;
    color: white;
    border: none;
    cursor: pointer;
    font-family: inherit;
    width: 110px; /* Reduced fixed width */
    height: 40px; /* Fixed height */
    text-align: center; /* Ensure text is centered */
    transition: background-color 0.15s ease; /* Smooth transition for hover state */
  }

  button:hover {
    background: #555;
  }

  button:disabled {
    background: #999;
    cursor: not-allowed;
  }

  .error-message {
    color: #e74c3c;
    font-size: 0.9rem;
    text-align: left;
    flex: 1; /* Take up available space */
    margin-right: 1rem; /* Add space between error and button */
  }

  .error-placeholder {
    min-height: 1rem; /* Minimum height to maintain layout when no error is present */
    flex: 1; /* Take up available space */
  }
</style>