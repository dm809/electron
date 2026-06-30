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

  // Для GitHub Pages: /elektron/ — оставь как есть. Локально (file://) не мешает.
  basePath: '/elektron/',

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

  // Опубликованные отзывы — добавляй сюда после проверки в WhatsApp
  // rating: от 1 до 5, date: '2026-06-30'
  reviews: [
    // { name: 'Алексей', rating: 5, text: 'Отличный ремонт платы Daikin!', date: '2026-06-15' },
  ],
};
