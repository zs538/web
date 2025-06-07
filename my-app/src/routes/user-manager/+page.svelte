<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import AddUserForm from '$lib/components/AddUserForm.svelte';
  import { activeDropdown } from '$lib/stores/dropdownStore';
  import type { User } from '$lib/server/db/schema';

  // Get data from server
  export let data: { users: User[]; totalCount: number };

  // Local state
  let users: User[] = data.users || [];
  let searchQuery = '';
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
  let isSpinning = false; // Track spinning animation state
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Dynamic pagination based on viewport
  let rowsPerPage = 10; // Default fallback
  let currentPage = 1;
  let totalPages = Math.max(1, Math.ceil((data.totalCount || 0) / rowsPerPage));
  let totalCount = data.totalCount || 0;
  let unfilteredTotalCount = data.totalCount || 0; // Store the original total count
  let pageInputValue = currentPage.toString();
  let isEditingPage = false;
  let isHoveringCount = false;

  // Calculate optimal rows per page based on viewport
  function calculateRowsPerPage() {
    if (typeof window === 'undefined') return 10; // Server-side fallback

    // Get viewport height
    const viewportHeight = window.innerHeight;

    // Calculate space used by other elements - conservative but accurate
    let otherElementsHeight = 0;

    // Main layout padding (from +layout.svelte: padding-top: 2rem = 32px, padding-bottom: 2rem = 32px)
    otherElementsHeight += 64; // 32px top + 32px bottom

    // H1 element (font-size: 1.8rem ≈ 28.8px + margin-bottom: 1.5rem = 24px)
    otherElementsHeight += 53; // ~29px + 24px margin

    // View tabs (height: 40px + margin-bottom: 20px)
    otherElementsHeight += 60; // 40px + 20px margin

    // Search container (height ≈ 35px + margin-bottom: 20px)
    otherElementsHeight += 55; // 35px + 20px margin

    // Pagination (height ≈ 40px + some margin)
    otherElementsHeight += 50; // Conservative estimate

    // Table header (padding: 7px top/bottom + font + border ≈ 30px)
    otherElementsHeight += 30; // Accurate estimate

    // Safety margin for browser chrome, scrollbars, dropdowns, etc.
    otherElementsHeight += 80; // Realistic safety margin aligned with server-side

    // Available height for table rows
    const availableHeight = viewportHeight - otherElementsHeight;

    // Each table row height (actual measured height)
    const rowHeight = 49; // Actual measured row height

    // Calculate how many rows can fit
    const maxRows = Math.floor(availableHeight / rowHeight);

    // Ensure minimum of 2 rows but NO maximum limit - fill the screen!
    return Math.max(2, maxRows);
  }

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

  // Simple reactive statement to update users when filters change
  $: if (searchQuery || filterRole || filterStatus || filterSort) {
    // Debounce the filter changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 1; // Reset to page 1 when filters change
      pageInputValue = '1'; // Update page input
      fetchUsers();
    }, 300);
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
  function generatePasswordString(): string {
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

    return generatedPassword;
  }

  /**
   * Generate password with animation (for button clicks)
   */
  function generatePassword(): void {
    // Always generate a new password
    newPassword = generatePasswordString();

    // Trigger animation only if not already spinning
    if (!isSpinning) {
      isSpinning = true;
      setTimeout(() => {
        isSpinning = false;
      }, 700); // Match the animation duration
    }
  }

  // Select all text in password input when focused
  function selectAllPassword(event: FocusEvent) {
    const target = event.target as HTMLInputElement;
    target.select();
  }


  // Show confirmation dialog for actions
  function confirmAction(userId: string, action: string) {
    actionTarget = userId;
    actionType = action;

    if (action === 'reset-password') {
      // For password reset, show the custom popup instead
      newPassword = generatePasswordString(); // Generate password without animation
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

  // Fetch users with current filters and pagination
  async function fetchUsers() {
    try {
      loading = true;

      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', rowsPerPage.toString());

      if (searchQuery) params.set('search', searchQuery);
      if (filterRole && filterRole !== 'all') params.set('role', filterRole);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (filterSort && filterSort !== 'newest') {
        if (filterSort === 'oldest') {
          params.set('sortBy', 'createdAt');
          params.set('sortOrder', 'asc');
        } else if (filterSort === 'username') {
          params.set('sortBy', 'username');
          params.set('sortOrder', 'asc');
        }
      }

      const response = await fetch(`/api/users?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.users)) {
        throw new Error('Invalid response format');
      }

      users = data.users;
      totalCount = data.pagination?.totalCount || 0;
      totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

      // Store unfiltered total count only when no filters are applied
      if (activeFilterCount === 0 && !searchQuery) {
        unfilteredTotalCount = totalCount;
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to fetch users';

      // Set default values in case of error
      users = [];
      totalPages = 1;
      totalCount = 0;
    } finally {
      loading = false;
    }
  }

  // Handle page navigation
  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    // Clear any existing debounce timer to prevent conflicts
    if (debounceTimer) clearTimeout(debounceTimer);

    // Update page state
    currentPage = page;
    pageInputValue = page.toString();
    isEditingPage = false;

    // Fetch users for the new page
    fetchUsers();
  }

  // Handle page input submission
  function handlePageInputSubmit() {
    // If input is empty, reset to current page
    if (!pageInputValue.trim()) {
      pageInputValue = currentPage.toString();
      isEditingPage = false;
      return;
    }

    // Parse the page number
    const pageNumber = parseInt(pageInputValue, 10);

    // Validate the page number
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      // Invalid input, reset to current page
      pageInputValue = currentPage.toString();
      isEditingPage = false;
      return;
    }

    // Navigate to the specified page (goToPage already sets isEditingPage = false)
    goToPage(pageNumber);
  }

  // Toggle page edit mode
  function togglePageEditMode() {
    isEditingPage = !isEditingPage;
    if (isEditingPage) {
      // When entering edit mode, ensure the input value matches the current page
      pageInputValue = currentPage.toString();
      // Focus the input after the DOM updates
      setTimeout(() => {
        const input = document.querySelector('.page-input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 0);
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
          await fetchUsers();
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
  function toggleDropdown(userId: string, event: MouseEvent) {
    // If this dropdown is already active, close it
    if ($activeDropdown === userId) {
      $activeDropdown = null;
      return;
    }

    // Otherwise, activate this dropdown
    $activeDropdown = userId;

    // Position the dropdown menu immediately
    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();

    // Use setTimeout to ensure DOM update, but without async/await complexity
    setTimeout(() => {
      const dropdown = document.querySelector(`.dropdown-menu[data-id="${userId}"]`) as HTMLElement;
      if (dropdown) {
        dropdown.style.top = `${buttonRect.bottom + 5}px`;
        dropdown.style.left = `${buttonRect.left}px`;
      }
    }, 0);
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
    // Calculate optimal rows per page based on viewport
    rowsPerPage = calculateRowsPerPage();
    totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

    // If we have no users (empty initial load), fetch them immediately
    if (users.length === 0 && totalCount > 0) {
      fetchUsers();
    }

    // Add global click handler to close dropdowns
    document.addEventListener('click', handleClickOutside);

    // Set up window resize listener to recalculate rows per page
    const handleResize = () => {
      const newRowsPerPage = calculateRowsPerPage();
      if (newRowsPerPage !== rowsPerPage) {
        rowsPerPage = newRowsPerPage;
        totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

        // If current page is now beyond total pages, go to last page
        if (currentPage > totalPages) {
          currentPage = totalPages;
          pageInputValue = currentPage.toString();
        }

        // Refetch with new page size
        fetchUsers();
      }
    };

    window.addEventListener('resize', handleResize);

    // Clean up event listener and timers on component destroy
    return (): void => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      clearMessageTimer();
      if (debounceTimer) clearTimeout(debounceTimer);
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
      {#if activeFilterCount > 0 || searchQuery}
        <button
          class="user-count filtered"
          on:mouseenter={() => isHoveringCount = true}
          on:mouseleave={() => isHoveringCount = false}
          on:click={resetFilters}
          aria-label="Clear all filters"
          type="button"
        >
          <span class="count-text">
            Showing {totalCount} of {unfilteredTotalCount} users
          </span>
          <div class="clear-overlay" class:visible={isHoveringCount}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </button>
      {:else}
        <div class="user-count">
          <span class="count-text">
            Total users: {totalCount}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  {#key showAddUserForm}
    {#if showAddUserForm}
      <div class="add-user-form" in:fade={{ duration: 200, delay: 200 }} out:fade={{ duration: 200 }}>
        <AddUserForm
          on:userAdded={async (event) => {
            // Set success message from the event
            success = event.detail.message;
            await fetchUsers();

            // Only redirect to list if the toggle is enabled
            if (event.detail.redirectToList) {
              showAddUserForm = false;
            }
          }}
        />
      </div>
    {:else}
      <div class="user-list">
      {#if loading && users.length === 0}
        <div class="loading">Loading users...</div>
      {:else if users.length === 0}
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
          {#each users as user (user.id)}
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

          <!-- Add empty rows to maintain consistent page height -->
          {#if users.length < rowsPerPage}
            {#each Array(rowsPerPage - users.length) as _}
              <tr class="empty-row">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td class="actions">
                  <div class="dropdown">
                    <button class="dropdown-toggle empty-button" disabled aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="transparent" class="three-dots-icon">
                        <circle cx="8" cy="3" r="1.6" />
                        <circle cx="8" cy="8" r="1.6" />
                        <circle cx="8" cy="13" r="1.6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button
          class="page-btn first"
          disabled={currentPage === 1}
          on:click={() => goToPage(1)}
          aria-label="First page"
        >
          <img src="/chevron-first.svg" alt="First page" class="chevron-icon" />
        </button>

        <button
          class="page-btn prev"
          disabled={currentPage === 1}
          on:click={() => goToPage(currentPage - 1)}
          aria-label="Previous page"
        >
          <img src="/chevron-left.svg" alt="Previous page" class="chevron-icon" />
        </button>

        {#if isEditingPage}
          <div class="page-indicator editing">
            <input
              type="text"
              class="page-input"
              bind:value={pageInputValue}
              on:input={(e) => {
                // Only allow numeric input
                let value = e.currentTarget.value.replace(/[^0-9]/g, '');

                // If value is not empty, validate the range
                if (value) {
                  const numValue = parseInt(value, 10);
                  if (numValue > totalPages) {
                    // If greater than max pages, set to max
                    value = totalPages.toString();
                  } else if (numValue < 1) {
                    // If less than 1, set to 1
                    value = '1';
                  }
                }

                e.currentTarget.value = value;
                pageInputValue = value;
              }}
              on:keydown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
              on:blur={() => isEditingPage = false}
              aria-label="Go to page"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            <span class="page-separator">&nbsp;/&nbsp;</span>
            <span class="total-pages">{totalPages}</span>
          </div>
        {:else}
          <button
            class="page-indicator-btn"
            on:click={togglePageEditMode}
            aria-label="Click to edit page number"
          >
            <span class="current-page">{currentPage}</span>
            <span class="page-separator">&nbsp;/&nbsp;</span>
            <span class="total-pages">{totalPages}</span>
          </button>
        {/if}

        <button
          class="page-btn next"
          disabled={currentPage === totalPages}
          on:click={() => goToPage(currentPage + 1)}
          aria-label="Next page"
        >
          <img src="/chevron-right.svg" alt="Next page" class="chevron-icon" />
        </button>

        <button
          class="page-btn last"
          disabled={currentPage === totalPages}
          on:click={() => goToPage(totalPages)}
          aria-label="Last page"
        >
          <img src="/chevron-last.svg" alt="Last page" class="chevron-icon" />
        </button>
      </div>
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
                on:focus={selectAllPassword}
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
                aria-label="Generate password"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#656565" class="generate-icon" class:spinning={isSpinning}><path d="M204-318q-22-38-33-78t-11-82q0-134 93-228t227-94h7l-64-64 56-56 160 160-160 160-56-56 64-64h-7q-100 0-170 70.5T240-478q0 26 6 51t18 49l-60 60ZM481-40 321-200l160-160 56 56-64 64h7q100 0 170-70.5T720-482q0-26-6-51t-18-49l60-60q22 38 33 78t11 82q0 134-93 228t-227 94h-7l64 64-56 56Z"/></svg>
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
    width: 500px;
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
    position: relative;
    border: none; /* For button variant */
    cursor: default; /* Default cursor for div variant */
  }

  .count-text {
    display: inline-block;
    transform: translateY(1px);
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .user-count.filtered {
    color: #3498db; /* Blue when filters are applied */
    background: rgba(52, 152, 219, 0.1); /* Light blue background */
    cursor: pointer; /* Pointer cursor for button variant */
  }

  .clear-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    color: white;
    cursor: pointer;
    border-radius: 0;
    backdrop-filter: blur(1px);
    -webkit-backdrop-filter: blur(1px);
    transform: scale(0.95);
  }

  .clear-overlay.visible {
    opacity: 1;
    transform: scale(1);
  }

  .clear-overlay:hover {
    background: rgba(0, 0, 0, 0.18);
    transform: scale(1.02);
  }

  .clear-overlay svg {
    transition: transform 0.2s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .clear-overlay:hover svg {
    transform: scale(1.1);
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
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

  /* Removed unused .users-list styling */

  /* Removed .user-list styling - now using dynamic row calculation */

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'SuisseIntl', sans-serif; /* Apply post text font to table */
    table-layout: fixed; /* Enable fixed column widths */
  }

  th, td {
    text-align: left;
    border-bottom: 1px solid #ddd;
    box-sizing: border-box; /* Include padding in width calculations */
  }

  th {
    padding: 7px 10px; /* Adjust header row to match data rows */
    background: #f5f5f5;
    font-weight: normal;
    font-family: 'ManifoldExtended', sans-serif; /* Keep headers in the navigation font */
  }

  td {
    padding: 7px 10px; /* Adjust vertical padding to make rows 49px high */
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300; /* Use the light version of Suisse font */
    color: #333; /* Slightly lighter text color */
  }

  /* Row hover effect */
  tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  /* Fixed column widths */
  th:nth-child(1), td:nth-child(1) { width: 32%; } /* Username */
  th:nth-child(2), td:nth-child(2) { width: 16%; } /* Role */
  th:nth-child(3), td:nth-child(3) { width: 20%; } /* Status */
  th:nth-child(4), td:nth-child(4) { width: 21.6%; } /* Created */
  th:nth-child(5), td:nth-child(5) { width: 10.4%; } /* Actions */

  .actions {
    position: relative;
    text-align: center;
  }

  th:last-child {
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

  /* Empty row styling to maintain consistent table height */
  .empty-row td {
    border-bottom: 1px solid #ddd;
    color: transparent; /* Hide the &nbsp; content */
  }

  /* Empty button styling - invisible but maintains dimensions */
  .empty-button {
    opacity: 0;
    cursor: default;
    pointer-events: none;
  }

  .empty-button:disabled {
    opacity: 0;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    gap: 10px;
  }

  .page-btn {
    min-width: 30px;
    height: 30px;
    padding: 0 5px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: 'SuisseIntl', sans-serif;
    font-size: 13px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chevron-icon {
    width: 16px;
    height: 16px;
    filter: invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);
  }

  /* Slightly lighter and smaller for first/last page icons */
  .page-btn.first .chevron-icon,
  .page-btn.last .chevron-icon {
    width: 14px;
    height: 14px;
    filter: invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);
  }

  .page-btn:disabled .chevron-icon {
    opacity: 0.5;
  }

  .page-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }

  .page-btn:active:not(:disabled) {
    background: rgba(0, 0, 0, 0.1);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .page-indicator {
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    width: 70px;
    box-sizing: border-box;
  }

  .page-indicator.editing {
    border: 1px solid #ddd;
  }

  .page-indicator-btn {
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
    color: #333;
    background: transparent;
    border: none;
    padding: 0;
    height: 30px;
    width: 70px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .page-indicator-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .current-page {
    color: #333;
    position: relative;
    top: -1px;
  }

  .page-input {
    width: 20px;
    height: 28px;
    padding: 0;
    margin: 0;
    border: none;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
    text-align: right;
    border-radius: 0;
    color: #333;
    box-sizing: border-box;
    background: transparent;
    position: relative;
    top: -1px;
  }

  .page-input:focus {
    outline: none;
  }

  .page-separator {
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
    color: #333;
    position: relative;
    top: -1px;
  }

  .total-pages {
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
    color: #333;
    position: relative;
    top: -1px;
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
    border-left: 1px solid transparent;
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
  }

  .generate-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
    border: 1px solid #aaa;
  }

  .generate-icon {
    width: 20px;
    height: 20px;
    opacity: 0.8;
    transition: opacity 0.15s ease;
  }

  .generate-btn:hover .generate-icon {
    opacity: 1;
  }

  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .generate-icon.spinning {
    animation: rotate 0.7s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
    will-change: transform;
  }
</style>
