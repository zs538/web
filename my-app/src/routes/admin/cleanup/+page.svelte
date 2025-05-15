<script lang="ts">
  export let data;

  let isLoading = false;
  let result: { success: boolean; message: string; deletedCount: number } | null = null;
  let error: string | null = null;

  async function cleanupDeletedPosts() {
    if (isLoading) return;

    try {
      isLoading = true;
      error = null;
      result = null;

      const response = await fetch('/api/admin/cleanup-deleted-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Always try to parse the response, even if it's an error
      const responseData = await response.json().catch(e => {
        console.error('Failed to parse response:', e);
        return { success: false, message: 'Invalid response from server' };
      });

      if (response.ok && responseData.success) {
        result = responseData;
        // Refresh the page after successful cleanup to update the count
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        error = responseData.message || responseData.error || 'Failed to clean up deleted posts';
        console.error('API Error:', responseData);
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
      error = 'An unexpected error occurred';
    } finally {
      isLoading = false;
    }
  }
</script>

<main>
  <div class="admin-header">
    <h1>Admin: Cleanup Deleted Posts</h1>
  </div>

  <div class="admin-content">
    <div class="info-panel">
      <h2>Soft-Deleted Posts</h2>
      <p>
        There {data.deletedPostsCount === 1 ? 'is' : 'are'} currently
        <strong>{data.deletedPostsCount}</strong>
        post{data.deletedPostsCount !== 1 ? 's' : ''} marked as deleted in the database.
      </p>

      {#if data.deletedPostsCount > 0}
        <div class="warning">
          <p><strong>Warning:</strong> This operation will permanently delete all posts that were previously marked as deleted. This action cannot be undone.</p>
        </div>

        <button
          class="cleanup-button"
          on:click={cleanupDeletedPosts}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Permanently Delete All Soft-Deleted Posts'}
        </button>
      {:else}
        <p>There are no soft-deleted posts to clean up.</p>
      {/if}
    </div>

    {#if result}
      <div class="result-panel success">
        <h3>Operation Complete</h3>
        <p>{result.message}</p>
        {#if result.deletedCount > 0}
          <p>Permanently deleted {result.deletedCount} post{result.deletedCount !== 1 ? 's' : ''}.</p>
        {/if}
      </div>
    {/if}

    {#if error}
      <div class="result-panel error">
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    {/if}

    <div class="back-link">
      <a href="/admin/log">Back to Admin</a>
    </div>
  </div>
</main>

<style>
  .admin-header {
    margin-bottom: 2rem;
  }

  .admin-content {
    background: white;
    padding: 1.5rem;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .info-panel {
    margin-bottom: 1.5rem;
  }

  .warning {
    background-color: #fff3cd;
    color: #856404;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
  }

  .cleanup-button {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s;
  }

  .cleanup-button:hover:not(:disabled) {
    background-color: #c82333;
  }

  .cleanup-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }

  .result-panel {
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 4px;
  }

  .success {
    background-color: #d4edda;
    color: #155724;
  }

  .error {
    background-color: #f8d7da;
    color: #721c24;
  }

  .back-link {
    margin-top: 2rem;
  }

  .back-link a {
    color: #007bff;
    text-decoration: none;
  }

  .back-link a:hover {
    text-decoration: underline;
  }
</style>
