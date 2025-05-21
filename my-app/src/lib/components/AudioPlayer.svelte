<script lang="ts">
  import { onDestroy } from 'svelte';

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
    document.documentElement.style.setProperty('--seek-percent', `${percent}%`);
  }

  // Toggle mute
  function toggleMute(): void {
    audio.muted = !audio.muted;
    isMuted = audio.muted;

    if (isMuted) {
      document.documentElement.style.setProperty('--volume-percent', '0%');
    } else {
      document.documentElement.style.setProperty('--volume-percent', `${volumeValue}%`);
    }
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

    document.documentElement.style.setProperty('--volume-percent', `${value}%`);
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
    }, 2000); // Hide after 2 seconds
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
    document.documentElement.style.setProperty('--seek-percent', `${percent}%`);

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
  });

  // Event handlers for audio element
  function handleLoadedMetadata(): void {
    duration = audio.duration;
    document.documentElement.style.setProperty('--seek-percent', '0%');
    document.documentElement.style.setProperty('--volume-percent', '100%');

    // Initialize volume
    audio.volume = volume;
  }

  function handlePlay(): void {
    isPlaying = true;
    updateTimeDisplay();
  }

  function handlePause(): void {
    isPlaying = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  }

  function handleEnded(): void {
    isPlaying = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
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
      <div class="audio-title">{title}</div>

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
                <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
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
    border-radius: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .player-container {
    display: flex;
    align-items: stretch;
    height: 60px;
  }

  /* Cover/thumbnail styles */
  .cover-container {
    width: 60px;
    height: 60px;
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
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .audio-title {
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'ManifoldExtendedCF-Medium', sans-serif;
    color: #333;
    margin-bottom: 2px;
  }

  .time-display {
    font-size: 0.75rem;
    color: #666;
    font-family: 'ManifoldExtendedCF-Medium', sans-serif;
    white-space: nowrap;
    margin-bottom: 4px;
  }

  .time-separator {
    margin: 0 2px;
  }

  .sliders-container {
    display: flex;
    align-items: center;
    gap: 8px;
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
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #333;
    border-radius: 50%;
    cursor: pointer;
    border: none;
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

    .volume-container.volume-active {
      width: 90px;
    }

    .volume-container.volume-active .volume-slider-container {
      width: 60px;
    }
  }
</style>
