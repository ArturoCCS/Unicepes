import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const baseUrl = import.meta.env.SITE_URL || site || 'http://localhost:4321/';
  const sitemap = new URL('sitemap-index.xml', baseUrl).href;
  
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemap}`,
    ''
  ].join('\n');

  return new Response(body, { 
    headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
  });
};