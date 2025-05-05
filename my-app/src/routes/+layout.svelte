<script lang="ts">
    import NavBar from '$lib/components/NavBar.svelte';
  </script>
  
  <NavBar />
  
  <main>
    <slot />
  </main>
  
  <style>
    main {
      min-height: 80vh;
      background: #f7f8fa;
      padding-bottom: 32px;
    }
  </style>