<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  // Event dispatcher with typed events
  const dispatch = createEventDispatcher<{
    userAdded: { user: any; message: string; redirectToList: boolean };
  }>();

  // Reference to the username input element
  let usernameInput: HTMLInputElement;

  // Form state
  let username = '';
  let password = '';
  let role = 'user';
  let loading = false;
  let error = '';
  let success = '';
  let redirectToList = true; // Default to redirect after submission

  /**
   * Generates a random password with only letters and numbers
   * Uses cryptographically secure random values for better security
   */
  function generatePassword(): void {
    const lowercase: string = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers: string = '0123456789';
    const charset: string = lowercase + uppercase + numbers;

    // Password length
    const passwordLength: number = 12;

    // Generate secure random values
    const randomValues = new Uint32Array(passwordLength);
    crypto.getRandomValues(randomValues);

    // Generate password
    let newPassword: string = '';
    for (let i = 0; i < passwordLength; i++) {
      newPassword += charset[randomValues[i] % charset.length];
    }

    password = newPassword;
  }

  // Submit form
  async function handleSubmit() {
    // Reset status
    error = '';
    success = '';

    // Validate form
    if (!username.trim()) {
      error = 'Username is required';
      return;
    }

    if (!password || password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    try {
      loading = true;

      // Submit to API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      // Success - store the username for the message
      const createdUsername = username;
      success = `User "${createdUsername}" has been created successfully`;

      // Reset form
      username = '';
      password = '';
      role = 'user';

      // Notify parent component
      dispatch('userAdded', {
        user: data.user,
        message: `User "${createdUsername}" has been created successfully`,
        redirectToList
      });

      // If not redirecting, focus on the username input for quick creation of another user
      if (!redirectToList) {
        // Use setTimeout to ensure the focus happens after the form is reset
        setTimeout(() => {
          if (usernameInput) {
            usernameInput.focus();
          }
        }, 0);
      }
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      error = err instanceof Error ? err.message : 'Failed to create user';
    } finally {
      loading = false;
    }
  }

  // Clear form fields
  function clearForm() {
    username = '';
    password = '';
    role = 'user';
    error = '';
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="add-user-form">
  <div class="form-group">
    <label for="username">Username</label>
    <input
      type="text"
      id="username"
      bind:value={username}
      bind:this={usernameInput}
      disabled={loading}
      required
    />
  </div>

  <div class="form-group password-group">
    <label for="password">Password</label>
    <div class="password-input-container">
      <input
        type="text"
        id="password"
        bind:value={password}
        disabled={loading}
        required
        minlength="6"
      />
      <button
        type="button"
        class="generate-btn"
        on:click={generatePassword}
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#999"><path d="M640-260q25 0 42.5-17.5T700-320q0-25-17.5-42.5T640-380q-25 0-42.5 17.5T580-320q0 25 17.5 42.5T640-260ZM480-420q25 0 42.5-17.5T540-480q0-25-17.5-42.5T480-540q-25 0-42.5 17.5T420-480q0 25 17.5 42.5T480-420ZM320-580q25 0 42.5-17.5T380-640q0-25-17.5-42.5T320-700q-25 0-42.5 17.5T260-640q0 25 17.5 42.5T320-580ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/></svg>
      </button>
    </div>
  </div>

  <div class="form-group">
    <label for="role">Role</label>
    <select id="role" bind:value={role} disabled={loading}>
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  </div>

  {#if error}
    <div class="error-message" transition:fade={{ duration: 200 }}>
      {error}
    </div>
  {/if}

  <div class="form-actions">
    <div class="toggle-container">
      <label class="toggle-switch">
        <input type="checkbox" bind:checked={redirectToList}>
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label">Return to list</span>
    </div>
    <div class="button-group">
      <button
        type="button"
        class="clear-btn"
        on:click={clearForm}
        disabled={loading}
      >
        Clear
      </button>
      <button
        type="submit"
        class="submit-btn"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </div>
  </div>
</form>

<style>
  .add-user-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label {
    font-size: 14px;
    font-family: 'ManifoldExtended', sans-serif;
  }

  input, select {
    padding: 8px;
    border: 1px solid #ccc;
    font-size: 14px;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    color: #333;
    background-color: #ffffff; /* Set white background */
    height: 40px;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  select option {
    background-color: #ffffff; /* Set white background for options */
    color: #333;
  }

  input:focus, select:focus {
    outline: none;
    border: 1px solid #3498db;
    background-color: #ffffff;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .password-input-container {
    display: flex;
    gap: 0;
  }

  .password-input-container input {
    flex: 1;
    border-right: none;
  }

  .password-input-container input:focus {
    outline: none;
    border: 1px solid #3498db;
    border-right: 1px solid #3498db;
    background-color: #ffffff;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .generate-btn {
    padding: 0;
    background: #ffffff;
    border: 1px solid #ccc;
    border-left: none;
    cursor: pointer;
    font-size: 14px;
    font-family: 'ManifoldExtended', sans-serif;
    height: 40px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .generate-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid #bbb;
    border-left: none;
  }

  .generate-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px solid #aaa;
    border-left: none;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 10px;
    font-size: 14px;
    border: 1px solid #ef9a9a;
  }

  .form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }

  .button-group {
    display: flex;
    gap: 10px;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-label {
    font-size: 12px;
    font-family: 'ManifoldExtended', sans-serif;
    color: #666;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 16px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .3s;
    border-radius: 0; /* Sharp edges */
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .3s;
    border-radius: 0; /* Sharp edges */
  }

  input:checked + .toggle-slider {
    background-color: #3498db;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(16px);
  }

  .clear-btn {
    padding: 0 16px;
    background: transparent;
    border: 1px solid #ddd;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    height: 40px;
    transition: all 0.15s ease;
  }

  .clear-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .clear-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .submit-btn {
    padding: 0 16px;
    background: transparent;
    color: #333;
    border: 1px solid #333;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    height: 40px;
    transition: all 0.15s ease;
  }

  .submit-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .submit-btn:active {
    border-color: #2e7d32;
    color: #2e7d32;
    background-color: rgba(46, 125, 50, 0.1);
  }

  .submit-btn:disabled, .clear-btn:disabled, .generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: transparent;
    border-color: #ddd;
    color: #999;
  }
</style>
