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
  let loading = true;
  let hasMore = true;
  let posts: Post[] = [];
  let newlyLoadedPostIds: string[] = [];

  /**
   * Reactive statement to handle changes to initialPosts
   * This ensures the component always uses the latest data from the server
   */
  $: if (initialPosts && initialPosts.length > 0) {
    posts = initialPosts;
    loading = false;
    hasMore = true; // Reset hasMore to ensure infinite scroll works
  }

  /**
   * Initialize component and set up event listeners
   */
  onMount(() => {
    // Reset state on mount to avoid stale data
    posts = [];

    // Use server-provided data if available, otherwise fetch from API
    if (initialPosts && initialPosts.length > 0) {
      posts = initialPosts;
      loading = false;
    } else {
      loadInitialPosts();
    }


  });

  /**
   * Load initial batch of posts from the API
   * Uses cache-busting and proper error handling
   */
  async function loadInitialPosts() {
    try {
      loading = true;
      posts = []; // Clear existing posts to avoid duplicates

      // Fetch posts with cache-busting to prevent stale data
      const cacheBuster = `_cb=${Date.now()}`;
      const response = await fetch(`${apiEndpoint}?page=1&limit=5&${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.posts?.length > 0) {
        // Ensure we have unique posts by ID
        const uniquePosts = data.posts.filter((p: Post, index: number, self: Post[]) =>
          index === self.findIndex((t: Post) => t.id === p.id)
        );

        posts = uniquePosts;
        hasMore = Boolean(data.hasMore);
      } else {
        posts = [];
        hasMore = false;
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      posts = [];
      hasMore = false;
    } finally {
      loading = false;
    }
  }

  /**
   * Load more posts when user scrolls to bottom
   * Handles pagination, cache-busting, and duplicate detection
   */
  async function loadMorePosts() {
    if (loading || !hasMore) return;

    try {
      loading = true;

      // Calculate next page based on current posts count
      const pageSize = 5;
      const nextPage = Math.ceil(posts.length / pageSize) + 1;

      // Fetch next batch of posts with cache-busting
      const cacheBuster = `_cb=${Date.now()}`;
      const response = await fetch(`${apiEndpoint}?page=${nextPage}&limit=${pageSize}&${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.posts?.length > 0) {
        // Filter out any posts we already have to prevent duplicates
        const existingPostIds = new Set(posts.map(p => p.id));
        const uniqueNewPosts = data.posts.filter((p: Post) => !existingPostIds.has(p.id));

        if (uniqueNewPosts.length === 0) {
          // If all returned posts are duplicates, stop infinite scroll
          hasMore = false;
          return;
        }

        // Track new post IDs for animation
        newlyLoadedPostIds = uniqueNewPosts.map((post: Post) => post.id);

        // Add new posts to the list
        posts = [...posts, ...uniqueNewPosts];

        // Update hasMore flag based on API response
        hasMore = Boolean(data.hasMore);

        // Clear animation flags after delay
        setTimeout(() => {
          newlyLoadedPostIds = [];
        }, 2000);
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      // Don't change hasMore on error to allow retrying
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
    /* Removed gap - posts will handle their own spacing with margins */
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
