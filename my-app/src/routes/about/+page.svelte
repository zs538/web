<section class="about-container">
    <h1>About iK</h1>
    <p>
      <strong>iK</strong> is a minimalist, public social feed inspired by Tumblr.<br>
      Built for rapid prototyping with SvelteKit and Drizzle ORM.<br>
      The focus: fast, simple multimedia sharing with easy admin tools.
    </p>
    <ul>
      <li>Infinite scroll public feed</li>
      <li>Images, video, audio, and embeds</li>
      <li>Secure login (no public registration)</li>
      <li>Admin-ready moderation and audit log</li>
      <li>No likes, no comments, no profiles</li>
    </ul>
    <hr>
    <p style="font-size: 0.95em; color: #888;">
      Prototype — powered by <a href="https://kit.svelte.dev/" target="_blank">SvelteKit</a>
    </p>
  </section>
  
  <style>
    .about-container {
      max-width: 540px;
      margin: 40px auto 0 auto;
      padding: 2.5rem 2rem 2rem 2rem;
      text-align: center;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 3px 22px 0 #23294008;
    }
    .about-container h1 {
      margin-bottom: 0.7em;
      color: #283549;
      font-size: 2rem;
    }
    .about-container ul {
      margin: 2em auto 1.7em auto;
      line-height: 1.7;
      font-size: 1.11em;
      display: inline-block;
      text-align: left;
    }
    .about-container a {
      color: #1486ff;
      text-decoration: none;
      transition: color 0.15s;
    }
    .about-container a:hover {
      color: #1b5bad;
      text-decoration: underline;
    }
    hr {
      margin: 2em auto 1em auto;
      border: none;
      border-top: 1px solid #eee;
      width: 60%;
    }
  </style>