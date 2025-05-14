<script lang="ts">
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

  // Utility for readable timestamp
  function formatDate(ts: Date | string | number) {
    return new Date(ts).toLocaleString();
  }
</script>

<article class="post">
  <!-- Media Gallery -->
  {#if post.media?.length > 0}
    <div class="media-container">
      {#each post.media as media}
        <div class="media-item">
          {#if media.type === 'image'}
            <img src={media.url} alt={media.caption || 'Image'} />
          {:else if media.type === 'video'}
            <video controls src={media.url}>
              <track kind="captions" label="Captions" />
            </video>
          {:else if media.type === 'audio'}
            <audio controls src={media.url}></audio>
          {:else if media.type === 'embed'}
            <iframe
              src={media.url}
              frameborder="0"
              allowfullscreen
              style="width:100%; min-height:320px"
              title={media.caption || "Embed"}>
            </iframe>
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
  </div>
</article>

<style>
  .post {
    margin-bottom: 24px;
    border-radius: 0px;
    padding: 12px 16px;
    background: #fff;
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
  }

  .media-item img,
  .media-item video,
  .media-item iframe {
    width: 100%;
    max-height: 400px;
    object-fit: contain;
    border-radius: 0px;
    background: #f6f6f6;
    display: block; /* Removes any bottom spacing */
  }
  .media-item audio {
    width: 100%;
    display: block;
  }

  .post-text {
    margin: 10px 0;
    font-size: 1.1em;
    line-height: 1.7;
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
</style>
