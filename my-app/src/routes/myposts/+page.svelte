<script lang="ts">
  export let data;
  import PostsSection from '$lib/components/PostsSection.svelte';
</script>

<main>
  <div class="my-posts-header">
    <h1>My Posts</h1>
    {#if data.posts && data.posts.length === 0}
      <p class="no-posts-message">You haven't created any posts yet.</p>
      <a href="/create" class="create-post-link">Create your first post</a>
    {/if}
  </div>

  <PostsSection
    apiEndpoint="/api/myposts"
    initialPosts={data.posts}
  />
</main>

<style>
  .my-posts-header {
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
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
