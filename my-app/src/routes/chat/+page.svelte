<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';

  interface ChatMessage {
    id: string;
    message: string;
    authorId: string;
    createdAt: string;
    author: {
      id: string;
      username: string;
    };
  }

  let messages: ChatMessage[] = [];
  let newMessage = '';
  let loading = false;
  let loadingMore = false;
  let error: string | null = null;
  let messagesContainer: HTMLDivElement;
  let messageInput: HTMLInputElement;
  let hasMoreMessages = true;
  let currentOffset = 0;
  let isInitialLoad = true;

  // Get current user from page data
  $: currentUser = $page.data.user;

  // Load initial messages
  onMount(async () => {
    await loadMessages();
    // Auto-refresh messages every 5 seconds (only for new messages)
    const interval = setInterval(loadNewMessages, 5000);

    // Add scroll listener for infinite scrolling
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      clearInterval(interval);
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
      }
    };
  });

  async function loadMessages(offset = 0, limit = 50) {
    try {
      const response = await fetch(`/api/chat/stream?offset=${offset}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const reader = response.body?.getReader();
      if (!reader) return [];

      const decoder = new TextDecoder();
      const newMessages: ChatMessage[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'message') {
              newMessages.push(data.message);
            }
          } catch (e) {
            // Ignore malformed JSON
          }
        }
      }

      if (isInitialLoad) {
        messages = newMessages;
        currentOffset = newMessages.length;
        isInitialLoad = false;
        scrollToBottom();
      }

      return newMessages;
    } catch (err) {
      console.error('Error loading messages:', err);
      error = 'Failed to load messages';
      return [];
    }
  }

  async function loadNewMessages() {
    // Only load new messages, don't replace existing ones
    try {
      const newMessages = await loadMessages(0, 10);
      if (newMessages.length > 0) {
        // Check if we have new messages by comparing with latest message
        const latestMessageTime = messages.length > 0 ? new Date(messages[messages.length - 1].createdAt).getTime() : 0;
        const filteredNew = newMessages.filter(msg => new Date(msg.createdAt).getTime() > latestMessageTime);

        if (filteredNew.length > 0) {
          messages = [...messages, ...filteredNew];
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('Error loading new messages:', err);
    }
  }

  async function loadMoreMessages() {
    if (loadingMore || !hasMoreMessages) return;

    loadingMore = true;
    try {
      const olderMessages = await loadMessages(currentOffset, 20);

      if (olderMessages.length === 0) {
        hasMoreMessages = false;
      } else {
        // Store current scroll position
        const scrollHeight = messagesContainer.scrollHeight;
        const scrollTop = messagesContainer.scrollTop;

        // Add older messages to the beginning
        messages = [...olderMessages, ...messages];
        currentOffset += olderMessages.length;

        // Restore scroll position (adjust for new content)
        setTimeout(() => {
          const newScrollHeight = messagesContainer.scrollHeight;
          messagesContainer.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
        }, 0);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      loadingMore = false;
    }
  }

  function handleScroll() {
    if (!messagesContainer) return;

    // Check if user scrolled to top (with small threshold)
    if (messagesContainer.scrollTop < 100 && !loadingMore && hasMoreMessages) {
      loadMoreMessages();
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || loading) return;

    loading = true;
    error = null;

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      newMessage = '';
      messageInput.focus();
      
      // Reload messages to show the new one
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      error = err instanceof Error ? err.message : 'Failed to send message';
    } finally {
      loading = false;
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Global Chat - aicum</title>
</svelte:head>

<div class="chat-container">
  <div class="messages-container" bind:this={messagesContainer}>
    {#if loadingMore}
      <div class="loading-more">
        <p>Loading more messages...</p>
      </div>
    {/if}

    {#each messages as message (message.id)}
      <div class="message" class:own-message={message.authorId === currentUser?.id}>
        <div class="message-header">
          <span class="username">{message.author.username}</span>
          <span class="timestamp">{formatTime(message.createdAt)}</span>
        </div>
        <div class="message-content">
          {message.message}
        </div>
      </div>
    {/each}

    {#if messages.length === 0 && !loading}
      <div class="no-messages">
        <p>No messages yet. Be the first to say hello! 👋</p>
      </div>
    {/if}

    {#if loading && messages.length === 0}
      <div class="loading-initial">
        <p>Loading messages...</p>
      </div>
    {/if}
  </div>

  <div class="input-container">
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
    
    <div class="input-row">
      <input
        bind:this={messageInput}
        bind:value={newMessage}
        on:keypress={handleKeyPress}
        placeholder="Type your message..."
        disabled={loading}
        maxlength="1000"
      />
      <button on:click={sendMessage} disabled={loading || !newMessage.trim()}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 40px);
    max-width: 100%;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px 0 20px 0;
    display: flex;
    flex-direction: column;
  }

  .message {
    margin-bottom: 15px;
    padding: 10px;
    background: #1a1a1a;
    border-radius: 8px;
    border-left: 3px solid #444;
  }

  .message.own-message {
    background: #2a2a2a;
    border-left-color: #666;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }

  .username {
    font-weight: bold;
    color: #fff;
    font-size: 14px;
  }

  .timestamp {
    color: #888;
    font-size: 12px;
  }

  .message-content {
    color: #ddd;
    line-height: 1.4;
    word-wrap: break-word;
  }

  .no-messages {
    text-align: center;
    padding: 40px 20px;
    color: #888;
    margin: auto 0;
  }

  .loading-more {
    text-align: center;
    padding: 10px;
    color: #888;
    font-size: 14px;
    background: #1a1a1a;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .loading-initial {
    text-align: center;
    padding: 40px 20px;
    color: #888;
    margin: auto 0;
  }

  .input-container {
    border-top: 1px solid #333;
    padding: 20px 0 0 0;
    background: #000;
    position: sticky;
    bottom: 0;
  }

  .error-message {
    background: #ff4444;
    color: white;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .input-row {
    display: flex;
    gap: 10px;
  }

  .input-row input {
    flex: 1;
    padding: 12px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
  }

  .input-row input:focus {
    outline: none;
    border-color: #555;
  }

  .input-row input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input-row button {
    padding: 12px 20px;
    background: #333;
    border: 1px solid #555;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .input-row button:hover:not(:disabled) {
    background: #444;
  }

  .input-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Scrollbar styling */
  .messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
</style>
