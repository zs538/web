<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let showPasswordChangePopup = false;
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let isLoading = false;
  let message = '';
  let messageType: 'success' | 'error' | '' = '';

  function openPasswordChangePopup() {
    showPasswordChangePopup = true;
    // Reset form and messages
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    message = '';
    messageType = '';
  }

  function closePasswordChangePopup() {
    showPasswordChangePopup = false;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    message = '';
    messageType = '';
  }

  // Handle click outside to close popup
  function handleClickOutside(event: MouseEvent) {
    if (event.target instanceof Element) {
      // Close password change popup if open and click is outside the dialog
      if (showPasswordChangePopup && event.target.classList.contains('confirm-dialog-backdrop')) {
        closePasswordChangePopup();
      }
    }
  }

  // Initialize click handler
  onMount(() => {
    // Add global click handler to close popups
    document.addEventListener('click', handleClickOutside);

    // Clean up event listener on component destroy
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  async function handlePasswordChange() {
    // Reset message
    message = '';
    messageType = '';

    // Validate form
    if (!currentPassword) {
      message = 'Current password is required';
      messageType = 'error';
      return;
    }

    if (!newPassword) {
      message = 'New password is required';
      messageType = 'error';
      return;
    }

    if (newPassword.length < 6) {
      message = 'New password must be at least 6 characters long';
      messageType = 'error';
      return;
    }

    if (newPassword !== confirmPassword) {
      message = 'New passwords do not match';
      messageType = 'error';
      return;
    }

    if (currentPassword === newPassword) {
      message = 'New password must be different from current password';
      messageType = 'error';
      return;
    }

    isLoading = true;

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        message = result.message || 'Password changed successfully';
        messageType = 'success';

        // Close popup after a short delay to show success message
        setTimeout(() => {
          closePasswordChangePopup();
        }, 1500);
      } else {
        message = result.message || 'Failed to change password';
        messageType = 'error';
      }
    } catch (error) {
      console.error('Error changing password:', error);
      message = 'An error occurred while changing password';
      messageType = 'error';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="settings-container">
  <h1>Settings</h1>

  <div class="settings-section">
    <div class="setting-item">
      <div class="setting-info">
        <h3>Password</h3>
        <p>Change your account password</p>
      </div>
      <button class="setting-action" on:click={openPasswordChangePopup}>
        Change Password
      </button>
    </div>
  </div>
</div>

<!-- Password Change Popup -->
{#if showPasswordChangePopup}
  <div class="confirm-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
    <div class="confirm-dialog" transition:slide={{ duration: 200, easing: quintOut }}>
      <h3>Change Password</h3>

      <form on:submit|preventDefault={handlePasswordChange}>
        <div class="password-change-form">
          <div class="form-group">
            <label for="current-password">Current Password</label>
            <input
              type="password"
              id="current-password"
              bind:value={currentPassword}
              required
              disabled={isLoading}
            />
          </div>

          <div class="form-group">
            <label for="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              bind:value={newPassword}
              required
              minlength="6"
              disabled={isLoading}
            />
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              bind:value={confirmPassword}
              required
              minlength="6"
              disabled={isLoading}
            />
          </div>

          {#if message}
            <div class="popup-message {messageType}" transition:slide>
              {message}
            </div>
          {/if}
        </div>

        <div class="confirm-actions">
          <button type="button" class="cancel-btn" on:click={closePasswordChangePopup}>Cancel</button>
          <button type="submit" class="confirm-btn" disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}>
            {isLoading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Apply box-sizing to all elements */
  :global(*) {
    box-sizing: border-box;
  }

  .settings-container {
    width: 100%;
    max-width: 500px;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }

  .settings-section {
    margin-bottom: 2rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 0;
    border-bottom: 1px solid #eee;
  }

  .setting-info h3 {
    font-size: 1.1rem;
    margin: 0 0 0.3rem 0;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .setting-info p {
    font-size: 0.9rem;
    color: #666;
    margin: 0;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
  }

  .setting-action {
    padding: 0.5rem 1rem;
    background: #333;
    color: white;
    border: none;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 0.9rem;
    transition: background-color 0.15s ease;
  }

  .setting-action:hover {
    background: #555;
  }

  /* Popup styles - matching user-manager */
  .confirm-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    will-change: opacity, backdrop-filter;
    transition: background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                -webkit-backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .confirm-dialog {
    background: white;
    padding: 20px;
    border-radius: 2px;
    max-width: 400px;
    width: 100%;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .confirm-dialog h3 {
    font-family: 'ManifoldExtended', sans-serif;
    margin-top: 0;
    font-size: 1.2rem;
    font-weight: normal;
  }

  .password-change-form {
    margin: 15px 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 15px;
  }

  .form-group label {
    font-size: 14px;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .form-group input {
    padding: 8px;
    border: 1px solid #ccc;
    font-size: 14px;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    color: #333;
    transition: all 0.15s ease;
  }

  .form-group input:focus {
    outline: none;
    border: 1px solid #3498db;
    background-color: #ffffff;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .form-group input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .popup-message {
    font-size: 0.9rem;
    margin-top: 10px;
    padding: 8px;
    border-radius: 3px;
  }

  .popup-message.success {
    color: #27ae60;
    background-color: rgba(39, 174, 96, 0.1);
  }

  .popup-message.error {
    color: #e74c3c;
    background-color: rgba(231, 76, 60, 0.1);
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .cancel-btn {
    padding: 0 0.5rem;
    background: transparent;
    border: 1px solid #333;
    border-radius: 0;
    color: #333;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    width: 130px;
    height: 40px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .cancel-btn:hover {
    background: rgba(51, 51, 51, 0.1);
  }

  .confirm-btn {
    padding: 0 0.5rem;
    background: transparent;
    color: #3498db;
    border: 1px solid #3498db;
    border-radius: 0;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    width: 130px;
    height: 40px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .confirm-btn:hover:not(:disabled) {
    background: rgba(52, 152, 219, 0.1);
  }

  .confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
