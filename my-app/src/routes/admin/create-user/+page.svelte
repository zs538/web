<script lang="ts">
    export let form: any;
  </script>
  
  <h1>Create New User</h1>
  <form method="POST">
    <label>
      Username
      <input name="username" required />
    </label>
    <label>
      Password
      <input name="password" type="password" required />
    </label>
    <label>
      Role
      <select name="role">
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </label>
    {#if form?.message}
      <div class="error">{form.message}</div>
    {/if}
    {#if form?.success}
      <div class="success">User created!</div>
    {/if}
    <button type="submit">Create</button>
  </form>
  
  <style>
    form { display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
    input, select { width: 100%; }
    .error { color: #d00 }
    .success { color: #080 }
  </style>