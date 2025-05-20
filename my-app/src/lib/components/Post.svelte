<script lang="ts">
  import { onMount } from 'svelte';
  import { activeDeleteConfirm } from '$lib/stores/deleteConfirmStore';
  import MediaEmbed from './MediaEmbed.svelte';
  import AudioPlayer from './AudioPlayer.svelte';

  export let post: {
    id: string;
    text: string | null;
    author: { id: string; username: string };
    createdAt: Date | string | number;
    media: Array<{
      id: string;
      type: string;
      url: string;
      caption: string | null;
      position: number;
    }>;
  };

  // Current user data for authorization
  export let currentUser: { id: string; role: string } | null = null;

  // Check if user can delete this post
  $: canDelete = currentUser && (
    // Admin can delete any post
    currentUser.role === 'admin' ||
    // Regular user can only delete their own posts
    currentUser.id === post.author.id
  );

  // Derive showDeleteConfirm from the store value
  $: showDeleteConfirm = $activeDeleteConfirm === post.id;

  // Toggle delete confirmation dialog
  function toggleDeleteConfirm() {
    // If this post's confirmation is already showing, hide it
    // Otherwise, show this post's confirmation (which automatically hides others)
    $activeDeleteConfirm = showDeleteConfirm ? null : post.id;
  }

  // Error state for deletion
  let deleteError = '';
  let isDeleting = false;

  // Delete the post permanently
  async function deletePost() {
    if (!canDelete) return;

    isDeleting = true;
    deleteError = '';

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Dispatch a custom event to notify parent component
        const event = new CustomEvent('postDeleted', {
          detail: { postId: post.id },
          bubbles: true
        });
        document.dispatchEvent(event);
        // Clear the active delete confirmation
        $activeDeleteConfirm = null;
      } else {
        const errorData = await response.json();
        console.error('Error deleting post:', errorData);
        deleteError = errorData.message || 'Failed to delete post';
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      deleteError = 'Network error. Please try again.';
    } finally {
      isDeleting = false;
    }
  }

  // Utility for readable timestamp
  function formatDate(ts: Date | string | number) {
    return new Date(ts).toLocaleString();
  }

  // Handle media aspect ratios after component mounts
  onMount(() => {
    // Use IntersectionObserver to lazy load and process images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          // Set the actual src only when the image is in view
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.onload = () => checkImageAspectRatio(img);
            imageObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '200px' }); // Load images when they're within 200px of the viewport

    // Use IntersectionObserver to lazy load videos
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target as HTMLVideoElement;
          if (!video.dataset.src) return;

          // Set preload to metadata to get dimensions first
          video.preload = 'metadata';
          video.src = video.dataset.src;

          // When metadata is loaded, set the container size
          video.onloadedmetadata = () => {
            const mediaItem = video.closest('.media-item');
            if (mediaItem) {
              // Apply aspect ratio class based on video dimensions
              const aspectRatio = video.videoWidth / video.videoHeight;
              applyAspectRatioClass(mediaItem, aspectRatio);

              // Set fixed height based on aspect ratio to prevent layout shifts
              const containerWidth = mediaItem.clientWidth;
              const calculatedHeight = containerWidth / aspectRatio;
              (mediaItem as HTMLElement).style.height = `${calculatedHeight}px`;

              // Create a simple resize handler
              const resizeHandler = () => {
                const newWidth = (mediaItem as HTMLElement).clientWidth;
                const newHeight = newWidth / aspectRatio;
                (mediaItem as HTMLElement).style.height = `${newHeight}px`;
              };

              // Add resize listener
              window.addEventListener('resize', resizeHandler);

              // Clean up when video is removed
              video.addEventListener('emptied', () => {
                window.removeEventListener('resize', resizeHandler);
              });
            }

            videoObserver.unobserve(video);
          };
        }
      });
    }, { rootMargin: '200px' }); // Load videos when they're within 200px of the viewport

    // Observe all images
    const images = document.querySelectorAll('.post img[data-src]') as NodeListOf<HTMLImageElement>;
    images.forEach(img => imageObserver.observe(img));

    // Observe all videos
    const videos = document.querySelectorAll('.post video[data-src]') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => videoObserver.observe(video));

    return () => {
      // Clean up observers when component is destroyed
      imageObserver.disconnect();
      videoObserver.disconnect();
    };
  });

  // Helper function to apply aspect ratio classes to any media element
  function applyAspectRatioClass(element: Element, aspectRatio: number) {
    // Clear any existing classes
    element.classList.remove('wide-media', 'tall-media', 'square-media', 'very-tall-media');

    // Apply appropriate class based on aspect ratio
    if (aspectRatio > 1.5) {
      // Wide media (landscape)
      element.classList.add('wide-media');
    } else if (aspectRatio < 0.33) {
      // Very tall media (greater than 1:3 ratio)
      element.classList.add('very-tall-media');
    } else if (aspectRatio < 0.67) {
      // Tall media (portrait)
      element.classList.add('tall-media');
    } else {
      // Roughly square media
      element.classList.add('square-media');
    }
  }

  // Check image aspect ratio and apply appropriate class
  function checkImageAspectRatio(img: HTMLImageElement) {
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const mediaItem = img.closest('.media-item');
    if (!mediaItem) return;
    applyAspectRatioClass(mediaItem, aspectRatio);
  }
</script>

<article class="post">
  <!-- Media Gallery -->
  {#if post.media?.length > 0}
    <div class="media-container">
      {#each post.media as media}
        <div class="media-item">
          {#if media.type === 'image'}
            <img
              data-src={media.url}
              alt={media.caption || 'Image'}
              loading="lazy"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
            />
          {:else if media.type === 'video'}
            <video
              controls
              data-src={media.url}
              preload="none"
              class="video-element"
            >
              <track kind="captions" label="Captions" />
            </video>
          {:else if media.type === 'audio'}
            <AudioPlayer
              src={media.url}
              title={media.caption || 'Audio'}
              preload="metadata"
            />
          {:else if media.type === 'embed'}
            <MediaEmbed
              url={media.url}
              title={media.caption || "Embedded content"}
            />
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Post Text -->
  {#if post.text}
    <div class="post-text suisse-font">
      {post.text}
    </div>
  {/if}

  <!-- Author and Timestamp -->
  <div class="post-signature">
    —{post.author?.username} <span class="separator">|</span> <span class="timestamp">{formatDate(post.createdAt)}</span>

    <!-- Delete button - only shown if user can delete this post -->
    {#if canDelete}
      <div class="delete-container">
        <button class="delete-button" class:active={showDeleteConfirm} on:click={toggleDeleteConfirm} aria-label="Delete post">
          <img src="/x-icon.svg" alt="Delete" class="x-icon" />
        </button>
      </div>
    {/if}
  </div>

  <!-- Delete confirmation - appears under signature when delete button is clicked -->
  <div class="delete-confirm-container" class:show={showDeleteConfirm}>
    {#if deleteError}
      <div class="delete-error">{deleteError}</div>
    {:else}
      <div class="delete-confirm-message">
        <span>Are you sure?</span>
        <button
          class="delete-confirm-button"
          on:click={deletePost}
          disabled={isDeleting}
        >
          {#if isDeleting}
            Deleting...
          {:else}
            Delete
          {/if}
        </button>
      </div>
    {/if}
  </div>
</article>

<style>
  .post {
    margin-bottom: 24px;
    border-radius: 0px;
    padding: 12px 16px 10px 16px;
    background: #fff;
    position: relative;
  }

  .post::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: #eaeaea;
  }

  .media-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 10px;
  }

  .media-item {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 0px;
    overflow: hidden;
    transform: translateZ(0); /* Helps with rendering the shadow */
    margin: 4px 0;
    width: 100%;
    background: #f6f6f6;
  }

  .media-item img,
  .media-item video {
    width: 100%;
    /* No default max-height to allow images to fill width */
    object-fit: contain; /* Default to contain to prevent cropping */
    border-radius: 0px;
    background: #f6f6f6;
    display: block; /* Removes any bottom spacing */
  }

  /* Video styling - simple and clean */
  .media-item video.video-element {
    object-fit: contain;
    width: 100%;
    display: block;
  }

  /* Wide media (landscape) */
  :global(.media-item.wide-media) img,
  :global(.media-item.wide-media) video {
    object-fit: cover;
    width: 100%;
  }

  /* Square-ish media */
  :global(.media-item.square-media) img,
  :global(.media-item.square-media) video {
    object-fit: contain;
    width: 100%;
  }

  /* Tall media (portrait) */
  :global(.media-item.tall-media) img,
  :global(.media-item.tall-media) video {
    object-fit: contain;
    width: 100%;
  }

  /* Very tall media (greater than 1:3 ratio) */
  :global(.media-item.very-tall-media) img,
  :global(.media-item.very-tall-media) video {
    object-fit: contain;
    max-height: 800px;
    width: 100%;
  }

  /* Styling for audio player and embeds */
  :global(.media-item .audio-player) {
    width: 100%;
    display: block;
  }

  .post-text {
    margin: 10px 0;
    font-size: 1.1em;
    line-height: 1.7;
    overflow-wrap: break-word; /* Break long words */
    word-wrap: break-word; /* Legacy property for IE support */
    word-break: break-word; /* More elegant breaking than break-all */
    hyphens: auto; /* Add hyphens when breaking words */
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    white-space: pre-wrap; /* Preserve whitespace and newlines */
  }

  .post-signature {
    text-align: right;
    font-size: 0.93em;
    color: #888;
    font-style: italic;
    margin-top: 6px;
  }
  .post-signature .separator {
    margin: 0 6px;
    color: #ccc;
    font-style: normal;
  }

  .post-signature .timestamp {
    font-size: 0.8em;
    color: #bbb;
    font-style: normal;
  }

  /* Delete button styling */
  .delete-container {
    display: inline-block;
    margin-left: 10px;
    vertical-align: middle;
  }

  .delete-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .x-icon {
    width: 10px;
    height: 10px;
    display: block;
    color: #999;
    transition: transform 0.25s ease;
    transform: rotate(0deg);
  }

  .delete-button:hover .x-icon {
    filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(100%);
  }

  .delete-button.active .x-icon {
    transform: rotate(45deg);
  }

  /* Delete confirmation styling */
  .delete-confirm-container {
    text-align: right;
    margin-top: 0;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: all 0.25s ease;
  }

  .delete-confirm-container.show {
    max-height: 40px; /* Slightly larger to ensure content fits */
    opacity: 1;
    margin-top: 10px;
    pointer-events: auto;
  }

  .delete-confirm-message {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    font-size: 0.75em;
    color: #aaa;
    font-style: italic;
  }

  .delete-confirm-button {
    background-color: transparent;
    color: #888;
    font-size: 0.7em;
    font-weight: 400;
    padding: 1px 8px;
    margin-top: 1px;
    border: 1px solid #ccc;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .delete-confirm-button:hover {
    color: #ff3b30;
    border-color: #ff3b30;
  }

  .delete-error {
    color: #ff3b30;
    font-size: 0.75em;
    font-weight: 400;
    text-align: right;
  }
</style>
