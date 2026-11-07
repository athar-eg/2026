/* أثر ATHAR — Service Worker */
const VERSION='athar-v1.6.6';
const SHELL = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-48.png',
  './assets/athar-logo.png'
];
/* خدمات Firebase والمصادقة لا تُخزَّن أبداً */
const BYPASS_HOSTS = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firebaseinstallations.googleapis.com', 'www.googleapis.com', 'apis.google.com', 'accounts.google.com', 'firebase.googleapis.com'];
/* مصادر ثابتة يُسمح بتخزينها (خطوط ومكتبات) */
const CACHE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const okToCache = (res) => res && (res.ok || res.type === 'opaque');

async function networkFirstPage(request) {
  const cache = await caches.open(VERSION);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(request, { signal: ctrl.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) ||
           (await cache.match('./index.html')) ||
           (await cache.match('./')) ||
           new Response('<!doctype html><meta charset="utf-8"><title>أثر</title><body style="font-family:sans-serif;background:#0d080a;color:#f4ece6;display:grid;place-items:center;height:100vh;margin:0"><p>أنت غير متصل بالإنترنت. أعد المحاولة عند عودة الاتصال.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const fetching = fetch(request, { cache: 'no-cache' }).then((res) => {
    if (okToCache(res)) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await fetching) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (BYPASS_HOSTS.includes(url.hostname) || url.pathname.includes('/__/auth')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(req));
    return;
  }
  if (url.origin === self.location.origin || CACHE_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
