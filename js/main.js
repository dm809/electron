(function () {
  'use strict';

  const SUPPORTED = ['ru', 'es', 'en'];

  function detectBrowserLang() {
    const manual = localStorage.getItem('site-lang-manual');
    const saved = localStorage.getItem('site-lang');
    if (manual === '1' && saved && I18N[saved]) return saved;

    if (!SITE_CONFIG.autoDetectLang) {
      return SITE_CONFIG.defaultLang || 'es';
    }

    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || 'es'];

    for (const raw of langs) {
      const code = raw.toLowerCase().split('-')[0];
      if (code === 'uk') return 'ru';
      if (code === 'de') return 'en';
      if (SUPPORTED.includes(code)) return code;
    }

    return SITE_CONFIG.defaultLang || 'es';
  }

  let currentLang = detectBrowserLang();

  function t(key) {
    const dict = I18N[currentLang] || I18N.ru;
    let text = dict[key] || I18N.ru[key] || key;
    text = text.replace('{city}', SITE_CONFIG.city);
    return text;
  }

  window.__siteT = t;

  function siteBase() {
    if (location.protocol === 'file:') return '';
    if (SITE_CONFIG.basePath) return SITE_CONFIG.basePath;
    const m = location.pathname.match(/^\/([^/]+)\//);
    return m ? `/${m[1]}/` : '/';
  }

  function asset(path) {
    if (!path || /^https?:\/\//.test(path)) return path;
    return `${siteBase()}${path.replace(/^\//, '')}`;
  }

  function buildWhatsappUrl() {
    if (SITE_CONFIG.whatsappUrl) return SITE_CONFIG.whatsappUrl;
    const msg = (I18N[currentLang] || I18N.ru).waMessage;
    return `https://wa.me/${SITE_CONFIG.whatsappPhone}?text=${encodeURIComponent(msg)}`;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });

    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
      const highlight = `<span class="gradient-text">${t('heroHighlight')}</span>`;
      heroTitle.innerHTML = t('heroTitle').replace('{highlight}', highlight);
    }

    document.title = t('metaTitle');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('metaDescription');

    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

    updateLinks();
    renderSpeakTags();
    renderBrands();
    renderPartners();
    renderGallery();
    updateSchema();
    if (window.ReviewsModule) {
      window.ReviewsModule.render();
      window.ReviewsModule.updatePlaceholders();
    }
  }

  function updateLinks() {
    const wa = buildWhatsappUrl();
    const ig = SITE_CONFIG.instagramUrl || `https://instagram.com/${SITE_CONFIG.instagramUsername}`;
    const yt = SITE_CONFIG.youtubeUrl || SITE_CONFIG.youtubeChannel;

    document.querySelectorAll('[id*="whatsapp"]').forEach((el) => {
      if (el.tagName === 'A') el.href = wa;
    });

    ['hero-instagram', 'contact-instagram', 'footer-instagram'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = ig;
    });

    ['hero-youtube', 'contact-youtube', 'footer-youtube'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = yt;
    });

    const emailEl = document.getElementById('contact-email');
    if (emailEl) emailEl.href = `mailto:${SITE_CONFIG.email}`;

    const phoneEl = document.getElementById('contact-phone');
    if (phoneEl) phoneEl.href = `tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`;
  }

  function renderBrands() {
    const grid = document.getElementById('brands-grid');
    if (!grid || !SITE_CONFIG.brands) return;
    grid.innerHTML = SITE_CONFIG.brands.map((b) => `<span>${b}</span>`).join('');
  }

  function renderSpeakTags() {
    const container = document.getElementById('speak-tags');
    if (!container) return;
    const names = (I18N[currentLang] || I18N.ru).langNames;
    container.innerHTML = SITE_CONFIG.speakLanguages
      .map((code) => `<span class="speak-tag">${names[code] || code}</span>`)
      .join('');
  }

  function renderPartners() {
    const section = document.getElementById('partners');
    const grid = document.getElementById('partners-grid');
    if (!grid) return;

    const partners = SITE_CONFIG.partners || [];
    const visible = SITE_CONFIG.showPartners && partners.length > 0;

    if (section) section.hidden = !visible;
    if (!visible) return;

    grid.innerHTML = partners.map((p) => {
      const logoSrc = asset(p.logo);
      const inner = `
        <div class="partner-card__logo">
          <img src="${logoSrc}" alt="${p.name}" loading="lazy"
               onerror="this.closest('.partner-card').classList.add('partner-card--placeholder')">
          <span class="partner-card__placeholder">${t('partnerPlaceholder')}</span>
        </div>
        <span class="partner-card__name">${p.name}</span>`;

      if (p.url) {
        return `<a href="${p.url}" class="partner-card" target="_blank" rel="noopener">${inner}</a>`;
      }
      return `<div class="partner-card">${inner}</div>`;
    }).join('');
  }

  function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = SITE_CONFIG.photos.gallery.map((photo) => {
      const alt = photo.altKey ? t(photo.altKey) : (photo.alt || '');
      const src = asset(photo.src);
      return `
      <div class="gallery__item">
        <img src="${src}" alt="${alt}" loading="lazy"
             onerror="this.parentElement.classList.add('gallery__item--placeholder')">
        <div class="gallery__placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <span>${t('galleryPlaceholder')}</span>
        </div>
      </div>`;
    }).join('');
  }

  function loadHeroPhoto() {
    const container = document.getElementById('hero-photo');
    if (!container || !SITE_CONFIG.photos.hero) return;

    const img = new Image();
    img.src = asset(SITE_CONFIG.photos.hero);
    img.alt = SITE_CONFIG.brandName;
    img.onload = () => {
      container.innerHTML = '';
      container.appendChild(img);
    };
  }

  function updateSchema() {
    const el = document.getElementById('schema-json');
    if (!el) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: SITE_CONFIG.brandName,
      founder: { '@type': 'Person', name: SITE_CONFIG.ownerName },
      description: t('metaDescription'),
      telephone: SITE_CONFIG.phone,
      email: SITE_CONFIG.email,
      areaServed: SITE_CONFIG.region,
      address: {
        '@type': 'PostalAddress',
        addressLocality: SITE_CONFIG.city,
        addressRegion: 'Andalucía',
        addressCountry: 'ES',
      },
      url: window.location.href,
      sameAs: [
        SITE_CONFIG.instagramUrl || `https://instagram.com/${SITE_CONFIG.instagramUsername}`,
        SITE_CONFIG.youtubeUrl,
      ].filter(Boolean),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: SITE_CONFIG.speakLanguages,
      },
    };

    el.textContent = JSON.stringify(schema);
  }

  function initGoogleAds() {
    const { googleAdsId, googleAdsConversion, googleAnalyticsId } = SITE_CONFIG;
    if (!googleAdsId && !googleAnalyticsId) return;

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());

    if (googleAnalyticsId) gtag('config', googleAnalyticsId);
    if (googleAdsId) gtag('config', googleAdsId);

    document.querySelectorAll('.gads-conversion').forEach((el) => {
      el.addEventListener('click', () => {
        if (googleAdsConversion && window.gtag) {
          gtag('event', 'conversion', { send_to: googleAdsConversion });
        }
      });
    });
  }

  function initLangSwitch() {
    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        localStorage.setItem('site-lang', currentLang);
        localStorage.setItem('site-lang-manual', '1');
        applyTranslations();
      });
    });
  }

  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const menu = document.getElementById('mobile-menu');
    if (!burger || !menu) return;

    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        burger.classList.remove('active');
        menu.classList.remove('open');
      });
    });
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  function initStickyCta() {
    const sticky = document.getElementById('sticky-cta');
    const contact = document.getElementById('contact');
    if (!sticky || !contact) return;

    const observer = new IntersectionObserver(
      ([entry]) => sticky.classList.toggle('visible', !entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(contact);
  }

  function initBrand() {
    const brandEl = document.getElementById('brand-name');
    const footerBrand = document.getElementById('footer-brand');
    const logoImg = document.getElementById('logo-img');

    if (brandEl) brandEl.textContent = SITE_CONFIG.brandName;
    if (footerBrand) footerBrand.textContent = SITE_CONFIG.brandName;
    if (logoImg && SITE_CONFIG.logo) {
      logoImg.src = asset(SITE_CONFIG.logo);
      logoImg.onerror = () => {
        if (SITE_CONFIG.logoFallback) logoImg.src = asset(SITE_CONFIG.logoFallback);
      };
    }
  }

  function initAdminSecret() {
    const link = document.getElementById('admin-link');
    const trigger = document.getElementById('logo-img') || document.querySelector('.logo');
    if (!link || !trigger) return;

    let clicks = 0;
    let timer;

    trigger.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      clicks += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 2500);
      if (clicks >= 5) {
        clicks = 0;
        link.hidden = false;
      }
    });
  }

  initBrand();
  initAdminSecret();
  initLangSwitch();
  initMobileMenu();
  initReveal();
  initStickyCta();
  loadHeroPhoto();
  applyTranslations();
  initGoogleAds();
  if (window.ReviewsModule) window.ReviewsModule.init();
})();
