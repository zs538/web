<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { activeLogDetails } from '$lib/stores/logDetailsStore';

  // Define log interface
  interface LogEntry {
    id: string;
    userId: string;
    username: string | null;
    action: string;
    targetTable: string;
    targetId: string;
    details: string | null;
    timestamp: string | Date;
  }

  // Get data from server
  export let data;

  // Local state
  let logs: LogEntry[] = Array.isArray(data.logs) ? data.logs : [];
  let searchQuery = '';
  let loading = false;
  let error = '';
  let success = '';
  let showFilterMenu = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Selected log for details popup
  let selectedLog: LogEntry | null = null;

  // Pagination state
  let currentPage = 1;
  let totalPages = Math.max(1, Math.ceil((data.totalCount || 0) / 15));
  let totalCount = data.totalCount || 0;
  let pageInputValue = '1'; // Variable for page input field
  let isEditingPage = false; // Track if user is editing the page number

  // Filter state
  let filterAction = '';
  let filterTargetTable = '';
  let filterStartDate = '';
  let filterEndDate = '';
  let filterSort = 'timestamp';
  let filterSortOrder = 'desc';

  // Track if filters have changed
  let previousFilterState = '';

  // Reactive statement to update logs when filters change
  $: {
    if (initialized) {
      // Create current filter state string for comparison
      const currentFilterState = JSON.stringify({
        searchQuery,
        filterAction,
        filterTargetTable,
        filterStartDate,
        filterEndDate,
        filterSort,
        filterSortOrder
      });

      // Only trigger if filter values changed (not page)
      if (currentFilterState !== previousFilterState) {
        // Store the new filter state
        previousFilterState = currentFilterState;

        // Debounce the filter changes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentPage = 1; // Reset to page 1 when filters change
          fetchLogs(false);
        }, 300);
      }
    }
  }

  // Flag to prevent initial triggering
  let initialized = false;

  // Message timer state
  let messageTimer: ReturnType<typeof setTimeout> | null = null;
  let animationInterval: number | null = null;
  let messageProgress: number = 100;
  const MESSAGE_TIMEOUT: number = 5000; // 5 seconds

  // Calculate active filter count
  $: activeFilterCount = [
    filterAction !== '',
    filterTargetTable !== '',
    filterStartDate !== '',
    filterEndDate !== '',
    filterSort !== 'timestamp' || filterSortOrder !== 'desc'
  ].filter(Boolean).length;

  // Format date for display
  function formatDate(dateString: string | Date | null): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);

      // Format as DD/MM/YYYY HH:MM:SS (24-hour format)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return 'Invalid date';
    }
  }

  // Truncate text with ellipsis
  function truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Format log details for display
  function formatDetails(log: LogEntry) {
    // Create an object with all log information except the details field
    const logInfo = {
      id: log.id,
      userId: log.userId,
      username: log.username || 'Deleted User',
      action: log.action,
      targetTable: log.targetTable,
      targetId: log.targetId,
      timestamp: Math.floor(new Date(log.timestamp).getTime() / 1000) // Unix timestamp
    };

    // Format the log info as pretty-printed JSON
    return JSON.stringify(logInfo, null, 2);
  }

  // Toggle filter menu
  function toggleFilterMenu() {
    showFilterMenu = !showFilterMenu;
  }

  // Toggle log details popup
  function toggleLogDetails(log: LogEntry) {
    if ($activeLogDetails === log.id) {
      // Close the popup if it's already open for this log
      $activeLogDetails = null;
      selectedLog = null;
    } else {
      // Open the popup for this log
      $activeLogDetails = log.id;
      selectedLog = log;
    }
  }

  // Reset filters to default
  function resetFilters() {
    // Clear any existing debounce timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Temporarily disable reactive updates
    initialized = false;

    // Reset all filter values
    filterAction = '';
    filterTargetTable = '';
    filterStartDate = '';
    filterEndDate = '';
    filterSort = 'timestamp';
    filterSortOrder = 'desc';

    // Reset to page 1
    currentPage = 1;

    // Fetch logs immediately and re-enable reactive updates after
    fetchLogs(false).finally(() => initialized = true);
  }

  // Track if refresh button is spinning
  let isSpinning: boolean = false;
  let refreshDisabled: boolean = false;
  let isRequestInProgress: boolean = false;

  // Fetch logs with current filters and pagination
  async function fetchLogs(fromRefreshButton: boolean = false) {
    // Only check refresh disabled state if the request is coming from the refresh button
    if (fromRefreshButton && refreshDisabled) return;

    // Prevent concurrent requests regardless of source
    if (isRequestInProgress) return;

    try {
      loading = true;
      isRequestInProgress = true;

      // Only set refresh button state if the request is from the refresh button
      if (fromRefreshButton) {
        refreshDisabled = true;
        isSpinning = true;
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '15');
      // Add cache-busting parameter
      params.set('_cb', Date.now().toString());

      if (searchQuery) params.set('search', searchQuery);
      if (filterAction) params.set('action', filterAction);
      if (filterTargetTable) params.set('targetTable', filterTargetTable);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);
      if (filterSort) params.set('sortBy', filterSort);
      if (filterSortOrder) params.set('sortOrder', filterSortOrder);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }

      try {
        const data = await response.json();

        if (!data || !Array.isArray(data.logs)) {
          throw new Error('Invalid response format');
        }

        logs = data.logs as LogEntry[];
        totalPages = data.pagination?.totalPages || 1;
        totalCount = data.pagination?.totalCount || 0;
      } catch (parseError) {
        throw new Error('Failed to parse server response');
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to fetch logs';
      showMessage(error, 'error');

      // Set default values in case of error
      logs = [];
      totalPages = 1;
      totalCount = 0;
    } finally {
      // Always immediately clear the request in progress flag
      loading = false;
      isRequestInProgress = false;

      // Only handle refresh button animation if the request came from it
      if (fromRefreshButton) {
        // Use a single timeout with a slightly longer duration to ensure animation completes fully
        window.setTimeout((): void => {
          isSpinning = false;
          refreshDisabled = false;
        }, 750); // Slightly longer than animation duration for safety
      }
    }
  }

  // Handle page navigation
  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    // Clear any existing debounce timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Temporarily disable reactive updates to prevent double fetching
    initialized = false;

    // Update page and fetch logs
    currentPage = page;
    pageInputValue = page.toString(); // Update the input field value
    isEditingPage = false; // Exit edit mode

    // Fetch logs and re-enable reactive updates
    fetchLogs(false).finally(() => initialized = true);
  }

  // Handle page input submission
  function handlePageInputSubmit() {
    // If input is empty, reset to current page
    if (!pageInputValue.trim()) {
      pageInputValue = currentPage.toString();
      isEditingPage = false;
      return;
    }

    const pageNumber = parseInt(pageInputValue, 10);

    // Validate the input
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      // Reset to current page if invalid
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

  // Show message with auto-dismiss
  function showMessage(message: string, type: 'error' | 'success') {
    // Set message based on type
    error = type === 'error' ? message : '';
    success = type === 'success' ? message : '';

    // Clear existing timers
    dismissMessage();

    // Reset progress
    messageProgress = 100;

    // Only run animation in browser
    if (typeof window !== 'undefined') {
      // Start countdown animation
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const remaining = Math.max(0, MESSAGE_TIMEOUT - elapsed);
        messageProgress = (remaining / MESSAGE_TIMEOUT) * 100;

        if (remaining > 0) {
          animationInterval = requestAnimationFrame(animate);
        } else {
          // Clear message when timer completes
          error = '';
          success = '';
          animationInterval = null;
        }
      };

      animationInterval = requestAnimationFrame(animate);
    }

    // Set backup timeout
    messageTimer = setTimeout(() => {
      error = '';
      success = '';
      messageTimer = null;
    }, MESSAGE_TIMEOUT);
  }

  // Dismiss message
  function dismissMessage() {
    error = '';
    success = '';
    if (messageTimer) clearTimeout(messageTimer);
    if (typeof window !== 'undefined' && animationInterval !== null) {
      cancelAnimationFrame(animationInterval);
    }
    messageTimer = null;
    animationInterval = null;
  }

  // Seed sample logs for testing
  async function seedSampleLogs() {
    try {
      loading = true;
      const response = await fetch('/api/audit-logs/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        success = result.message || 'Sample logs created successfully';
        showMessage(success, 'success');
        // Refresh logs
        fetchLogs(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create sample logs');
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to create sample logs';
      showMessage(error, 'error');
    } finally {
      loading = false;
    }
  }

  // Click handler for closing popups
  const handleClickOutside = (e: MouseEvent): void => {
    const target = e.target as Element;

    // Close filter menu when clicking outside
    if (showFilterMenu &&
        !target.closest('.filter-dialog') &&
        !target.closest('.filter-toggle')) {
      showFilterMenu = false;
    }

    // Close details popup when clicking outside
    if ($activeLogDetails &&
        !target.closest('.details-dialog') &&
        !target.closest('.details-toggle')) {
      $activeLogDetails = null;
      selectedLog = null;
    }
  };

  // Log details functionality implemented above

  // Initialize with server data
  onMount(() => {
    // Set up click handler (only in browser)
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    // Initialize the previous filter state
    previousFilterState = JSON.stringify({
      searchQuery,
      filterAction,
      filterTargetTable,
      filterStartDate,
      filterEndDate,
      filterSort,
      filterSortOrder
    });

    // Ensure we have valid data
    if (!Array.isArray(logs) || logs.length === 0) {
      // Try to fetch logs if none were provided from server
      fetchLogs(false).catch(() => {
        error = 'Failed to load audit logs. Please try refreshing the page.';
        showMessage(error, 'error');
      });
    }

    // Enable reactive updates after initial load
    initialized = true;
  });

  // Clean up resources when component is destroyed
  onDestroy(() => {
    // Clean up event listener (only in browser)
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleClickOutside);
    }

    // Clear any timers
    if (debounceTimer) clearTimeout(debounceTimer);
    if (messageTimer) clearTimeout(messageTimer);
    if (animationInterval !== null) cancelAnimationFrame(animationInterval);
  });
</script>

<div class="audit-log">
  <h1>Audit Log</h1>

  <div class="header-actions">
    {#if logs.length === 0}
      <button class="seed-btn" on:click={seedSampleLogs}>Generate Sample Logs</button>
    {/if}
  </div>

  <div class="search-container">
    <div class="search-wrapper">
      <input
        type="text"
        id="log-search"
        class="search-input"
        bind:value={searchQuery}
        placeholder="Search logs..."
      />
      {#if searchQuery}
        <button
          class="search-clear-btn"
          on:click={() => { searchQuery = ''; }}
          type="button"
          aria-label="Clear search"
        >
          ×
        </button>
      {/if}
    </div>
    <div class="log-count-container">
      <div class="log-count" class:filtered={activeFilterCount > 0}>
        <span class="count-text">
          {#if activeFilterCount > 0}
            Showing {logs.length} of {totalCount} logs
          {:else}
            Total logs: {totalCount}
          {/if}
        </span>
      </div>
      <button
        class="refresh-btn"
        class:spinning={isSpinning}
        class:disabled={refreshDisabled}
        on:click={() => fetchLogs(true)}
        aria-label="Refresh logs"
        title="Refresh logs"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.7 6.3C16.2 4.9 14.2 4 12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8c3.7 0 6.8-2.5 7.7-6h-2.1c-.8 2.3-3 4-5.6 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.7 0 3.1.7 4.2 1.8L13 11h7V4l-2.3 2.3z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="logs-list" in:fade={{ duration: 200 }}>
    {#if loading && logs.length === 0}
      <div class="loading">Loading logs...</div>
    {:else if logs.length === 0}
      <div class="no-results">
        {activeFilterCount > 0 || searchQuery ? 'No logs match the current filters' : 'No logs found'}
      </div>
    {:else}
      <table>
        <thead>
          <tr>
            <th class="timestamp">Timestamp</th>
            <th class="username">User</th>
            <th class="action">Action</th>
            <th class="target">Target</th>
            <th class="details-cell">
              <button
                class="filter-toggle"
                class:active={activeFilterCount > 0}
                on:click|stopPropagation={toggleFilterMenu}
                type="button"
              >
                <img src="/funnel-icon.svg" alt="Filter" class="filter-icon" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each logs as log (log.id)}
            <tr>
              <td class="timestamp">{formatDate(log.timestamp)}</td>
              <td class="username">{truncateText(log.username || 'Deleted User', 7)}</td>
              <td class="action">{truncateText(log.action || 'Unknown', 16)}</td>
              <td class="target">{truncateText(`${log.targetTable || 'Unknown'}: ${log.targetId || 'Unknown'}`, 14)}</td>
              <td class="details-cell">
                <button
                  class="details-toggle"
                  on:click|stopPropagation={() => toggleLogDetails(log)}
                  aria-label="View log details"
                  title="View log details"
                >
                  <img src="/three-dots-icon.svg" alt="Details" class="three-dots-icon" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button
          class="page-btn prev"
          disabled={currentPage === 1}
          on:click={() => goToPage(currentPage - 1)}
          aria-label="Previous page"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="chevron-icon">
            <path d="M13.5 7L9.5 12L13.5 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="chevron-icon">
            <path d="M10.5 7L14.5 12L10.5 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    {/if}
  </div>

  {#if showFilterMenu}
    <div class="filter-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
      <div class="filter-dialog" transition:slide|local={{ duration: 200, easing: quintOut }}>
        <h3>Filter Logs</h3>

        <div class="filter-section">
          <label for="action">Action</label>
          <select id="action" bind:value={filterAction} class="filter-select">
            <option value="">All Actions</option>
            {#each data.filterOptions.actions as action}
              <option value={action}>{action}</option>
            {/each}
          </select>
        </div>

        <div class="filter-section">
          <label for="targetTable">Target Table</label>
          <select id="targetTable" bind:value={filterTargetTable} class="filter-select">
            <option value="">All Tables</option>
            {#each data.filterOptions.targetTables as table}
              <option value={table}>{table}</option>
            {/each}
          </select>
        </div>

        <div class="filter-section">
          <label for="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            bind:value={filterStartDate}
            class="filter-input"
          />
        </div>

        <div class="filter-section">
          <label for="endDate">End Date</label>
          <input
            type="date"
            id="endDate"
            bind:value={filterEndDate}
            class="filter-input"
          />
        </div>

        <div class="filter-section">
          <label for="sort">Sort By</label>
          <div class="sort-container">
            <select id="sort" bind:value={filterSort} class="filter-select">
              <option value="timestamp">Timestamp</option>
              <option value="username">Username</option>
              <option value="action">Action</option>
              <option value="targetTable">Target Table</option>
            </select>
            <select bind:value={filterSortOrder} class="filter-select order-select">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button class="reset-btn" on:click={resetFilters}>Reset Filters</button>
          <button class="close-btn" on:click={() => showFilterMenu = false}>Close</button>
        </div>
      </div>
    </div>
  {/if}

  {#if error || success}
    <div class="message-container" role="alert">
      {#if error}
        <button
          class="message error-message"
          on:click={dismissMessage}
          on:keydown={(e) => e.key === 'Enter' && dismissMessage()}
          transition:fade={{ duration: 200 }}
        >
          <div class="message-content">{error}</div>
          <div class="message-timer" style="width: {messageProgress}%"></div>
        </button>
      {/if}
      {#if success}
        <button
          class="message success-message"
          on:click={dismissMessage}
          on:keydown={(e) => e.key === 'Enter' && dismissMessage()}
          transition:fade={{ duration: 200 }}
        >
          <div class="message-content">{success}</div>
          <div class="message-timer" style="width: {messageProgress}%"></div>
        </button>
      {/if}
    </div>
  {/if}

  <!-- Log Details Popup -->
  {#if $activeLogDetails && selectedLog}
    <div class="details-dialog-backdrop" transition:fade={{ duration: 300, easing: quintOut }}>
      <div class="details-dialog" transition:slide|local={{ duration: 200, easing: quintOut }}>
        <h3>Log Details</h3>

        <div class="details-section">
          <div class="details-row">
            <div class="details-label">ID:</div>
            <div class="details-value">{selectedLog.id}</div>
          </div>

          <div class="details-row">
            <div class="details-label">Timestamp:</div>
            <div class="details-value">{formatDate(selectedLog.timestamp)}</div>
          </div>

          <div class="details-row">
            <div class="details-label">User:</div>
            <div class="details-value">{selectedLog.username || 'Deleted User'}</div>
          </div>

          <div class="details-row">
            <div class="details-label">Action:</div>
            <div class="details-value">{selectedLog.action || 'Unknown'}</div>
          </div>

          <div class="details-row">
            <div class="details-label">Target:</div>
            <div class="details-value">{selectedLog.targetTable || 'Unknown'}: {selectedLog.targetId || 'Unknown'}</div>
          </div>
        </div>

        <div class="details-section">
          <label for="details-content">Log Information:</label>
          <textarea
            id="details-content"
            class="details-textarea"
            readonly
          >{formatDetails(selectedLog)}</textarea>
        </div>

        <div class="details-actions">
          <button class="close-btn" on:click={() => { $activeLogDetails = null; selectedLog = null; }}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .audit-log {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .header-actions {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .seed-btn {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #3498db;
    color: #3498db;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 13px;
    transition: all 0.15s ease;
  }

  .seed-btn:hover {
    background: rgba(52, 152, 219, 0.1);
  }

  .seed-btn:active {
    background: rgba(52, 152, 219, 0.2);
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
    gap: 10px;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .search-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 0;
    box-sizing: border-box;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    color: #333;
    transition: all 0.15s ease;
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
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .log-count-container {
    display: flex;
    height: 35px;
  }

  .log-count {
    font-size: 14px;
    color: #666;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    background: rgba(0, 0, 0, 0.05);
    padding: 0 12px;
    height: 35px;
    border-radius: 0;
    white-space: nowrap;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    flex: 1;
  }

  .count-text {
    display: inline-block;
    transform: translateY(1px);
  }

  .log-count.filtered {
    color: #3498db;
    background: rgba(52, 152, 219, 0.1);
  }

  .refresh-btn {
    background: rgba(0, 0, 0, 0.05);
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 35px;
    height: 35px;
    color: #666;
    opacity: 0.7;
    transition: all 0.15s ease;
    border-radius: 0;
  }

  .refresh-btn:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.08);
  }

  .refresh-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  /* No additional styles needed for disabled state */

  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .refresh-btn svg {
    transform: rotate(0deg);
  }

  .refresh-btn.spinning svg {
    animation: rotate 0.7s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
    will-change: transform;
  }

  .logs-list {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 500px;
    border-collapse: collapse;
    font-family: 'SuisseIntl', sans-serif;
    table-layout: fixed;
    box-sizing: border-box;
  }

  th, td {
    padding: 6px 4px;
    text-align: left;
    border-bottom: 1px solid #ddd;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  td {
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    color: #333;
  }

  th {
    background: #f5f5f5;
    font-weight: normal;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .timestamp {
    width: 115px;
    font-size: 11px;
  }

  .username {
    width: 50px;
  }

  .action {
    width: 125px;
  }

  .target {
    width: 105px;
  }

  .details-cell {
    width: 40px;
    text-align: center;
  }

  .filter-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin: 0 auto;
  }

  .filter-toggle.active {
    color: #3498db;
  }

  .filter-icon {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }

  .filter-toggle.active .filter-icon {
    opacity: 1;
  }

  /* Details toggle button */
  .details-toggle {
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0 auto;
    opacity: 0.7;
    transition: all 0.15s ease;
  }

  .details-toggle:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
  }

  .details-toggle:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .three-dots-icon {
    width: 14px;
    height: 14px;
    display: block;
  }

  /* Details dialog styles */
  .details-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    will-change: opacity, backdrop-filter;
    transition: background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                -webkit-backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .details-dialog {
    background: white;
    padding: 20px;
    border-radius: 0;
    max-width: 440px; /* Total width including padding */
    width: 100%;
    box-sizing: border-box; /* Ensure padding is included in width calculation */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    will-change: transform;
    transform-origin: top center;
    max-height: 90vh;
    overflow-y: auto;
  }

  .details-dialog h3 {
    font-family: 'ManifoldExtended', sans-serif;
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.2rem;
  }

  .details-section {
    margin-bottom: 15px;
  }

  .details-row {
    display: flex;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .details-label {
    font-family: 'ManifoldExtended', sans-serif;
    font-weight: normal;
    margin-right: 4px;
  }

  .details-value {
    font-family: 'ManifoldExtended', sans-serif;
    flex-grow: 1;
    word-break: break-word;
    color: #777;
  }

  .details-section label {
    display: block;
    margin-bottom: 5px;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 14px;
  }

  .details-textarea {
    width: 100%;
    height: 275px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 0;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    font-size: 13px;
    resize: none;
    background: #f9f9f9;
    color: #333;
    white-space: pre-wrap;
    box-sizing: border-box; /* Ensure padding is included in width */
  }

  .details-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .loading, .no-results {
    padding: 20px;
    text-align: center;
    color: #666;
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
  }

  .chevron-icon path {
    stroke: #777;
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

  /* Filter dialog */
  .filter-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    will-change: opacity, backdrop-filter;
    transition: background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                -webkit-backdrop-filter 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .filter-dialog {
    background: white;
    padding: 20px;
    border-radius: 0;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    will-change: transform;
    transform-origin: top center;
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

  .filter-select, .filter-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 0;
    font-size: 14px;
    font-family: 'SuisseIntl', sans-serif;
    font-weight: 300;
    color: #333;
    transition: all 0.15s ease;
    box-sizing: border-box; /* Ensure padding is included in width */
  }

  .filter-select:focus, .filter-input:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 8px rgba(52, 152, 219, 0.3);
  }

  .sort-container {
    display: flex;
    gap: 10px;
  }

  .order-select {
    width: 120px;
  }

  .filter-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
  }

  .reset-btn, .close-btn {
    padding: 8px 12px;
    background: transparent;
    border: 1px solid #ddd;
    border-radius: 0;
    cursor: pointer;
    font-family: 'ManifoldExtended', sans-serif;
    font-size: 13px;
    transition: all 0.15s ease;
  }

  .reset-btn:hover, .close-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .reset-btn {
    color: #f44336;
    border-color: #f44336;
  }

  .reset-btn:hover {
    background: rgba(244, 67, 54, 0.1);
  }

  .close-btn {
    color: #3498db;
    border-color: #3498db;
  }

  .close-btn:hover {
    background: rgba(52, 152, 219, 0.1);
  }

  /* Message styles */
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
    border-radius: 0;
    background: none;
    appearance: none;
    -webkit-appearance: none;
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
    transition: width 0.01s linear;
    z-index: 1;
    will-change: width;
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
</style>
