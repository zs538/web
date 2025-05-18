<script lang="ts">
  export let data;
  import PostsSection from '$lib/components/PostsSection.svelte';

  // Current user is already available in data from the server
  const currentUser = data.user;
</script>

<div class="myposts-container">
  <h1>My Posts</h1>
  {#if data.posts && data.posts.length === 0}
    <p class="no-posts-message">You haven't created any posts yet.</p>
    <a href="/create" class="create-post-link">Create your first post</a>
  {/if}

  <PostsSection
    apiEndpoint="/api/myposts"
    initialPosts={data.posts}
    {currentUser}
  />
</div>

<style>
  .myposts-container {
    width: 100%;
    max-width: 500px;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  .no-posts-message {
    margin-bottom: 1rem;
    color: #666;
  }

  .create-post-link {
    display: inline-block;
    padding: 0.5rem 1rem;
    background-color: #000;
    color: #fff;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .create-post-link:hover {
    background-color: #333;
  }
</style>
