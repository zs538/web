import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the HTML file
    const htmlPath = path.resolve('src/routes/cleanup.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Return the HTML content
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  } catch (err) {
    console.error('Error serving cleanup page:', err);
    throw error(500, 'Failed to serve cleanup page');
  }
}
