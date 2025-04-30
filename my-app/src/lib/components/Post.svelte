<script>
  export let post;
</script>

<article class="post">
  <!-- Media at the top, no captions shown -->
  {#if post.media && post.media.length > 0}
    <div class="media-container">
      {#each post.media as media}
        <div class="media-item">
          {#if media.type === 'image'}
            <img src={media.url} alt="" />
          {:else if media.type === 'video'}
            <video controls src={media.url}>
              <track kind="captions" label="English" srclang="en" />
            </video>
          {:else if media.type === 'audio'}
            <audio controls src={media.url}></audio>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Text below the media -->
  {#if post.text}
    <div class="post-text">
      {post.text}
    </div>
  {/if}

  <!-- Username signature below the text, right-aligned -->
  <div class="post-signature">
    -{post.author?.username}
  </div>
</article>

<style>
  .post {
    margin-bottom: 20px;
    border: 1px solid #000;
  }

  .media-container {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
  }
  
  .media-item {
    width: 100%;
  }
  
  .media-item img,
  .media-item video {
    width: 100%;
    max-height: 540px;
    object-fit: contain;
    display: block;
  }
  
  .media-item audio {
    width: 100%;
    display: block;
  }
  
  .post-text {
    border-top: 1px solid #000;
    margin: 10px 0;
  }
  
  .post-signature {
    text-align: right;
    font-style: italic;
    margin-top: 5px;
  }
</style>