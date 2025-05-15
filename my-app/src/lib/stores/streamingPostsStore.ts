import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Define post types
export type Media = {
  id: string;
  postId: string;
  type: string;
  url: string;
  caption: string | null;
  position: number;
  uploadedAt: Date | string | number;
};

export type Author = {
  id: string;
  username: string;
};

export type Post = {
  id: string;
  text: string | null;
  authorId: string;
  createdAt: Date | string | number;
  isDeleted?: boolean;
  author: Author;
  media: Media[];
};

// Store state type
type StreamingPostsState = {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  currentPage: number;
};

// Initial state
const initialState: StreamingPostsState = {
  posts: [],
  loading: false,
  hasMore: true,
  error: null,
  currentPage: 1
};

// Create the store
function createStreamingPostsStore() {
  const { subscribe, update, set }: Writable<StreamingPostsState> = writable(initialState);

  // Abort controller for cancelling fetch requests
  let controller: AbortController | null = null;

  return {
    subscribe,

    // Reset the store
    reset: () => {
      // Cancel any ongoing requests
      if (controller) {
        controller.abort();
        controller = null;
      }

      set(initialState);
    },

    // Load posts with streaming
    loadPosts: async (endpoint: string, page: number = 1, limit: number = 5) => {
      // Cancel any ongoing requests
      if (controller) {
        controller.abort();
      }

      // Create a new abort controller
      controller = new AbortController();

      update(state => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(
          `${endpoint}/stream?page=${page}&limit=${limit}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the reader from the response body
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is null');
        }

        // Create a decoder for the stream
        const decoder = new TextDecoder();
        let buffer = '';

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and add it to the buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

          // Process each complete line
          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);

              // Handle different message types
              if (data.type === 'metadata') {
                update(state => ({
                  ...state,
                  hasMore: data.hasMore,
                  // If this is the first page, replace posts, otherwise append
                  posts: page === 1 ? [] : state.posts,
                  currentPage: page
                }));
              } else if (data.type === 'post') {
                update(state => ({
                  ...state,
                  posts: [...state.posts, data.post]
                }));
              } else if (data.type === 'error') {
                update(state => ({
                  ...state,
                  error: data.message,
                  loading: false
                }));
              } else if (data.type === 'complete') {
                update(state => ({
                  ...state,
                  loading: false
                }));
              }
            } catch (e) {
              console.error('Error parsing JSON:', e, line);
            }
          }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer);
            if (data.type === 'post') {
              update(state => ({
                ...state,
                posts: [...state.posts, data.post]
              }));
            }
          } catch (e) {
            console.error('Error parsing JSON:', e, buffer);
          }
        }

        // Mark loading as complete
        update(state => ({ ...state, loading: false }));
      } catch (e) {
        if (e.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Error loading posts:', e);
          update(state => ({
            ...state,
            error: e.message,
            loading: false
          }));
        }
      }
    },

    // Load more posts
    loadMore: function(endpoint: string, limit: number = 5) {
      const self = this;

      update(state => {
        // Don't load more if already loading or no more posts
        if (state.loading || !state.hasMore) {
          return state;
        }

        // Start loading more posts
        const nextPage = state.currentPage + 1;

        // Trigger the load
        setTimeout(() => {
          self.loadPosts(endpoint, nextPage, limit);
        }, 0);

        return { ...state, loading: true };
      });
    }
  };
}

// Create and export the store
export const streamingPostsStore = createStreamingPostsStore();
