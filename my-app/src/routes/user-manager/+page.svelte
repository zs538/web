<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import AddUserForm from '$lib/components/AddUserForm.svelte';
  import { activeDropdown } from '$lib/stores/dropdownStore';

  // Get data from server
  export let data;

  // Local state
  let users = data.users || [];
  let searchQuery = '';
  let filteredUsers = users;
  let showAddUserForm = false;
  let showConfirmDialog = false;
  let showPasswordResetPopup = false;
  let actionTarget: string | null = null;
  let actionType = '';
  let loading = false;
  let error = '';
  let success = '';
  let showFilterMenu = false; // Track if filter menu is open
  let newPassword = ''; // For password reset

  // Message timer state
  let messageTimer: ReturnType<typeof setTimeout> | null = null;
  let animationInterval: number | null = null; // For requestAnimationFrame
  let messageProgress: number = 100; // Progress percentage for the timer indicator
  const MESSAGE_TIMEOUT: number = 5000; // 5 seconds

  // Filter state
  let filterRole: string = 'all'; // 'all', 'user', 'admin'
  let filterStatus: string = 'all'; // 'all', 'active', 'inactive'
  let filterSort: string = 'newest'; // 'newest', 'oldest', 'username'

  // Calculate active filter count
  $: activeFilterCount = [
    filterRole !== 'all',
    filterStatus !== 'all',
    filterSort !== 'newest'
  ].filter(Boolean).length;

  // Apply all filters to users
  $: {
    // Start with all users
    let result = [...users];

    // Apply username search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.username.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      result = result.filter(user => user.role === filterRole);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      result = result.filter(user => user.isActive === isActive);
    }

    // Apply sorting
    if (filterSort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (filterSort === 'username') {
      result.sort((a, b) => a.username.localeCompare(b.username));
    } else {
      // Default: newest first
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    filteredUsers = result;
  }

  // Toggle filter menu
  function toggleFilterMenu() {
    showFilterMenu = !showFilterMenu;
  }

  // Reset filters to default
  function resetFilters() {
    // Keep searchQuery as is since it's now separate from the filter menu
    filterRole = 'all';
    filterStatus = 'all';
    filterSort = 'newest';
  }

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
    let generatedPassword: string = '';
    for (let i = 0; i < passwordLength; i++) {
      generatedPassword += charset[randomValues[i] % charset.length];
    }

    newPassword = generatedPassword;
  }


  // Show confirmation dialog for actions
  function confirmAction(userId: string, action: string) {
    actionTarget = userId;
    actionType = action;

    if (action === 'reset-password') {
      // For password reset, show the custom popup instead
      newPassword = ''; // Clear any previous password
      showPasswordResetPopup = true;
    } else {
      // For other actions, use the standard confirm dialog
      showConfirmDialog = true;
    }

    $activeDropdown = null; // Close the dropdown when an action is selected
  }

  // Cancel action
  function cancelAction() {
    showConfirmDialog = false;
    showPasswordResetPopup = false;
    actionTarget = null;
    actionType = '';
    newPassword = '';
  }

  // Refresh user list
  async function refreshUsers() {
    try {
      loading = true;
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        users = data.users;
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      error = 'Failed to refresh user list';
    } finally {
      loading = false;
    }
  }

  // Execute action
  async function executeAction() {
    if (!actionTarget || !actionType) return;

    try {
      loading = true;
      error = '';
      success = '';

      let endpoint = '';
      let method = 'POST';
      let body = null;

      switch (actionType) {
        case 'delete-user':
          endpoint = `/api/users/${actionTarget}`;
          method = 'DELETE';
          break;
        case 'reset-password':
          endpoint = `/api/users/${actionTarget}/reset-password`;
          // If we have a custom password, send it in the request body
          if (newPassword) {
            body = JSON.stringify({ password: newPassword });
          }
          break;
        case 'delete-posts':
          endpoint = `/api/users/${actionTarget}/delete-posts`;
          break;
        default:
          throw new Error('Invalid action type');
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body
      };

      const response = await fetch(endpoint, fetchOptions);

      if (response.ok) {
        const result = await response.json();
        success = result.message || 'Action completed successfully';

        // If we deleted a user, refresh the list
        if (actionType === 'delete-user') {
          await refreshUsers();
        }
      } else {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || `Action failed (${response.status}: ${response.statusText})`);
      }
    } catch (err: unknown) {
      console.error(`Error executing ${actionType}:`, err);
      error = err instanceof Error ? err.message : `Failed to ${actionType.replace('-', ' ')}`;
    } finally {
      loading = false;
      showConfirmDialog = false;
      showPasswordResetPopup = false;
      actionTarget = null;
      actionType = '';
      newPassword = '';
    }
  }

  // View user posts
  function viewUserPosts(userId: string) {
    $activeDropdown = null; // Close the dropdown
    window.location.href = `/user-manager/posts/${userId}`;
  }

  // Toggle dropdown menu
  async function toggleDropdown(userId: string, event: MouseEvent) {
    // If this dropdown is already active, close it
    if ($activeDropdown === userId) {
      $activeDropdown = null;
      return;
    }

    // Otherwise, activate this dropdown
    $activeDropdown = userId;

    // Wait for the DOM to update
    await tick();

    // Position the dropdown menu
    const button = event.currentTarget as HTMLElement;
    const dropdown = document.querySelector(`.dropdown-menu[data-id="${userId}"]`) as HTMLElement;

    if (button && dropdown) {
      const buttonRect = button.getBoundingClientRect();

      // Position the dropdown below and to the right of the button
      dropdown.style.top = `${buttonRect.bottom + 5}px`;
      dropdown.style.left = `${buttonRect.left}px`;
    }
  }

  // Close dropdown and filter menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (event.target instanceof Element) {
      // Close dropdown if open and click is outside
      if ($activeDropdown && !event.target.closest('.dropdown')) {
        $activeDropdown = null;
      }

      // Close filter menu if open and click is outside the filter dialog
      // We don't need to check for clicks outside the backdrop since it covers the whole screen
      if (showFilterMenu && event.target.classList.contains('filter-dialog-backdrop')) {
        showFilterMenu = false;
      }

      // Close password reset popup if open and click is outside the dialog
      if (showPasswordResetPopup && event.target.classList.contains('confirm-dialog-backdrop')) {
        cancelAction();
      }
    }
  }

  // Throttle scroll updates for better performance
  let scrollUpdateFrame: number | null = null;

  // Update dropdown position when scrolling
  function handleScroll() {
    if ($activeDropdown && !scrollUpdateFrame) {
      scrollUpdateFrame = requestAnimationFrame(() => {
        if ($activeDropdown) {
          // Find the button and dropdown elements
          const button = document.querySelector(`.dropdown-toggle[data-user-id="${$activeDropdown}"]`) as HTMLElement;
          const dropdown = document.querySelector(`.dropdown-menu[data-id="${$activeDropdown}"]`) as HTMLElement;

          if (button && dropdown) {
            const buttonRect = button.getBoundingClientRect();

            // Update dropdown position to stay relative to the button
            dropdown.style.top = `${buttonRect.bottom + 5}px`;
            dropdown.style.left = `${buttonRect.left}px`;
          }
        }
        scrollUpdateFrame = null;
      });
    }
  }

  /**
   * Starts the message timer for auto-dismissal and progress animation
   * Uses requestAnimationFrame for smoother animation
   */
  function startMessageTimer(): void {
    // Clear any existing timer
    clearMessageTimer();

    // Reset progress
    messageProgress = 100;

    // Use requestAnimationFrame for smoother animation
    const startTime: number = performance.now();
    let lastFrameTime: number = startTime;

    // Animation function using requestAnimationFrame
    const animate = (currentTime: number): void => {
      // Calculate elapsed time
      const elapsed: number = currentTime - startTime;

      // Update progress only if enough time has passed since last frame
      // This throttles updates for better performance
      if (currentTime - lastFrameTime > 16) { // ~60fps throttling
        messageProgress = Math.max(0, 100 - (elapsed / MESSAGE_TIMEOUT * 100));
        lastFrameTime = currentTime;
      }

      // Continue animation if not complete
      if (messageProgress > 0 && animationInterval) {
        animationInterval = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationInterval = requestAnimationFrame(animate);

    // Set timeout to clear messages
    messageTimer = setTimeout(() => {
      error = '';
      success = '';

      // Cancel animation frame if still running
      if (typeof animationInterval === 'number') {
        cancelAnimationFrame(animationInterval);
        animationInterval = null;
      }

      messageTimer = null;
    }, MESSAGE_TIMEOUT);
  }

  /**
   * Clears any active message timers and animation frames
   */
  function clearMessageTimer(): void {
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }

    if (animationInterval !== null) {
      cancelAnimationFrame(animationInterval);
      animationInterval = null;
    }
  }

  /**
   * Dismisses messages when clicked
   */
  function dismissMessage(): void {
    error = '';
    success = '';
    clearMessageTimer();
  }

  // Watch for changes to error or success messages
  $: if (error || success) {
    startMessageTimer();
  }

  // Initialize
  onMount((): (() => void) => {
    refreshUsers();

    // Add global click handler to close dropdowns
    document.addEventListener('click', handleClickOutside);

    // Add scroll handler to update dropdown position when scrolling
    window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events

    // Clean up event listener and timers on component destroy
    return (): void => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      clearMessageTimer();

      // Cancel any pending scroll update frame
      if (scrollUpdateFrame) {
        cancelAnimationFrame(scrollUpdateFrame);
        scrollUpdateFrame = null;
      }
    };
  });
</script>

<div class="user-manager">
  <h1>User Manager</h1>

  <div class="view-tabs">
    <button
      class="tab-button"
      class:active={!showAddUserForm}
      on:click={() => showAddUserForm = false}
      type="button"
    >
      User List
    </button>

    <button
      class="tab-button"
      class:active={showAddUserForm}
      on:click={() => showAddUserForm = true}
      type="button"
    >
      Create User
    </button>
  </div>

  <div class="message-container">
    {#if error}
      <button
        type="button"
        class="message error-message"
        on:click={(): void => dismissMessage()}
        aria-label="Dismiss error message"
        transition:fade={{ duration: 300 }}
      >
        <div class="message-content">{error}</div>
        <div class="message-timer" style="width: {messageProgress}%"></div>
      </button>
    {/if}

    {#if success}
      <button
        type="button"
        class="message success-message"
        on:click={(): void => dismissMessage()}
        aria-label="Dismiss success message"
        transition:fade={{ duration: 300 }}
      >
        <div class="message-content">{success}</div>
        <div class="message-timer" style="width: {messageProgress}%"></div>
      </button>
    {/if}
  </div>

  {#if !showAddUserForm}
    <div class="search-container" in:fade={{ duration: 200 }}>
      <div class="search-wrapper">
        <input
          type="text"
          id="username-search"
          class="search-input"
          bind:value={searchQuery}
          placeholder="Search by username..."
        />
        {#if searchQuery}
          <button
            class="search-clear-btn"
            on:click={() => searchQuery = ''}
            type="button"
            aria-label="Clear search"
          >
            ×
          </button>
        {/if}
      </div>
      <div class="user-count" class:filtered={activeFilterCount > 0}>
        <span class="count-text">
          {#if activeFilterCount > 0}
            Showing {filteredUsers.length} of {users.length} users
          {:else}
            Total users: {users.length}
          {/if}
        </span>
      </div>
    </div>
  {/if}

  {#key showAddUserForm}
    {#if showAddUserForm}
      <div class="add-user-form" in:fade={{ duration: 200, delay: 200 }} out:fade={{ duration: 200 }}>
        <AddUserForm
          on:userAdded={async (event) => {
            // Set success message from the event
            success = event.detail.message;
            await refreshUsers();

            // Only redirect to list if the toggle is enabled
            if (event.detail.redirectToList) {
              showAddUserForm = false;
            }
          }}
        />
      </div>
    {:else}
      <div class="users-list" in:fade={{ duration: 200, delay: 200 }} out:fade={{ duration: 200 }}>
      {#if loading && users.length === 0}
        <div class="loading">Loading users...</div>
      {:else if filteredUsers.length === 0}
        <div class="no-results">
          {activeFilterCount > 0 ? 'No users match the current filters' : 'No users found'}
        </div>
      {:else}
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>
              <button
                class="filter-toggle"
                class:active={activeFilterCount > 0}
                on:click|stopPropagation={toggleFilterMenu}
                type="button"
                aria-label="Filter users"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="filter-icon">
                  <polygon points="1,1 15,1 9,8 9,14 7,15 7,8 1,1"></polygon>
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as user (user.id)}
            <tr>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td>{user.isActive ? 'Active' : 'Inactive'}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td class="actions">
                <div class="dropdown">
                  <button class="dropdown-toggle" data-user-id={user.id} on:click|stopPropagation={(event) => toggleDropdown(user.id, event)} aria-label="User actions">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" class="three-dots-icon">
                      <circle cx="8" cy="3" r="1.6" />
                      <circle cx="8" cy="8" r="1.6" />
                      <circle cx="8" cy="13" r="1.6" />
                    </svg>
                  </button>

                  {#if $activeDropdown === user.id}
                    <div
                      class="dropdown-menu"
                      data-id={user.id}
                      transition:slide|local={{ duration: 150, easing: quintOut }}
                    >
                      <button
                        class="dropdown-item view-posts"
                        on:click={() => viewUserPosts(user.id)}
                      >
                        View Posts
                      </button>
                      <button
                        class="dropdown-item reset-password"
                        on:click={() => confirmAction(user.id, 'reset-password')}
                      >
                        Reset Password
                      </button>
                      <button
                        class="dropdown-item delete-posts"
                        on:click={() => confirmAction(user.id, 'delete-posts')}
                      >
                        Delete All Posts
                      </button>
                      <button
                        class="dropdown-item delete-user"
                        on:click={() => confirmAction(user.id, 'delete-user')}
                      >
                        Delete User
                      </button>
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
      </div>
    {/if}
  {/key}

  {#if showFilterMenu}
    <div class="filter-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
      <div class="filter-dialog" transition:slide={{ duration: 200, easing: quintOut }}>
        <h3>Filter Users</h3>

        <div class="filter-section">
          <label for="role">Role</label>
          <select id="role" bind:value={filterRole} class="filter-select">
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div class="filter-section">
          <label for="status">Status</label>
          <select id="status" bind:value={filterStatus} class="filter-select">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="filter-section">
          <label for="sort">Sort By</label>
          <select id="sort" bind:value={filterSort} class="filter-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="username">Username (A-Z)</option>
          </select>
        </div>

        <div class="filter-actions">
          <button class="reset-btn" on:click={resetFilters}>Reset Filters</button>
          <button class="close-btn" on:click={() => showFilterMenu = false}>Close</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showConfirmDialog}
    <div class="confirm-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
      <div class="confirm-dialog" transition:slide={{ duration: 200, easing: quintOut }}>
        <h3>Confirm Action</h3>
        <p>
          {#if actionType === 'delete-user'}
            Are you sure you want to permanently delete this user?
          {:else if actionType === 'delete-posts'}
            Delete ALL posts by this user? This cannot be undone.
          {/if}
        </p>
        <div class="confirm-actions">
          <button class="cancel-btn" on:click={cancelAction}>Cancel</button>
          <button class="confirm-btn" on:click={executeAction} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showPasswordResetPopup}
    <div class="confirm-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
      <div class="confirm-dialog" transition:slide={{ duration: 200, easing: quintOut }}>
        <h3>Reset Password</h3>
        <div class="password-reset-form">
          <div class="form-group password-group">
            <label for="new-password">New Password</label>
            <div class="password-input-container">
              <input
                type="text"
                id="new-password"
                bind:value={newPassword}
                disabled={loading}
                required
                minlength="6"
                placeholder="Enter password or generate one"
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
        </div>
        <div class="confirm-actions">
          <button class="cancel-btn" on:click={cancelAction}>Cancel</button>
          <button
            class="confirm-btn"
            on:click={executeAction}
            disabled={loading || !newPassword}
          >
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .user-manager {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .view-tabs {
    display: flex;
    margin: 0 auto 20px;
    border-bottom: 1px solid #ddd;
    max-width: 400px;
    width: 100%;
  }

  .tab-button {
    flex: 1;
    padding: 0;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 13px;
    height: 40px;
    transition: all 0.15s ease;
    color: #888;
    text-align: center;
  }

  .tab-button:hover {
    color: #555;
  }

  .tab-button.active {
    border-bottom-color: #3498db;
    color: #3498db;
  }

  /* Search container */
  .search-container {
    margin: 0 auto 20px;
    max-width: 500px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    min-width: 0; /* Allow flex item to shrink below content size */
  }

  .search-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 14px;
    border: 1px solid #ccc; /* Match login page border color */
    border-radius: 0; /* Square corners */
    box-sizing: border-box;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    color: #333;
    transition: all 0.15s ease;
  }

  .user-count {
    font-size: 14px;
    color: #666; /* Gray by default */
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    background: rgba(0, 0, 0, 0.05); /* Light gray background */
    padding: 0 12px;
    height: 35px;
    border-radius: 0;
    white-space: nowrap;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
  }

  .count-text {
    display: inline-block;
    transform: translateY(1px);
  }

  .user-count.filtered {
    color: #3498db; /* Blue when filters are applied */
    background: rgba(52, 152, 219, 0.1); /* Light blue background */
  }

  .search-input:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.3);
  }

  .search-clear-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #999;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    transition: all 0.15s ease;
  }

  .search-clear-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #666;
  }

  .search-clear-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  /* Filter toggle button */
  .filter-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 0;
    transition: all 0.15s ease;
  }

  .filter-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .filter-toggle:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .filter-toggle.active {
    color: #3498db;
  }

  .filter-icon {
    width: 16px;
    height: 16px;
    display: block;
    margin-top: 2px;
    color: #656565;
  }

  /* Filter dialog */
  .filter-dialog-backdrop {
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

  .filter-dialog {
    background: white;
    padding: 20px;
    border-radius: 2px;
    max-width: 400px;
    width: 100%;
    font-family: 'SuisseIntl', sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .filter-dialog h3 {
    font-family: 'ManifoldExtended', sans-serif;
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.2rem;
  }

  .filter-section {
    margin-bottom: 15px;
  }

  .filter-section label {
    display: block;
    margin-bottom: 5px;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
  }

  .filter-select, .filter-select option {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc; /* Match login page border color */
    border-radius: 3px;
    font-size: 14px;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    color: #333; /* Slightly lighter text color */
    background-color: #ffffff; /* Set white background */
    transition: all 0.15s ease;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.3);
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .reset-btn, .close-btn {
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

  .reset-btn:hover, .close-btn:hover {
    background: rgba(51, 51, 51, 0.1);
  }

  .reset-btn:disabled, .close-btn:disabled {
    background: transparent;
    border-color: #999;
    color: #999;
    cursor: not-allowed;
  }



  .add-user-form {
    background: #f5f5f5;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
  }

  .message-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-width: 90vw;
    z-index: 2000;
  }

  .message {
    position: relative;
    width: 100%;
    padding: 12px;
    border: none;
    text-align: left;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    font-size: 14px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s ease;
    display: block;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .message:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .message:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .message-content {
    position: relative;
    z-index: 2;
  }

  .message-timer {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.5);
    transition: width 0.01s linear; /* Ultra-smooth animation */
    z-index: 1;
    will-change: width; /* Optimize for animation performance */
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    border-left: 4px solid #ef5350;
  }

  .error-message .message-timer {
    background: rgba(198, 40, 40, 0.3);
  }

  .success-message {
    background: #e8f5e9;
    color: #2e7d32;
    border-left: 4px solid #66bb6a;
  }

  .success-message .message-timer {
    background: rgba(46, 125, 50, 0.3);
  }

  .users-list {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 200px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'SuisseIntl', sans-serif; /* Apply post text font to table */
  }

  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  td {
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    color: #333; /* Slightly lighter text color */
  }

  th {
    background: #f5f5f5;
    font-weight: normal;
    font-family: 'ManifoldExtended', sans-serif; /* Keep headers in the navigation font */
  }

  .actions {
    position: relative;
    width: 40px;
    text-align: center;
  }

  th:last-child {
    width: 40px;
    text-align: center;
  }

  .dropdown {
    position: relative;
    display: block;
  }

  .dropdown-toggle {
    padding: 5px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 0;
    transition: background-color 0.15s ease;
  }

  .dropdown-toggle:hover {
    background: #f0f0f0;
  }

  .dropdown-toggle:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .three-dots-icon {
    width: 18px;
    height: 18px;
    display: block;
    color: #656565;
    opacity: 0.8;
    transition: opacity 0.15s ease;
  }

  .dropdown-toggle:hover .three-dots-icon {
    opacity: 1;
  }

  .dropdown-menu {
    position: fixed; /* Use fixed positioning to avoid container constraints */
    background: white;
    border: 1px solid #ddd;
    border-radius: 3px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    min-width: 150px;
    z-index: 1000; /* Higher z-index to ensure it appears above everything */
    font-family: 'SuisseIntl', sans-serif; /* Apply post text font to dropdown */
    font-weight: 300; /* Use the light version of Suisse font */
    transform-origin: top center;
  }

  .dropdown-item {
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap; /* Prevent text wrapping */
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background: #f5f5f5;
  }

  .dropdown-item:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .view-posts,
  .reset-password,
  .delete-posts,
  .delete-user {
    color: #333;
  }

  .loading, .no-results {
    padding: 20px;
    text-align: center;
    color: #666;
  }



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
    font-weight: 300; /* Use the light version of Suisse font */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .confirm-dialog h3 {
    font-family: 'ManifoldExtended', sans-serif;
    margin-top: 0;
    font-size: 1.2rem;
    font-weight: normal;
  }

  .confirm-dialog p {
    margin-bottom: 0;
    font-style: italic;
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

  .cancel-btn:active {
    background-color: rgba(51, 51, 51, 0.1);
  }

  .confirm-btn {
    padding: 0 0.5rem;
    background: transparent;
    color: #f44336;
    border: 1px solid #f44336;
    border-radius: 0;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    width: 130px;
    height: 40px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .confirm-btn:hover {
    background: rgba(244, 67, 54, 0.1);
  }

  .confirm-btn:active {
    background-color: rgba(244, 67, 54, 0.2);
  }

  .confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Password reset popup styles */
  .password-reset-form {
    margin: 15px 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .password-group label {
    font-size: 14px;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .password-input-container {
    display: flex;
    gap: 0;
  }

  .password-input-container input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-right: none;
    font-size: 14px;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    color: #333;
    transition: all 0.15s ease;
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
    background: none;
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
</style>
