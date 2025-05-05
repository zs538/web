<script lang="ts">
    // You’ll wire up real auth later; for now just placeholders.
    let username = '';
    let password = '';
    let error: string | null = null;
  
    function handleSubmit(e: Event) {
      e.preventDefault();
      // This will be replaced with a call to your server/login endpoint.
      if (!username || !password) {
        error = "Please enter both username and password.";
        return;
      }
      // Simulate login (for now)
      alert(`Logging in as: ${username}`);
    }
  </script>
  
  <section class="login-container">
    <h1>Sign in</h1>
    <form class="login-form" on:submit|preventDefault={handleSubmit}>
      <label>
        Username
        <input type="text" bind:value={username} autocomplete="username" required>
      </label>
      <label>
        Password
        <input type="password" bind:value={password} autocomplete="current-password" required>
      </label>
      {#if error}
        <div class="login-error">{error}</div>
      {/if}
      <button type="submit">Log in</button>
    </form>
  </section>
  
  <style>
    .login-container {
      max-width: 360px;
      margin: 50px auto 0 auto;
      padding: 2rem 2.2rem 2rem 2.2rem;
      background: #fff;
      border-radius: 11px;
      box-shadow: 0 2px 22px 0 #23294010;
      text-align: center;
    }
    .login-container h1 {
      margin-bottom: 1.2em;
      font-size: 1.7rem;
      color: #222;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.2em;
    }
    .login-form label {
      text-align: left;
      font-size: 1em;
      color: #213250e6;
      display: block;
    }
    .login-form input {
      width: 100%;
      margin-top: 0.2em;
      font-size: 1em;
      padding: 0.65em 0.8em;
      border-radius: 7px;
      border: 1.5px solid #e0e6ed;
      background: #fafbfc;
      transition: border-color 0.14s;
    }
    .login-form input:focus {
      border-color: #61dafb;
      outline: none;
      background: #fff;
    }
    .login-error {
      background: #fde7ea;
      color: #a52;
      border-radius: 5px;
      padding: 7px 0;
      margin-bottom: -8px;
      font-size: 1em;
      text-align: center;
    }
    .login-form button {
      margin-top: 0.3em;
      font-size: 1em;
      padding: 0.68em 2.2em;
      border-radius: 8px;
      border: none;
      background: #61dafb;
      color: #213250;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.16s, color 0.12s;
    }
    .login-form button:hover,
    .login-form button:focus {
      background: #213250;
      color: #fff;
    }
  </style>