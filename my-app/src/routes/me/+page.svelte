<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    
    export let data: PageData;
    // svelte-ignore export_let_unused
    export let form: any;
  
    // Client-side protection: If not logged in, redirect to /login
    function redirectIfLoggedOut() {
      if (browser && !$page.data.user) {
        goto('/login', { replaceState: true });
      }
    }
  
    onMount(() => {
      redirectIfLoggedOut();
  
      // Also check if page is restored from cache (back button, tab restore)
      const handler = () => redirectIfLoggedOut();
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    });
</script>

  <div class="dashboard">
    <header>
      <h1>Welcome, {data.user.username}!</h1>
      <div class="user-details">
        <p>Role: <strong>{data.user.role}</strong></p>
        <p>Account status: <span class={data.user.isActive ? 'active' : 'inactive'}>
          {data.user.isActive ? 'Active' : 'Inactive'}
        </span></p>
      </div>
      
      <div class="actions">
        <a href="/" class="button secondary">View Feed</a>
        <form action="/logout" method="POST">
          <button type="submit" class="button danger">Log Out</button>
        </form>
        
        {#if data.user.role === 'admin'}
          <a href="/admin/create-user" class="button primary">Create User</a>
        {/if}
      </div>
    </header>
    
    <section class="my-posts">
      <h2>My Posts</h2>
      
      {#if data.posts.length === 0}
        <div class="empty-state">
          <p>You haven't created any posts yet.</p>
          <a href="/create-post" class="button primary">Create Your First Post</a>
        </div>
      {:else}
        <div class="post-list">
          {#each data.posts as post (post.id)}
            <div class="post-card">
              <div class="post-preview">
                <h3>
                    {post.text 
                      ? (post.text.length > 50 
                          ? post.text.slice(0, 50) + '...' 
                          : post.text) 
                      : 'No text'}
                </h3>
                <p class="date">{new Date(post.createdAt).toLocaleDateString()}</p>
                
                {#if post.media && post.media.length > 0}
                  <div class="media-preview">
                    <img 
                      src={post.media[0].url} 
                      alt={post.media[0].caption || 'Post media'} 
                      class="thumbnail"
                    />
                    {#if post.media.length > 1}
                      <span class="media-count">+{post.media.length - 1}</span>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <div class="post-actions">
                <form 
                  method="POST" 
                  action="?/deletePost" 
                  use:enhance={() => {
                    return ({ result }) => {
                      if (result.type === 'success') {
                        // Optional: Show toast notification
                      }
                    }
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <button type="submit" class="button danger">Delete</button>
                </form>
                <a href={`/edit-post/${post.id}`} class="button secondary">Edit</a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
      
      <div class="create-post-action">
        <a href="/create-post" class="button primary">Create New Post</a>
      </div>
    </section>
  </div>
  
  <style>

  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eaeaea;
  }
  
  .user-details {
    margin: 1rem 0;
    display: flex;
    gap: 2rem;
  }
  
  .active {
    color: green;
    font-weight: bold;
  }
  
  .inactive {
    color: red;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    border: none;
    display: inline-block;
    text-align: center;
  }
  
  .primary {
    background-color: #4a86e8;
    color: white;
  }
  
  .secondary {
    background-color: #f0f0f0;
    color: #333;
  }
  
  .danger {
    background-color: #e53935;
    color: white;
  }
  
  .my-posts {
    margin-top: 2rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    background-color: #f9f9f9;
    border-radius: 8px;
  }
  
  .post-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .post-card {
    border: 1px solid #eaeaea;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
  }
  
  .post-preview {
    padding: 1.5rem;
    flex-grow: 1;
  }
  
  .post-preview h3 {
    margin-top: 0;
    font-size: 1.2rem;
  }
  
  .date {
    color: #666;
    font-size: 0.9rem;
  }
  
  .media-preview {
    position: relative;
    margin-top: 1rem;
  }
  
  .thumbnail {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 4px;
  }
  
  .media-count {
    position: absolute;
    right: 8px;
    bottom: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  
  .post-actions {
    display: flex;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background-color: #f9f9f9;
    border-top: 1px solid #eaeaea;
  }
  
  .post-actions form {
    margin: 0;
  }
  
  .create-post-action {
    margin-top: 2rem;
    text-align: center;
  }
  
  .button:hover {
    opacity: 0.9;
  }
  
  .primary:hover {
    background-color: #3b78e7;
  }
  
  .secondary:hover {
    background-color: #e0e0e0;
  }
  
  .danger:hover {
    background-color: #d32f2f;
  }
  
</style>