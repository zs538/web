<script lang="ts">
  import PostComponent from './Post.svelte';
  
  type PostWithRelations = {
  id: string;
  text: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  
  // Relations
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null; // Allow both undefined and null
    bio?: string | null;
    // Add other author fields that might be nullable
  };
  media: Array<{
    id: string;
    postId: string;
    type: string;
    url: string;
    caption: string | null;
    position: number;
    uploadedAt: Date;
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
    max-width: 670px;  /* Tumblr-like width */
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