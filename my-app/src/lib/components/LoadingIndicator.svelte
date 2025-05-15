<script lang="ts">
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let text: string | null = null;
  export let centered: boolean = true;
</script>

<div class="loading-container" class:centered>
  <div class="spinner {size}"></div>
  {#if text}
    <div class="loading-text">{text}</div>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }
  
  .centered {
    justify-content: center;
    min-height: 200px;
  }
  
  .spinner {
    border-radius: 50%;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: #000;
    animation: spin 0.8s linear infinite;
  }
  
  .small {
    width: 20px;
    height: 20px;
  }
  
  .medium {
    width: 30px;
    height: 30px;
  }
  
  .large {
    width: 40px;
    height: 40px;
  }
  
  .loading-text {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
