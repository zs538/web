<script lang="ts">
  export let data;
  import PostsSection from '$lib/components/PostsSection.svelte';

  // Get current user from data
  const currentUser = data.user;
</script>

<main>
  <PostsSection
    apiEndpoint="/api/posts"
    initialPosts={data.posts}
    {currentUser}
  />
</main>