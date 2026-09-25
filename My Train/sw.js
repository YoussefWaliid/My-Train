// Service Worker - دليل قطارات القليوبية
// يتحكم في التخزين المؤقت وتشغيل التطبيق بدون إنترنت

const CACHE_NAME = 'qalyubia-trains-v1.1.0';

// الملفات الأساسية للتطبيق (تُخزَّن فوراً)
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  // خط Cairo من Google Fonts
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap'
];

// ==================== تثبيت Service Worker ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets...');
      // نخزن الملفات الأساسية، ونتجاوز أي خطأ في ملف واحد
      return Promise.allSettled(
        CORE_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] Failed to cache: ${url}`, err);
        }))
      );
    }).then(() => {
      console.log('[SW] Core assets cached successfully!');
      return self.skipWaiting(); // تفعيل فوري بدون انتظار
    })
  );
});

// ==================== تفعيل Service Worker ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // احذف الكاش القديم
          .map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Service worker activated!');
      return self.clients.claim(); // السيطرة على جميع الصفحات المفتوحة
    })
  );
});

// ==================== اعتراض طلبات الشبكة ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير HTTP/HTTPS
  if (!request.url.startsWith('http')) return;

  // استراتيجية: Cache First للملفات الأساسية, Network First للباقي
  if (isCoreAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// ====================  استراتيجيات التخزين المؤقت ====================

// Cache First: ابحث في الكاش أولاً، وإن لم تجد اجلب من الشبكة
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Cache first failed:', error);
    return caches.match('./index.html'); // fallback للصفحة الرئيسية
  }
}

// Network First: اجلب من الشبكة أولاً، وإن فشل استخدم الكاش
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // إن لم يوجد في الكاش، أرجع الصفحة الرئيسية
    return caches.match('./index.html');
  }
}

// التحقق إذا كان الطلب لملف أساسي
function isCoreAsset(url) {
  const corePaths = ['index.html', 'style.css', 'app.js', 'data.js', 'manifest.json'];
  return corePaths.some(path => url.pathname.endsWith(path)) || 
         url.pathname === '/' ||
         url.pathname.includes('/icons/');
}

// ==================== استقبال رسائل من التطبيق ====================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
