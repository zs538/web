<script lang="ts">
    import type { Post } from '$lib/server/db/schema';
    import PostComponent from './Post.svelte'; // Use regular import and a different local name
    export let posts: Post[];
  </script>
  
  <section>
    {#each posts as post}
      <PostComponent {post} />
    {/each}
  </section>