<script lang="ts">
    export let data;
    import PostsSection from '$lib/components/PostsSection.svelte';
  </script>
  
  <main>
    <PostsSection posts={data.posts} />
  </main>