<script lang="ts">
  import { hoverInfo } from '$lib/stores/hoverStore';

  $: info = $hoverInfo;
</script>

<div class="info-bar">
  <div class="info-content">
    <!-- Basic post information -->
    <div class="info-section">
      <div class="info-item">
        <span class="label">Username:</span>
        <span class="value">{info?.username || '-'}</span>
      </div>
      <div class="info-item">
        <span class="label">Date:</span>
        <span class="value">{info?.date || '-'}</span>
      </div>
      <div class="info-item">
        <span class="label">Time:</span>
        <span class="value">{info?.time || '-'}</span>
      </div>

      <div class="info-item">
        <span class="label">Type:</span>
        <span class="value">{info?.types?.join(', ') || '-'}</span>
      </div>
    </div>

    <!-- Media-specific information -->
    <div class="info-section media-section">
      {#if info?.media?.format || info?.media?.type}
        <div class="info-item">
          <span class="label">Media:</span>
          <span class="value">{info.media.format || info.media.type}</span>
        </div>
      {/if}

      {#if info?.media?.title}
        <div class="info-item">
          <span class="label">Title:</span>
          <span class="value">{info.media.title}</span>
        </div>
      {/if}

      {#if info?.media?.resolution}
        <div class="info-item">
          <span class="label">Resolution:</span>
          <span class="value">{info.media.resolution}</span>
        </div>
      {/if}

      {#if info?.media?.duration}
        <div class="info-item">
          <span class="label">Duration:</span>
          <span class="value">{info.media.duration}</span>
        </div>
      {/if}

      {#if info?.media?.size}
        <div class="info-item">
          <span class="label">Size:</span>
          <span class="value">{info.media.size}</span>
        </div>
      {/if}

      {#if info?.media?.source}
        <div class="info-item">
          <span class="label">Source:</span>
          <span class="value">{info.media.source}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .info-bar {
    position: fixed;
    left: calc(50% + 250px); /* Position on the right side of main content */
    top: 0;
    width: 180px;
    height: 100vh;
    background-color: #fff;
    padding: 0 20px 20px 20px;
    margin-top: 48px; /* Match top bar height */
    border-top: 1px solid #ddd;
    box-sizing: border-box;
    z-index: 50;
    overflow-y: auto;
    font-family: 'ManifoldExtended', sans-serif;
  }

  .info-content {
    padding-top: 16px;
  }

  .info-section {
    margin-bottom: 20px;
  }

  .media-section {
    border-top: 1px solid #eee;
    padding-top: 16px;
  }

  .info-item {
    margin-bottom: 8px;
    font-size: 12px;
    line-height: 1.4;
  }

  .label {
    color: #666;
    font-weight: normal;
    display: block;
    margin-bottom: 2px;
  }

  .value {
    color: #000;
    font-weight: normal;
    word-break: break-word;
    display: block;
  }




</style>
