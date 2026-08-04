/**
 * ═══════════════════════════════════════════════
 *  НАСТРОЙКИ САЙТА — ELEKTRON · Dmitrii
 * ═══════════════════════════════════════════════
 */

const SITE_CONFIG = {
  brandName: 'ELEKTRON',
  ownerName: 'Dmitrii',
  tagline: 'interesantes ideas de dmitrii',

  phone: '+34643292197',
  email: 'gordienkodmytro9@gmail.com',

  whatsappUrl: 'https://wa.me/message/QRZS65C6P4KGM1',
  whatsappPhone: '34643292197',

  instagramUrl: 'https://www.instagram.com/dmitrii_elektron?igsh=cTJldzIzb3F0dTBo',
  instagramUsername: 'dmitrii_elektron',

  youtubeUrl: 'https://www.youtube.com/@electronica-u1f',

  // Видео-вступление (отдельный блок, не галерея)
  introVideo: {
    enabled: true,
    youtubeId: '0zbjmG7aUn8',
    lang: 'es',
  },

  // GitHub Pages: https://dm809.github.io/electron/
  // Свой домен: https://dmitrii-elektron.es/
  customDomain: 'dmitrii-elektron.es',
  githubPagesPath: '/electron/',
  get basePath() {
    if (typeof location === 'undefined') return this.githubPagesPath;
    if (location.protocol === 'file:') return this.githubPagesPath;
    const custom = (this.customDomain || '').toLowerCase();
    const host = location.hostname.toLowerCase();
    if (custom && (host === custom || host === `www.${custom}`)) return '/';
    return this.githubPagesPath;
  },

  city: 'Costa del Sol',
  region: 'Andalucía, España',
  siteUrl: 'https://dmitrii-elektron.es/',

  // Google Ads — вставь ID из ads.google.com → Herramientas → Conversiones
  // googleAdsId: 'AW-XXXXXXXXX'
  // googleAdsConversion: 'AW-XXXXXXXXX/AbCdEfGh'
  // googleAnalyticsId: 'G-XXXXXXXXXX'  (opcional)
  googleAdsId: 'AW-18280309759',
  googleAdsConversion: 'AW-18280309759/cen5CI-HyMocEP_H3YxE',
  googleAnalyticsId: '',

  speakLanguages: ['ru', 'es', 'en', 'uk', 'de'],
  defaultLang: 'es',

  // Автоязык: ru / es / en по браузеру клиента (uk→ru, de→en)
  autoDetectLang: true,

  brands: [
    'Daikin', 'Mitsubishi Electric', 'LG', 'Toshiba', 'Fujitsu',
    'Carrier', 'Hitachi', 'Panasonic', 'Samsung', 'Haier',
    'Midea', 'Gree', 'York', 'Trane', 'Lennox',
    'Bosch', 'Vaillant', 'Viessmann', 'Hisense', 'McQuay',
    'Rheem', 'Goodman', 'Cooper & Hunter', 'Aux',
  ],

  // Партнёры — секция скрыта, пока не добавишь логотипы (showPartners: true)
  showPartners: true,
  partners: [
    {
      name: 'DOMYKA',
      logo: 'images/partners/domyka.png',
      url: 'https://domyka.es/',
    },
  ],

  logo: 'images/logo.jpg',
  logoFallback: 'images/logo.svg',

  photos: {
    hero: 'images/logo.jpg',
    // Галерея: фото, YouTube и MP4. Примеры ниже — раскомментируй и добавь свои.
    gallery: [
      { type: 'image', src: 'images/gallery-work-1.jpg', altKey: 'gal8' },
      { type: 'image', src: 'images/gallery-work-2.jpg', altKey: 'gal9' },
      { type: 'image', src: 'images/gallery-work-3.jpg', altKey: 'gal10' },
      { type: 'image', src: 'images/gallery-work-4.jpg', altKey: 'gal11' },
      { type: 'image', src: 'images/gallery-work-5.jpg', altKey: 'gal12' },
      { type: 'image', src: 'images/gallery-13.png', altKey: 'gal13' },
      { type: 'image', src: 'images/gallery-14.png', altKey: 'gal14' },
      // YouTube — videoId из ссылки watch?v=XXXX:
      // { type: 'youtube', videoId: 'XXXXXXXX', altKey: 'galVideo1' },
      // Свой ролик — положи MP4 в images/videos/:
      // { type: 'video', src: 'images/videos/repair-1.mp4', altKey: 'galVideo2' },
    ],
  },

  // Опубликованные отзывы — в js/reviews-data.js (встроены в сайт)
  get reviews() {
    return (typeof SITE_REVIEWS !== 'undefined' ? SITE_REVIEWS : []);
  },

  // ── Модерация отзывов (без WhatsApp) ──
  // Инструкция: supabase-setup.sql + supabase-admin-pin.sql
  // Если «Failed to fetch» — зайди в supabase.com и нажми Restore project
  supabase: {
    url: 'https://cxqiceminlsigoiubhlh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cWljZW1pbmxzaWdvaXViaGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5Mjg5NDQsImV4cCI6MjA5ODUwNDk0NH0.W4S4EWhjWfQWHzAKSDb0ryZY2TUJML37WZccKvnUz5w',
  },

  // PIN для входа в admin.html
  adminLocalPin: '472891',

  // Email для уведомлений о новых отзывах (FormSubmit — без WhatsApp)
  notifyEmail: 'gordienkodmytro9@gmail.com',
};

/** Базовый путь: / на своём домене, /electron/ на github.io */
function getSiteBasePath() {
  const ghPath = SITE_CONFIG.githubPagesPath || '/electron/';
  if (typeof location === 'undefined') return ghPath;
  if (location.protocol === 'file:') return ghPath;

  const custom = (SITE_CONFIG.customDomain || '').toLowerCase();
  const host = location.hostname.toLowerCase();
  if (custom && (host === custom || host === `www.${custom}`)) return '/';

  if (host.includes('github.io')) {
    const m = location.pathname.match(/^\/([^/]+)\//);
    if (m) return `/${m[1]}/`;
    return ghPath;
  }

  return '/';
}

window.getSiteBasePath = getSiteBasePath;
