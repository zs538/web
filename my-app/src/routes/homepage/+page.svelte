<script>
  import PostsSection from '$lib/components/PostsSection.svelte';
  export let data; // Provided by +page.server.ts
</script>

<h1>Homepage Feed</h1>
<PostsSection posts={data.posts} />
