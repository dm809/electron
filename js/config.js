/**
 * ═══════════════════════════════════════════════
 *  НАСТРОЙКИ САЙТА — ELEKTRON · Dmitrii
 * ═══════════════════════════════════════════════
 */

const SITE_CONFIG = {
  /** Меняйте при каждом деплое — мобильные браузеры подтягивают новую версию */
  siteBuild: 63,

  brandName: 'ELEKTRON',
  ownerName: 'Dmytro Hordiienko',
  tagline: 'interesantes ideas de dmitrii',

  phone: '+34643292197',
  phoneContacts: [
    {
      phone: '+34643292197',
      display: '+34 643 292 197',
      langs: ['ru', 'es'],
    },
    {
      phone: '+34632959656',
      display: '+34 632 959 656',
      name: 'Eugenii',
      langs: ['en', 'uk'],
    },
  ],
  email: 'gordienkodmytro9@gmail.com',

  whatsappUrl: 'https://wa.me/message/QRZS65C6P4KGM1',
  whatsappPhone: '34643292197',

  instagramUrl: 'https://www.instagram.com/dmitrii_elektron?igsh=cTJldzIzb3F0dTBo',
  instagramUsername: 'dmitrii_elektron',

  youtubeUrl: 'https://www.youtube.com/@elektron_dmitrii',

  // Видео-вступление (отдельный блок, не галерея)
  introVideo: {
    enabled: true,
    isShorts: true,
    // RU / UA — отдельные шорты; ES / EN — 0zbjmG7aUn8 (ES: испанская дорожка через API)
    youtubeIds: {
      ru: 'WFA6X7T9AWM',
      es: '0zbjmG7aUn8',
      en: '0zbjmG7aUn8',
      uk: 'OApZFyOukuM',
    },
    dubVideoId: '0zbjmG7aUn8',
    // Языки, где на dub-ролике принудительно включаем нужную озвучку
    dubAudioLangs: ['es'],
  },

  // Ключевые пункты — синяя панель рядом с видео
  introHighlights: [
    { key: 'hl1' },
    { key: 'hl2' },
    { key: 'hl3' },
    { key: 'hl4' },
  ],

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

  // Datos legales (LSSI / RGPD) — sustituir placeholders en páginas legales
  legal: {
    businessName: 'DMYTRO HORDIIENKO',
    officialName: 'HORDIIENKO, DMYTRO',
    nif: 'Y9550180L',
    street: 'Calle Zarza, Num 31',
    postalCode: '29170',
    locality: 'Colmenar',
    province: 'Málaga',
    address: 'Calle Zarza, Num 31, CP 29170, Colmenar, Málaga, España',
    privacyEmail: 'gordienkodmytro9@gmail.com',
    phone: '+34 643 292 197',
    activity: 'Reparación de artículos electrodomésticos',
    iae: '691.1',
    iaeRaw: '6911',
    altaCensoDate: '26/06/2026',
    modelo036Ref: '2026C3650180129Y',
  },

  // Google Ads — вставь ID из ads.google.com → Herramientas → Conversiones
  // googleAdsId: 'AW-XXXXXXXXX'
  // googleAdsConversion: 'AW-XXXXXXXXX/AbCdEfGh'
  // googleAnalyticsId: 'G-XXXXXXXXXX'  (opcional)
  googleAdsId: 'AW-18280309759',
  googleAdsConversion: 'AW-18280309759/cen5CI-HyMocEP_H3YxE',
  googleAnalyticsId: '',

  speakLanguages: ['ru', 'es', 'en', 'uk'],
  defaultLang: 'es',

  // Автоязык: ru / es / en по браузеру клиента (uk→ru, de→en)
  autoDetectLang: true,

  brands: [
    'LG',
    'TCL',
    'MITSUBISHI ELECTRIC',
    'SAMSUNG',
    'PANASONIC',
    'FUJITSU',
    'HAIER',
    'GREE',
    'MIDEA',
    'HITACHI',
    'CARRIER',
    'CARELL',
    'Daikin',
    'Trane',
  ],

  // Фирменный стиль марок: цвет + шрифт (как в оригинальных логотипах)
  brandStyles: {
    LG: {
      color: '#A50034',
      fontFamily: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
      fontWeight: '700',
      fontStyle: 'italic',
      letterSpacing: '0.04em',
    },
    TCL: {
      color: '#004990',
      fontFamily: '"Roboto", Arial, sans-serif',
      fontWeight: '900',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
    'MITSUBISHI ELECTRIC': {
      color: '#E60012',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      fontSize: '0.78rem',
    },
    SAMSUNG: {
      color: '#1428A0',
      fontFamily: '"Raleway", "Roboto", Arial, sans-serif',
      fontWeight: '800',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    },
    PANASONIC: {
      color: '#0041C2',
      fontFamily: '"Roboto", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    FUJITSU: {
      color: '#E4002B',
      fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    HAIER: {
      color: '#0060A9',
      fontFamily: '"Roboto", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    GREE: {
      color: '#00A651',
      fontFamily: '"Bebas Neue", "Arial Black", Arial, sans-serif',
      fontWeight: '400',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontSize: '1.05rem',
    },
    MIDEA: {
      color: '#0099DA',
      fontFamily: '"Raleway", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
    HITACHI: {
      color: '#E60027',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
    CARRIER: {
      color: '#009CDE',
      fontFamily: '"Roboto", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    },
    CARELL: {
      color: '#1D4ED8',
      fontFamily: '"Georgia", "Times New Roman", serif',
      fontWeight: '700',
      letterSpacing: '0.03em',
    },
    Daikin: {
      color: '#00A0E9',
    },
    Trane: {
      color: '#E31837',
      fontFamily: '"Oswald", Arial, sans-serif',
      fontWeight: '700',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },

  // Партнёры — секция скрыта, пока не добавишь логотипы (showPartners: true)
  showPartners: true,
  partners: [
    {
      name: 'DOMYKA',
      logo: 'images/partners/domyka.png',
      url: 'https://domyka.es/',
      linkEnabled: false, // временно: логотип без перехода на сайт
    },
    {
      name: 'Reforma-Spain.es',
      logo: 'images/partners/reforma-spain.png',
      url: 'https://www.reforma-spain.es/',
    },
  ],

  logo: 'images/logo.jpg',
  logoFallback: 'images/logo.svg',

  photos: {
    hero: 'images/logo.jpg',
    // Галерея: фото, YouTube и MP4. Примеры ниже — раскомментируй и добавь свои.
    gallery: [
      { type: 'youtube', videoId: 'DHUvzaPB1y4', altKey: 'galVideo1', isShorts: true },
      { type: 'youtube', videoId: 'N6gf74ekEX8', altKey: 'galVideo2', isShorts: true },
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
