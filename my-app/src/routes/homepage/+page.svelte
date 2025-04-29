<script>
  export let data;
</script>

<h1>Homepage Feed</h1>

{#each data.posts as post}
  <article>
    <h2>{post.text}</h2>
    <p>By user ID: {post.authorId}</p>
    <!-- You can add more post details here, such as createdAt, etc. -->
  </article>
{/each}