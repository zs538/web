<script lang="ts">
  import { enhance } from '$app/forms';
  import { slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { navigate } from '$lib/utils/navigation';
  import { onMount } from 'svelte';

  // Define media item types for TypeScript
  type MediaItemData = {
    file?: File;
    preview?: string;
    name?: string;
    url?: string;
    domain?: string;
    timestamp?: number; // Add timestamp for uniqueness
  };

  type MediaItem = {
    type: string;
    data: MediaItemData | null;
    showEmbedInput?: boolean;
    embedUrl?: string;
  };

  // Media types we support
  const ALLOWED_MEDIA_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav']
  };

  // Allowed embed domains
  const ALLOWED_EMBED_DOMAINS = [
    'youtube.com', 'youtu.be',
    'vimeo.com',
    'soundcloud.com',
    'spotify.com',
    'music.apple.com'
  ];

  // Maximum file size (15MB)
  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  // Maximum character count for post text
  const MAX_CHARS = 900;

  // Media items array
  let mediaItems: MediaItem[] = [{ type: 'empty', data: null, showEmbedInput: false }];

  // Post text
  let postText = '';
  let textareaElement: HTMLTextAreaElement;
  let hasScroll = false;

  // Check if textarea has scrollable content
  function checkTextareaScroll(): void {
    if (textareaElement) {
      // Check if the scrollHeight is greater than the clientHeight
      hasScroll = textareaElement.scrollHeight > textareaElement.clientHeight;
    }
  }

  // Run initial check when component mounts
  onMount((): (() => void) => {
    // No initial check needed as you mentioned there won't be scrolling on load

    // Add event listener for resize
    window.addEventListener('resize', checkTextareaScroll);

    // Add event listener for the textarea's resize event
    const resizeObserver = new ResizeObserver((): void => {
      checkTextareaScroll();
    });

    if (textareaElement) {
      resizeObserver.observe(textareaElement);
    }

    // Cleanup
    return (): void => {
      window.removeEventListener('resize', checkTextareaScroll);
      resizeObserver.disconnect();
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
    };
  });

  // Drag state
  let draggedIndex = -1;
  let dragStartY = 0;
  let dragCurrentY = 0;
  let containerTop = 0;
  let containerBottom = 0;

  // Handle file upload
  function handleFileUpload(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Check file type
    let mediaType: string | null = null;
    for (const [type, mimeTypes] of Object.entries(ALLOWED_MEDIA_TYPES)) {
      if (mimeTypes.includes(file.type)) {
        mediaType = type;
        break;
      }
    }

    if (!mediaType) {
      alert('Unsupported file type');
      return;
    }

    // Create file preview
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      mediaItems[index] = {
        type: mediaType as string,
        data: {
          file,
          preview: typeof result === 'string' ? result : undefined,
          name: file.name,
          timestamp: Date.now() // Add timestamp for uniqueness
        }
      };

      // Add new empty row if we have less than 4 items
      if (mediaItems.length < 4 && !mediaItems.some(item => item.type === 'empty')) {
        mediaItems = [...mediaItems, { type: 'empty', data: null, showEmbedInput: false }];
      }

      mediaItems = [...mediaItems]; // Trigger reactivity
    };
    reader.readAsDataURL(file);
  }

  // Handle embed
  function handleEmbed(index: number, url?: string): void {
    if (!url) return;

    try {
      const embedUrl = new URL(url);
      const domain = embedUrl.hostname.replace('www.', '');

      // Check if domain is allowed
      if (!ALLOWED_EMBED_DOMAINS.some(allowed => domain.includes(allowed))) {
        alert('This embed domain is not supported');
        return;
      }

      mediaItems[index] = {
        type: 'embed',
        data: {
          url,
          domain
        }
      };

      // Add new empty row if we have less than 4 items
      if (mediaItems.length < 4 && !mediaItems.some(item => item.type === 'empty')) {
        mediaItems = [...mediaItems, { type: 'empty', data: null, showEmbedInput: false }];
      }

      mediaItems = [...mediaItems]; // Trigger reactivity
    } catch (e) {
      alert('Invalid URL');
    }
  }

  // Remove media item
  function removeItem(index: number): void {
    mediaItems.splice(index, 1);

    // If we removed all items, add an empty one
    if (mediaItems.length === 0) {
      mediaItems = [{ type: 'empty', data: null, showEmbedInput: false }];
    }
    // If we have fewer than 4 items and no empty row, add one
    else if (mediaItems.length < 4 && !mediaItems.some(item => item.type === 'empty')) {
      mediaItems = [...mediaItems, { type: 'empty', data: null, showEmbedInput: false }];
    }

    mediaItems = [...mediaItems]; // Trigger reactivity
  }

  // Reference to the media container
  let mediaContainer: HTMLElement;

  // Ghost element for dragging
  let ghostElement: HTMLElement | null = null;

  // Start dragging
  function startDrag(event: MouseEvent, index: number): void {
    // Only handle non-empty items
    if (mediaItems[index].type === 'empty') return;

    // Get the element being dragged
    const originalElement = (event.currentTarget as HTMLElement).closest('.media-row') as HTMLElement;
    if (!originalElement) return;

    // Store the initial drag position
    draggedIndex = index;
    dragStartY = event.clientY;
    dragCurrentY = event.clientY;

    // Create a ghost element that will follow the cursor
    ghostElement = originalElement.cloneNode(true) as HTMLElement;
    document.body.appendChild(ghostElement);

    // Style the ghost element
    const rect = originalElement.getBoundingClientRect();
    ghostElement.style.position = 'fixed';

    // Position the ghost element centered on the cursor
    ghostElement.style.top = (event.clientY - rect.height / 2) + 'px';
    ghostElement.style.left = rect.left + 'px';
    ghostElement.style.width = rect.width + 'px';
    ghostElement.style.height = rect.height + 'px';
    ghostElement.style.zIndex = '1000';
    ghostElement.style.pointerEvents = 'none'; // So it doesn't interfere with mouse events
    ghostElement.style.opacity = '1';
    ghostElement.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
    ghostElement.style.border = '1px solid #3498db';
    ghostElement.style.background = '#ffffff';
    ghostElement.classList.add('ghost-element');

    // Hide the original element
    originalElement.style.opacity = '0';

    // Get only the active media rows (not the empty one)
    const activeRows = Array.from(mediaContainer.querySelectorAll('.media-row:not(.empty-row-container)'));

    // Calculate container bounds based only on active rows
    if (activeRows.length > 0) {
      const firstRow = activeRows[0] as HTMLElement;
      const lastRow = activeRows[activeRows.length - 1] as HTMLElement;

      // Set top bound to the top of the first row
      containerTop = firstRow.getBoundingClientRect().top;

      // Set bottom bound to the bottom of the last row
      containerBottom = lastRow.getBoundingClientRect().bottom - rect.height;
    } else {
      // Fallback if there are no active rows (shouldn't happen)
      const containerRect = mediaContainer.getBoundingClientRect();
      containerTop = containerRect.top;
      containerBottom = containerRect.bottom - rect.height;
    }

    // Add event listeners for mouse movement and release
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent default to avoid text selection during drag
    event.preventDefault();
  }

  // Handle mouse movement during drag
  function handleMouseMove(event: MouseEvent): void {
    if (!ghostElement) return;

    // Update the current Y position
    dragCurrentY = event.clientY;

    // Update the position of the ghost element
    updateGhostPosition(dragCurrentY);

    // Check if we need to reorder items
    checkForReordering(dragCurrentY);
  }

  // Update the position of the ghost element
  function updateGhostPosition(clientY: number): void {
    if (!ghostElement) return;

    // Calculate the new Y position - directly follow the cursor
    // We subtract half the height of the element to center it on the cursor
    const ghostHeight = ghostElement.offsetHeight;
    let newY = clientY - (ghostHeight / 2);

    // Constrain to container bounds
    newY = Math.max(containerTop, Math.min(newY, containerBottom));

    // Apply the new position
    ghostElement.style.top = newY + 'px';
  }

  // Debounce timer for reordering to prevent too frequent updates
  let reorderingDebounceTimer: number | null = null;
  let lastReorderTargetIndex = -1;

  // Check if we need to reorder items based on current position
  function checkForReordering(clientY: number): void {
    if (draggedIndex === -1) return;

    // Get all media rows that are not empty
    const mediaRows = Array.from(mediaContainer.querySelectorAll('.media-row:not(.empty-row-container)'));

    let targetIndex = -1;

    // Find the row we're hovering over
    for (let i = 0; i < mediaRows.length; i++) {
      const row = mediaRows[i] as HTMLElement;

      // Skip if this is the row we're dragging (it's hidden but still in the DOM)
      const rowIndex = parseInt(row.dataset.index || '0', 10);
      if (rowIndex === draggedIndex) continue;

      const rect = row.getBoundingClientRect();
      const rowMiddle = rect.top + rect.height / 2;

      // Determine if we're in the top or bottom half of the row
      if (clientY < rowMiddle && clientY > rect.top) {
        // We're in the top half - insert before this row
        targetIndex = rowIndex;
        break;
      } else if (clientY > rowMiddle && clientY < rect.bottom) {
        // We're in the bottom half - insert after this row
        targetIndex = rowIndex + 1;
        break;
      }
    }

    // If we found a valid target
    if (targetIndex !== -1) {
      // Only reorder if we're moving to a different position
      if (targetIndex !== draggedIndex && targetIndex !== draggedIndex + 1) {
        // Clear any existing debounce timer
        if (reorderingDebounceTimer !== null) {
          clearTimeout(reorderingDebounceTimer);
        }

        // Use a much shorter debounce time for better responsiveness
        reorderingDebounceTimer = setTimeout(() => {
          // Reorder items
          const item = mediaItems[draggedIndex];
          const newItems = [...mediaItems];
          newItems.splice(draggedIndex, 1);
          newItems.splice(targetIndex > draggedIndex ? targetIndex - 1 : targetIndex, 0, item);

          // Update the array and the dragged index
          mediaItems = newItems;
          draggedIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;

          // Store the last target index
          lastReorderTargetIndex = targetIndex;

          // Clear the timer reference
          reorderingDebounceTimer = null;
        }, 10) as unknown as number; // Much shorter delay for better responsiveness
      }
    }
  }

  // Handle mouse up to end dragging
  function handleMouseUp(): void {
    if (!ghostElement) return;

    // Remove the ghost element
    document.body.removeChild(ghostElement);
    ghostElement = null;

    // Show all rows again
    const mediaRows = Array.from(mediaContainer.querySelectorAll('.media-row'));
    mediaRows.forEach(row => {
      (row as HTMLElement).style.opacity = '1';
    });

    // Clear any pending reordering timer
    if (reorderingDebounceTimer !== null) {
      clearTimeout(reorderingDebounceTimer);
      reorderingDebounceTimer = null;
    }

    // Reset drag state
    draggedIndex = -1;
    lastReorderTargetIndex = -1;

    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  // Form submission status
  let isSubmitting = false;
  export let form: any;

  // Get valid media items
  $: validMediaItems = mediaItems.filter(item => item.type !== 'empty');

  // Check for scrolling whenever postText changes
  $: {
    postText; // This creates a dependency on postText
    // Use setTimeout to ensure the DOM has updated
    setTimeout(checkTextareaScroll, 0);
  }

  // Add a mutation observer to detect style changes (for manual resizing)
  let mutationObserver: MutationObserver;

  $: if (textareaElement && !mutationObserver) {
    mutationObserver = new MutationObserver((mutations: MutationRecord[]): void => {
      // Check if any of the mutations affected the style attribute
      const styleChanged = mutations.some(
        (mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'style'
      );

      if (styleChanged) {
        checkTextareaScroll();
      }
    });

    // Start observing the textarea for attribute changes
    mutationObserver.observe(textareaElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
</script>

<div class="create-post-container">
  <h1>Create Post</h1>

  <form
    method="POST"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result, update }) => {
        // Keep isSubmitting true until we're ready to navigate
        await update();

        // If the post was created successfully, redirect to home page
        if (result.type === 'success' && result.data?.success) {
          // Use navigate function for smoother transition
          // We'll keep the button in "Posting..." state until navigation completes
          await navigate('/');
        } else {
          // Only reset isSubmitting if there was an error
          isSubmitting = false;
        }
      };
    }}
  >
    <!-- Text Area -->
    <div class="text-area-container">
      <textarea
        bind:value={postText}
        bind:this={textareaElement}
        placeholder="What's on your mind?"
        maxlength={MAX_CHARS}
        required
        on:input={checkTextareaScroll}
        on:scroll={checkTextareaScroll}
        on:mouseup={checkTextareaScroll}
      ></textarea>
      <div class="char-counter {postText.length === MAX_CHARS ? 'at-limit' : ''} {hasScroll ? 'has-scroll' : ''}">
        {postText.length}/{MAX_CHARS}
      </div>
    </div>

    <!-- Media Items -->
    <div class="media-container" bind:this={mediaContainer} role="list" aria-label="Media items">
      {#each mediaItems as item, index (item.type === 'empty' ? `empty-${index}` : (item.data?.timestamp || item.data?.domain || `item-${index}`))}
        <div
          class="media-row {item.type === 'empty' ? 'empty-row-container' : ''}"
          animate:flip={{ duration: 200, delay: 0, easing: quintOut }}
          transition:slide={{ duration: 150, easing: quintOut }}
          data-index={index}
          data-key={item.type === 'empty' ? 'empty' : (item.data?.timestamp || item.data?.domain || index)}
          role="listitem"
          aria-label="Media item"
        >
          {#if item.type === 'empty'}
            <div class="empty-row">
              <button
                type="button"
                class="upload-btn"
                on:click={() => {
                  // Create a new file input element each time to ensure we can select the same file
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = Object.values(ALLOWED_MEDIA_TYPES).flat().join(',');
                  fileInput.style.display = 'none';
                  fileInput.onchange = (e) => handleFileUpload(e, index);
                  document.body.appendChild(fileInput);
                  fileInput.click();
                  // Remove the element after click to prevent memory leaks
                  setTimeout(() => {
                    document.body.removeChild(fileInput);
                  }, 1000);
                }}
              >
                Upload
              </button>
              <span class="separator">|</span>
              <button type="button" class="embed-btn" on:click={() => {
                mediaItems[index] = { ...mediaItems[index], showEmbedInput: true };
                mediaItems = [...mediaItems]; // Trigger reactivity
              }}>
                Embed
              </button>

              {#if item.showEmbedInput}
                <div class="embed-input" transition:slide>
                  <input
                    type="url"
                    placeholder="Paste media URL (YouTube, SoundCloud, etc.)"
                    bind:value={item.embedUrl}
                  />
                  <button
                    type="button"
                    class="embed-confirm-btn"
                    on:click={() => handleEmbed(index, item.embedUrl)}
                  >
                    Add
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <div class="media-item-row">
              <!-- Drag Handle -->
              <div
                class="drag-handle"
                on:mousedown={(e) => startDrag(e, index)}
                role="button"
                aria-label="Drag to reorder"
                tabindex="0"
              >
                ⠿
              </div>

              <!-- Preview -->
              <div class="media-preview">
                {#if item.type === 'image' && item.data}
                  <div class="image-preview">
                    <img src={item.data.preview} alt={item.data.name || 'Image'} />
                    <span class="filename">{item.data.name || 'Image file'}</span>
                  </div>
                {:else if item.type === 'video' && item.data}
                  <div class="video-preview">
                    <span class="play-icon">▶</span>
                    <span class="filename">{item.data.name || 'Video file'}</span>
                  </div>
                {:else if item.type === 'audio' && item.data}
                  <div class="audio-preview">
                    <span class="audio-icon">♪</span>
                    <span class="filename">{item.data.name || 'Audio file'}</span>
                  </div>
                {:else if item.type === 'embed' && item.data}
                  <div class="embed-preview">
                    <span class="embed-icon">🔗</span>
                    <span class="embed-url">{item.data.domain || 'Embed'}</span>
                  </div>
                {/if}
              </div>

              <!-- Remove Button -->
              <button
                type="button"
                class="remove-btn"
                on:click={() => removeItem(index)}
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Hidden fields for server processing -->
    <input type="hidden" name="postText" value={postText} />
    <input type="hidden" name="mediaCount" value={validMediaItems.length} />

    {#each validMediaItems as item, i}
      <input type="hidden" name="mediaType_{i}" value={item.type} />
      <input type="hidden" name="mediaPosition_{i}" value={i} />

      {#if item.type === 'embed' && item.data}
        <input type="hidden" name="mediaUrl_{i}" value={item.data.url || ''} />
        <input type="hidden" name="mediaCaption_{i}" value={item.data.domain || ''} />
      {:else if item.data}
        <!-- For uploaded files, we'll need to handle this server-side -->
        <input type="hidden" name="mediaUrl_{i}" value={item.data.preview || ''} />
        <input type="hidden" name="mediaCaption_{i}" value={item.data.name || ''} />
      {/if}
    {/each}

    <!-- Submit Button -->
    <div class="submit-container">
      <button type="submit" class="submit-btn" disabled={isSubmitting || !postText.trim()}>
        {#if isSubmitting}
          Posting...
        {:else}
          Post
        {/if}
      </button>

      {#if form?.error}
        <div class="error-message" transition:slide>
          {form.error}
        </div>
      {/if}
    </div>
  </form>
</div>

<style>
  /* Apply box-sizing to all elements */
  :global(*) {
    box-sizing: border-box;
  }

  .create-post-container {
    width: 100%;
    max-width: 500px;
    padding: 0;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  .text-area-container {
    position: relative;
    margin-bottom: 1.5rem;
  }

  textarea {
    width: 100%;
    min-height: 180px;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 0;
    resize: vertical;
    font-family: 'SuisseIntl', sans-serif;
    font-size: 1.1rem;
    line-height: 1.5;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  textarea:focus {
    outline: none;
    border: 1px dashed #3498db;
    background-color: #f0f7fc;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  .char-counter {
    position: absolute;
    bottom: 0.8rem;  /* Increased from 0.5rem to 0.8rem (3px more) */
    right: 1.2rem;  /* Moved further left from 0.8rem to 1.2rem */
    font-size: 0.8rem;
    color: #888;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  /* Add white background only when textarea has scroll */
  .char-counter.has-scroll {
    background-color: #ffffff; /* Fully opaque white */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .char-counter.at-limit {
    color: #e74c3c;
  }

  .char-counter.at-limit.has-scroll {
    background-color: #fff0f0; /* Fully opaque light red */
  }

  .media-container {
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .media-row {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: #f9f9f9;
    border: 1px solid #eee;
  }

  /* Styles for the dragged element */
  :global(.dragging) {
    opacity: 0.8;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    border: 1px dashed #3498db !important;
    background-color: #f0f7fc !important;
    position: relative;
    z-index: 10;
  }

  /* No drop target indicators - removed */

  /* Ghost element styles */
  :global(.ghost-element) {
    cursor: grabbing !important;
    transition: none !important;
  }

  :global(.ghost-element *) {
    pointer-events: none !important;
  }

  /* Add transition for smooth movement with better easing */
  .media-row {
    transition: all 0.15s cubic-bezier(0.2, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  /* Disable animation for dragged element */
  :global(.dragging) {
    transition: none !important;
    animation: none !important;
  }

  .empty-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .upload-btn, .embed-btn {
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    padding: 0.5rem;
    font-family: inherit;
  }

  .upload-btn:hover, .embed-btn:hover {
    color: #000;
  }

  .separator {
    color: #ccc;
    margin: 0 0.5rem;
  }

  .embed-input {
    width: 100%;
    margin-top: 0.75rem;
    display: flex;
    box-sizing: border-box;
  }

  .embed-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
  }

  .embed-confirm-btn {
    padding: 0.5rem 1rem;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-left: none;
    cursor: pointer;
  }

  .media-item-row {
    display: flex;
    align-items: center;
  }

  .drag-handle {
    cursor: grab;
    padding: 0 0.75rem;
    color: #aaa;
    font-size: 1.2rem;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .media-preview {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .media-preview img, .image-preview img {
    max-height: 60px;
    max-width: 80px;
    object-fit: contain;
    margin-right: 0.75rem;
  }

  .image-preview, .video-preview, .audio-preview, .embed-preview {
    display: flex;
    align-items: center;
  }

  .play-icon, .audio-icon, .embed-icon {
    margin-right: 0.5rem;
    font-size: 1.2rem;
  }

  .filename {
    font-size: 0.9rem;
    color: #555;
    word-break: break-word;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0.5rem;
    font-size: 1.1rem;
  }

  .remove-btn:hover {
    color: #e74c3c;
  }

  .submit-container {
    text-align: right;
  }

  .submit-btn {
    padding: 0.75rem 0; /* Remove horizontal padding since we're using fixed width */
    background: #333;
    color: white;
    border: none;
    cursor: pointer;
    font-family: inherit;
    width: 110px; /* Reduced fixed width */
    text-align: center; /* Ensure text is centered */
    transition: background-color 0.15s ease; /* Smooth transition for hover state */
  }

  .submit-btn:hover {
    background: #555;
  }

  .submit-btn:disabled {
    background: #999;
    cursor: not-allowed;
  }

  .error-message {
    color: #e74c3c;
    margin-top: 0.75rem;
    text-align: right;
    font-size: 0.9rem;
  }
</style>
