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

  instagramUrl: 'https://www.instagram.com/dmitrii_electron',
  instagramUsername: 'dmitrii_electron',

  youtubeUrl: 'https://youtube.com/@electronica-u1f',

  // GitHub Pages: https://dm809.github.io/electron/
  basePath: '/electron/',

  city: 'Costa del Sol',
  region: 'Andalucía, España',

  googleAdsId: '',
  googleAdsConversion: '',
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
    gallery: [
      { src: 'images/gallery-1.jpg', altKey: 'gal1' },
      { src: 'images/gallery-2.jpg', altKey: 'gal2' },
      { src: 'images/gallery-3.jpg', altKey: 'gal3' },
      { src: 'images/gallery-4.jpg', altKey: 'gal4' },
      { src: 'images/gallery-5.jpg', altKey: 'gal5' },
      { src: 'images/gallery-6.jpg', altKey: 'gal6' },
      { src: 'images/gallery-7.jpg', altKey: 'gal7' },
      { src: 'images/gallery-8.jpg', altKey: 'gal8' },
      { src: 'images/gallery-9.jpg', altKey: 'gal9' },
      { src: 'images/gallery-10.jpg', altKey: 'gal10' },
      { src: 'images/gallery-11.jpg', altKey: 'gal11' },
      { src: 'images/gallery-12.jpg', altKey: 'gal12' },
      { src: 'images/gallery-13.jpg', altKey: 'gal13' },
      { src: 'images/gallery-14.jpg', altKey: 'gal14' },
    ],
  },

  // Опубликованные отзывы (резерв, если Supabase не настроен)
  reviews: [],

  // ── Модерация отзывов (без WhatsApp) ──
  // Инструкция: supabase-setup.sql
  supabase: {
    url: 'https://cxqiceminxlsigoibhlh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cWljZW1pbmxzaWdvaXViaGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5Mjg5NDQsImV4cCI6MjA5ODUwNDk0NH0.W4S4EWhjWfQWHzAKSDb0ryZY2TUJML37WZccKvnUz5w',
  },
};
