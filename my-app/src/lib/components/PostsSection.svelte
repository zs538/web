<script context="module">
  // Intersection Observer directive
  export function intersectionObserver(node: HTMLElement, options: { callback: (entries: IntersectionObserverEntry[]) => void; rootMargin?: string; threshold?: number }) {
    const { callback, rootMargin = '0px', threshold = 0 } = options;

    const observer = new IntersectionObserver(
      callback,
      { rootMargin, threshold }
    );

    observer.observe(node);

    return {
      destroy() {
        observer.disconnect();
      }
    };
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import PostComponent from './Post.svelte';
  import LoadingIndicator from './LoadingIndicator.svelte';

  // Define post type
  type Media = {
    id: string;
    postId: string;
    type: string;
    url: string;
    caption: string | null;
    position: number;
    uploadedAt: Date | string | number;
  };

  type Author = {
    id: string;
    username: string;
  };

  type Post = {
    id: string;
    text: string | null;
    authorId: string;
    createdAt: Date | string | number;
    isDeleted?: boolean;
    author: Author;
    media: Media[];
  };

  // Props
  export let apiEndpoint: string = '/api/posts'; // Default endpoint for main page
  export let initialPosts: Post[] = []; // Initial posts from server (optional)

  // Local state
  let scrollContainer: HTMLElement;
  let loading = true;
  let hasMore = true;
  let posts: Post[] = [];
  let newlyLoadedPostIds: string[] = [];

  // Initialize with posts
  onMount(() => {
    // If we have initial posts, use them
    if (initialPosts && initialPosts.length > 0) {
      posts = initialPosts;
      loading = false;
    } else {
      // Otherwise, load posts from API
      loadInitialPosts();
    }

    // Bind scroll container
    scrollContainer = document.documentElement;
  });

  // Load initial posts
  async function loadInitialPosts() {
    try {
      loading = true;

      const response = await fetch(`${apiEndpoint}?page=1&limit=5`);
      const data = await response.json();

      if (data.posts) {
        posts = data.posts;
        hasMore = data.hasMore || false;
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      loading = false;
    }
  }

  // Load more posts when user scrolls to bottom
  async function loadMorePosts() {
    if (loading || !hasMore) return;

    try {
      loading = true;

      // Calculate next page
      const nextPage = Math.ceil(posts.length / 5) + 1;

      const response = await fetch(`${apiEndpoint}?page=${nextPage}&limit=5`);
      const data = await response.json();

      if (data.posts && data.posts.length > 0) {
        // Track new post IDs for animation
        const newPostIds = data.posts.map((post: Post) => post.id);
        newlyLoadedPostIds = [...newPostIds];

        // Add new posts to the list
        posts = [...posts, ...data.posts];

        // Check if we have more posts to load
        hasMore = data.hasMore || false;

        // Clear animation flags after delay
        setTimeout(() => {
          newlyLoadedPostIds = [];
        }, 2000);
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      loading = false;
    }
  }


</script>

<section class="posts-section">
  {#if loading && posts.length === 0}
    <!-- Show loading indicator during initial load -->
    <LoadingIndicator size="medium" text="Loading posts..." centered={true} />
  {:else if posts.length === 0}
    <div class="empty-state">
      <p>No posts available at the moment.</p>
    </div>
  {:else}
    <div class="posts-container">
      <!-- Regular post list instead of virtual list -->
      {#each posts as post, index (post.id)}
        <div
          class="post-wrapper"
          class:fade-in={newlyLoadedPostIds.includes(post.id)}
          style="animation-delay: {(index % 5) * 100}ms"
        >
          <PostComponent {post} />
        </div>
      {/each}

      <!-- Loading indicator for more posts -->
      {#if loading && posts.length > 0}
        <div class="loading-more">
          <LoadingIndicator size="small" centered={false} />
        </div>
      {/if}

      <!-- Infinite scroll trigger -->
      {#if hasMore}
        <div
          class="scroll-trigger"
          use:intersectionObserver={{ callback: entries => {
            const [entry] = entries;
            if (entry.isIntersecting && !loading) {
              loadMorePosts();
            }
          }}}
        ></div>
      {/if}
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

  .post-wrapper {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }

  .fade-in {
    animation: fadeInPost 0.8s ease forwards;
  }

  .loading-more {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .scroll-trigger {
    height: 20px;
    width: 100%;
    margin-top: 20px;
  }

  @keyframes fadeInPost {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
