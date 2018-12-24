var appShellCacheName = 'weatherPWA-step-6-9';
var dataCacheName = 'weatherData-v1';
var filesToCache = [ // only cached the app shell conponents currently.
    '/',
    '/favicon.ico',
    '/index.html',
    '/scripts/app.js',
    '/service-worker.js',
    '/styles/inline.css',
    '/images/clear.png',
    '/images/cloudy-scattered-showers.png',
    '/images/cloudy.png',
    '/images/fog.png',
    '/images/ic_add_white_24px.svg',
    '/images/ic_refresh_white_24px.svg',
    '/images/partly-cloudy.png',
    '/images/rain.png',
    '/images/scattered-showers.png',
    '/images/sleet.png',
    '/images/snow.png',
    '/images/thunderstorm.png',
    '/images/wind.png'
  ];

// when the service worker is registered(successfully parsed), an install event is triggered the first time the user visits the page
// event.waitUntil(): the install event will not be successful until the Promise within the waitUntil is resolved.
// if the Promise is rejected, the install event fails and the Service Worker becomes redundant
// if the install event is successful, the Service Worker moves to the installed(waiting) state - not active(in control of the document) yet
self.addEventListener('install', function(e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(appShellCacheName).then(function(cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});

// the activate event is fired when the service worker starts up (in one of the following scenarios):
// 1. there's no current active worker already
// 2. the self.skipWaiting() method is called in the Service Worker script
// 3. the user has nagivated away from the page, thereby releasing the previous active worker
// 4. a specified period of time has passed, thereby releasing the previous active worker
// event.waitUntil(): activate event will not be successful until the Promise is resolved
// if Promise rejected: the activate event fails and Service Worker becomes redundant
// if Promise successful: the activate event success and Service Worker move to active(activated) state
// activated state: full control of the document
self.addEventListener('activate', function(e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(function(keyList) {
           return Promise.all(keyList.map(function(key) {
               if (key !== appShellCacheName && key !== dataCacheName) {
                   console.log('[ServiceWorker] Removing old cache', key);
                   return caches.delete(key);
               }
           }));
        })
    );
    // activate the service worker faster
    return self.clients.claim();
});

// when Service Worker is active(activated), it can handle the functional events - fetch and message
// the fetch event is triggered when web request comes
// asynchronous requests: one to cache and one to network
self.addEventListener('fetch', function(e) {
    console.log('[ServiceWorker] Fetch', e.request.url);
    var dataUrl = 'https://query.yahooapis.com/v1/public/yql';
    if (e.request.url.indexOf(dataUrl) > -1) {
        /* when the request URL contains dataUrl, the app is asking for fresh
        * weather data. In this case, the service worker always goes to the
        * network and then caches the response. This is called the 'Cache then network strategy':
        * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
        */
        e.respondWith(
            caches.open(dataCacheName).then(function(cache){
                return fetch(e.request).then(function(response) {
                    cache.put(e.request.url, response.clone());
                    return response;
                });
            })
        );
    } else {
        /* The app is asking for app shell files. In this scenario the app uses the 
         * "Cache, falling back to the network" offline strategy:
         * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
         */
        e.respondWith(
            caches.match(e.request).then(function(response) {
                return response || fetch(e.request)
            })
        );
    }
});