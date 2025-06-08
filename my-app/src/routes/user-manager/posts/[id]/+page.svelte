<script lang="ts">
  import PostsSection from '$lib/components/PostsSection.svelte';

  // Get data from server
  export let data;

  // The target user whose posts we're viewing
  const targetUser = data.targetUser || data.user;

  // The posts by the target user
  const initialPosts = data.posts || [];
</script>

<div class="user-posts">
  <h1>Posts by {targetUser.username}</h1>
  <a href="/user-manager" class="back-link">← Back to User Manager</a>

  {#if initialPosts.length === 0}
    <div class="empty-state">
      <p>This user hasn't created any posts yet.</p>
    </div>
  {:else}
    <PostsSection
      apiEndpoint={`/api/users/${targetUser.id}/posts`}
      {initialPosts}
    />
  {/if}
</div>

<style>
  .user-posts {
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

  .back-link {
    display: inline-block;
    margin-bottom: 2rem;
    color: #666;
    text-decoration: none;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
    color: #666;
  }
</style>
