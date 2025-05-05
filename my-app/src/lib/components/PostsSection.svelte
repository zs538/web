<script lang="ts">
  import PostComponent from './Post.svelte';

  // Updated type: user has only id and username, matches latest schema
  type PostWithRelations = {
    id: string;
    text: string | null;
    authorId: string;
    createdAt: Date | string | number;
    isDeleted: boolean;
    author: {
      id: string;
      username: string;
    };
    media: Array<{
      id: string;
      postId: string;
      type: string; // image, video, audio, embed
      url: string;
      caption: string | null;
      position: number;
      uploadedAt: Date | string | number;
    }>;
  };

  export let posts: PostWithRelations[];
</script>

<section class="posts-section">
  {#if posts.length === 0}
    <div class="empty-state">
      <p>No posts available at the moment.</p>
    </div>
  {:else}
    <div class="posts-container">
      {#each posts as post (post.id)}
        <PostComponent {post} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .posts-section {
    max-width: 540px;  /* Tumblr-like width */
    margin: 0 auto;    /* Center in page */
    padding: 0 10px;   /* Small side padding for mobile */
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: #666;
  }
  
  .posts-container {
    display: flex;
    flex-direction: column;
    gap: 20px;         /* Space between posts */
  }
</style>