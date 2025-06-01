<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeAudioPlayer } from '$lib/stores/audioPlayerStore';

  // Props
  export let src: string;
  export let title: string = '';
  export let preload: 'none' | 'metadata' | 'auto' = 'metadata';

  // State variables
  let audio: HTMLAudioElement;
  let isPlaying = false;
  let duration = 0;
  let currentTime = 0;
  let seekValue = 0;
  let volume = 1;
  let isMuted = false;
  let volumeValue = 100;
  let showVolumeSlider = false;
  let volumeTimeout: ReturnType<typeof setTimeout>;
  let animationFrame: number;
  let isHovering = false;
  let isRepeating = false;

  // Format time in MM:SS format
  function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Toggle play/pause
  function togglePlay(): void {
    if (isPlaying) {
      audio.pause();
    } else {
      // Before playing this audio, pause any currently playing audio
      activeAudioPlayer.update(currentActive => {
        if (currentActive && currentActive !== src) {
          // Find and pause the currently active audio player
          const activeAudio = document.querySelector(`audio[src="${currentActive}"]`) as HTMLAudioElement;
          if (activeAudio && !activeAudio.paused) {
            activeAudio.pause();
          }
        }
        return src; // Set this audio as the new active player
      });

      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }

  // Handle seek change
  function handleSeek(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    audio.currentTime = value;
    seekValue = value;

    // Update seek slider progress
    const percent = duration > 0 ? (value / duration) * 100 : 0;
    const slider = target as HTMLElement;
    slider.style.setProperty('--seek-percent', `${percent}%`);
  }

  // Toggle mute
  function toggleMute(): void {
    audio.muted = !audio.muted;
    isMuted = audio.muted;

    // Find the volume slider in this specific audio player
    const volumeSlider = document.querySelector(`.audio-player:has(audio[src="${src}"]) .volume-slider`) as HTMLElement;
    if (volumeSlider) {
      if (isMuted) {
        volumeSlider.style.setProperty('--volume-percent', '0%');
      } else {
        volumeSlider.style.setProperty('--volume-percent', `${volumeValue}%`);
      }
    }
  }

  // Toggle repeat
  function toggleRepeat(): void {
    isRepeating = !isRepeating;
  }

  // Handle volume change
  function handleVolumeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    volumeValue = value;
    volume = value / 100;
    audio.volume = volume;

    isMuted = volume === 0;
    audio.muted = isMuted;

    // Update volume slider for this specific instance
    target.style.setProperty('--volume-percent', `${value}%`);
  }

  // Show volume slider
  function showVolume(): void {
    showVolumeSlider = true;
    if (volumeTimeout) clearTimeout(volumeTimeout);
  }

  // Hide volume slider with delay
  function hideVolume(): void {
    if (volumeTimeout) clearTimeout(volumeTimeout);
    volumeTimeout = setTimeout(() => {
      showVolumeSlider = false;
    }, 400); // Hide after 400ms
  }

  // Update time display during playback
  function updateTimeDisplay(): void {
    if (!audio) {
      animationFrame = requestAnimationFrame(updateTimeDisplay);
      return;
    }

    currentTime = audio.currentTime;
    seekValue = currentTime;

    // Update seek slider progress
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Find the seek slider in this specific audio player
    const seekSlider = document.querySelector(`.audio-player:has(audio[src="${src}"]) .seek-slider`) as HTMLElement;
    if (seekSlider) {
      seekSlider.style.setProperty('--seek-percent', `${percent}%`);
    }

    animationFrame = requestAnimationFrame(updateTimeDisplay);
  }

  // Lifecycle hooks
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    if (volumeTimeout) {
      clearTimeout(volumeTimeout);
    }
    // Clear this audio from active player if it was the active one
    activeAudioPlayer.update(currentActive => {
      return currentActive === src ? null : currentActive;
    });
  });

  // Event handlers for audio element
  function handleLoadedMetadata(): void {
    duration = audio.duration;

    // Find the sliders in this specific audio player
    const container = document.querySelector(`.audio-player:has(audio[src="${src}"])`) as HTMLElement;
    if (container) {
      const seekSlider = container.querySelector('.seek-slider') as HTMLElement;
      const volumeSlider = container.querySelector('.volume-slider') as HTMLElement;

      if (seekSlider) {
        seekSlider.style.setProperty('--seek-percent', '0%');
      }

      if (volumeSlider) {
        volumeSlider.style.setProperty('--volume-percent', '100%');
      }
    }

    // Initialize volume
    audio.volume = volume;
  }

  function handlePlay(): void {
    isPlaying = true;
    // Set this audio as the active player when it starts playing
    activeAudioPlayer.set(src);
    updateTimeDisplay();
  }

  function handlePause(): void {
    isPlaying = false;
    // Clear this audio from active player if it was the active one
    activeAudioPlayer.update(currentActive => {
      return currentActive === src ? null : currentActive;
    });
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  }

  function handleEnded(): void {
    if (isRepeating) {
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('Error repeating audio:', error);
      });
    } else {
      isPlaying = false;
      // Clear this audio from active player when it ends
      activeAudioPlayer.update(currentActive => {
        return currentActive === src ? null : currentActive;
      });
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    }
  }

  // Handle hover state
  function handleMouseEnter(): void {
    isHovering = true;
  }

  function handleMouseLeave(): void {
    isHovering = false;
  }
</script>

<div class="audio-player">
  <!-- Hidden native audio element -->
  <audio
    bind:this={audio}
    {src}
    {preload}
    on:loadedmetadata={handleLoadedMetadata}
    on:play={handlePlay}
    on:pause={handlePause}
    on:ended={handleEnded}
  ></audio>

  <!-- Custom player UI -->
  <div class="player-container">
    <!-- Cover/thumbnail with play/pause button -->
    <button
      class="cover-container"
      on:mouseenter={handleMouseEnter}
      on:mouseleave={handleMouseLeave}
      on:click={togglePlay}
      on:keydown={(e) => e.key === 'Enter' && togglePlay()}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      <div class="cover">
        <!-- Music note icon -->
        <svg class="music-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor" />
        </svg>
      </div>

      <!-- Play/Pause overlay -->
      <div class="play-overlay" class:visible={isHovering}>
        {#if isPlaying}
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <rect x="6" y="4" width="4" height="16" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" fill="currentColor" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <polygon points="8,5 19,12 8,19" fill="currentColor" />
          </svg>
        {/if}
      </div>
    </button>

    <!-- Controls section -->
    <div class="controls-section">
      <!-- Title -->
      <div class="audio-title" title={title}>{title}</div>

      <!-- Time display -->
      <div class="time-display">
        <span class="current-time">{formatTime(currentTime)}</span>
        <span class="time-separator">/</span>
        <span class="duration">{formatTime(duration)}</span>
      </div>

      <!-- Seek and volume controls -->
      <div class="sliders-container">
        <!-- Seek slider -->
        <div class="seek-container">
          <input
            type="range"
            class="seek-slider"
            min="0"
            max={duration || 100}
            step="0.01"
            value={seekValue}
            on:input={handleSeek}
            aria-label="Seek"
          />
        </div>

        <!-- Repeat button -->
        <button
          class="repeat-button"
          class:active={isRepeating}
          on:click={toggleRepeat}
          aria-label={isRepeating ? 'Disable repeat' : 'Enable repeat'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor" />
          </svg>
        </button>

        <!-- Volume controls -->
        <div
          class="volume-container"
          class:volume-active={showVolumeSlider}
          on:mouseenter={showVolume}
          on:mouseleave={hideVolume}
          role="group"
          aria-label="Volume controls"
        >
          <button
            class="volume-button"
            on:click={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {#if isMuted || volume === 0}
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor" />
              </svg>
            {/if}
          </button>

          <div class="volume-slider-container">
            <input
              type="range"
              class="volume-slider"
              min="0"
              max="100"
              step="1"
              value={volumeValue}
              on:input={handleVolumeChange}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .audio-player {
    width: 100%;
    background-color: #f5f5f5;
    border: none;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .player-container {
    display: flex;
    align-items: stretch;
    height: 69px; /* Adjusted height for the player */
  }

  /* Cover/thumbnail styles */
  .cover-container {
    width: 69px; /* Adjusted to match the new height */
    height: 69px; /* Adjusted to match the new height */
    position: relative;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover {
    width: 100%;
    height: 100%;
    background-color: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .music-icon {
    color: #666;
    opacity: 0.8;
  }

  .play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
    color: white;
  }

  .play-overlay.visible {
    opacity: 1;
  }

  /* Controls section styles */
  .controls-section {
    flex: 1;
    padding: 6px 10px 4px 10px; /* Adjusted padding: 6px top, 4px bottom, 10px left and right */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0; /* Allow flex item to shrink below its content size */
    overflow: hidden; /* Prevent overflow from this container */
  }

  .audio-title {
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
    margin-bottom: 1px;
    padding-top: 0;
  }

  .time-display {
    font-size: 0.75rem;
    color: #666;
    white-space: nowrap;
    margin-bottom: 0;
  }

  .time-separator {
    margin: 0 2px;
  }

  .sliders-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0; /* Remove space above sliders to fit everything better */
  }

  .seek-container {
    flex: 1;
    position: relative;
    height: 20px;
    display: flex;
    align-items: center;
  }

  .seek-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #dadce0;
    outline: none;
    border-radius: 0;
    cursor: pointer;
  }

  .seek-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .seek-slider:hover::-webkit-slider-thumb {
    opacity: 1;
  }

  .seek-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .seek-slider:hover::-moz-range-thumb {
    opacity: 1;
  }

  .seek-slider::-webkit-slider-runnable-track {
    background: linear-gradient(to right, #333 var(--seek-percent, 0%), #dadce0 var(--seek-percent, 0%));
    height: 100%;
    border-radius: 0;
  }

  .seek-slider::-moz-range-track {
    background: linear-gradient(to right, #333 var(--seek-percent, 0%), #dadce0 var(--seek-percent, 0%));
    height: 100%;
    border-radius: 0;
  }

  /* Repeat button styles */
  .repeat-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;
    padding: 0;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    margin-right: 0px;
  }

  .repeat-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .repeat-button.active {
    color: #333;
  }

  /* Volume control styles */
  .volume-container {
    display: flex;
    align-items: center;
    position: relative;
    width: 24px;
    transition: width 0.3s ease;
    overflow: hidden;
  }

  .volume-container.volume-active {
    width: 100px;
  }

  .volume-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #000;
    padding: 0;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .volume-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .volume-slider-container {
    width: 0;
    overflow: hidden;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    opacity: 0;
  }

  .volume-container.volume-active .volume-slider-container {
    width: 70px;
    margin-left: 6px;
    opacity: 1;
  }

  .volume-slider {
    width: 70px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #dadce0;
    outline: none;
    border-radius: 0;
    cursor: pointer;
    margin: 2px 0;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
    opacity: 1;
  }

  .volume-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    opacity: 1;
  }

  .volume-slider::-webkit-slider-runnable-track {
    background: linear-gradient(to right, #333 var(--volume-percent, 100%), #dadce0 var(--volume-percent, 100%));
    height: 100%;
    border-radius: 0;
  }

  .volume-slider::-moz-range-track {
    background: linear-gradient(to right, #333 var(--volume-percent, 100%), #dadce0 var(--volume-percent, 100%));
    height: 100%;
    border-radius: 0;
  }

  @media (max-width: 400px) {
    .time-display {
      font-size: 0.7rem;
    }

    .audio-title {
      font-size: 0.8rem;
    }

    .volume-container.volume-active {
      width: 90px;
    }

    .volume-container.volume-active .volume-slider-container {
      width: 60px;
    }
  }
</style>
