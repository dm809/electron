(function () {
  'use strict';

  const SUPPORTED = ['ru', 'es', 'en', 'uk'];
  const LANG_FLAGS = { ru: '🇷🇺', es: '🇪🇸', en: '🇬🇧', uk: '🇺🇦' };

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
      if (code === 'de') return 'en';
      if (SUPPORTED.includes(code)) return code;
    }

    return SITE_CONFIG.defaultLang || 'es';
  }

  function getPhoneForLang(lang) {
    const contacts = SITE_CONFIG.phoneContacts;
    if (contacts?.length) {
      const match = contacts.find((c) => c.langs?.includes(lang));
      if (match) return match;
    }
    return { phone: SITE_CONFIG.phone, display: SITE_CONFIG.phone };
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
    if (typeof window.getSiteBasePath === 'function') return getSiteBasePath();
    if (location.protocol === 'file:') return '';
    const m = location.pathname.match(/^\/([^/]+)\//);
    return m ? `/${m[1]}/` : '/';
  }

  function asset(path) {
    if (!path || /^https?:\/\//.test(path)) return path;
    return `${siteBase()}${path.replace(/^\//, '')}`;
  }

  /** Язык YouTube (озвучка / субтитры) = язык сайта */
  function youtubeCaptionLang(siteLang) {
    const map = { ru: 'ru', es: 'es', en: 'en', uk: 'uk' };
    return map[siteLang] || 'en';
  }

  function getIntroVideoId(siteLang) {
    const cfg = SITE_CONFIG.introVideo;
    if (!cfg) return '';
    if (cfg.youtubeIds && cfg.youtubeIds[siteLang]) return cfg.youtubeIds[siteLang];
    return cfg.youtubeId || cfg.dubVideoId || '';
  }

  function isIntroDubVideo(videoId) {
    const cfg = SITE_CONFIG.introVideo;
    return !!videoId && videoId === cfg?.dubVideoId;
  }

  function introPlayerVars(lang) {
    return {
      rel: 0,
      modestbranding: 1,
      hl: lang,
      playsinline: 1,
      origin: location.origin,
      cc_load_policy: 0,
    };
  }

  function youtubeEmbedUrl(videoId, opts = {}) {
    const lang = youtubeCaptionLang(currentLang);
    const isDub = opts.dub || videoId === SITE_CONFIG.introVideo?.dubVideoId;
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      hl: lang,
      enablejsapi: '1',
      origin: location.origin,
    });
    if (isDub) {
      params.set('cc_load_policy', '0');
    } else {
      params.set('cc_load_policy', '1');
      params.set('cc_lang', lang);
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}&lang=${lang}`;
  }

  let introYtPlayer = null;
  let introYtLang = null;
  let introYtVideoId = null;
  let introRenderGen = 0;
  let ytApiPromise = null;

  function ensureYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        resolve();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
    });

    return ytApiPromise;
  }

  function applyYoutubeCaptions(player, lang) {
    if (!player || typeof player.setOption !== 'function') return;
    try {
      player.loadModule('captions');
      player.setOption('captions', 'track', { languageCode: lang });
    } catch (_) {
      /* плеер ещё не готов */
    }
  }

  /** Попытка переключить озвучку (если YouTube отдал API) */
  function applyYoutubeAudio(player, lang) {
    if (!player) return false;
    try {
      if (typeof player.getAvailableAudioTracks === 'function') {
        const tracks = player.getAvailableAudioTracks();
        if (!tracks?.length) return false;
        const langLower = lang.toLowerCase();
        const match = tracks.find((tr) => {
          const code = String(tr.language_code || tr.languageCode || tr.id || '').toLowerCase();
          return code === langLower || code.startsWith(`${langLower}-`);
        });
        if (match && typeof player.setAudioTrack === 'function') {
          player.setAudioTrack(match.id || match.language_code || lang);
          return true;
        }
      }
    } catch (_) {
      /* не все ролики отдают audio API */
    }
    return false;
  }

  function scheduleIntroAudio(player, lang) {
    let attempt = 0;
    const trySet = () => {
      if (!player || attempt > 6) return;
      if (!applyYoutubeAudio(player, lang)) {
        attempt += 1;
        setTimeout(trySet, 350 * attempt);
      }
    };
    trySet();
  }

  function applyYoutubeLocale(player, lang) {
    scheduleIntroAudio(player, lang);
  }

  function destroyIntroPlayer() {
    if (!introYtPlayer) return;
    try {
      introYtPlayer.destroy();
    } catch (_) {
      /* ignore */
    }
    introYtPlayer = null;
    introYtLang = null;
    introYtVideoId = null;
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
      const highlight = `<span class="mark-highlight">${t('heroHighlight')}</span>`;
      heroTitle.innerHTML = t('heroTitle').replace('{highlight}', highlight);
    }

    document.title = t('metaTitle');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('metaDescription');

    document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

    updateLinks();
    renderHeaderPhones();
    renderSpeakTags();
    renderBrands();
    renderPartners();
    renderIntroVideo();
    renderGallery();
    updateSchema();
    if (window.ReviewsModule) {
      window.ReviewsModule.render();
      window.ReviewsModule.updateReviewPlaceholders();
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

    const phoneContact = getPhoneForLang(currentLang);
    const phoneEl = document.getElementById('contact-phone');
    if (phoneEl) {
      phoneEl.href = `tel:${phoneContact.phone.replace(/\s/g, '')}`;
      const phoneSub = document.getElementById('contact-phone-sub');
      if (phoneSub) phoneSub.textContent = phoneContact.display || phoneContact.phone;
    }
  }

  function renderHeaderPhones() {
    const container = document.getElementById('header-phones');
    if (!container) return;

    const contacts = SITE_CONFIG.phoneContacts || [];
    container.innerHTML = contacts.map((c) => {
      const flags = (c.langs || [])
        .map((code) => `<span class="header-phone__flag" aria-hidden="true">${LANG_FLAGS[code] || code}</span>`)
        .join('');
      const tel = c.phone.replace(/\s/g, '');
      return `<a href="tel:${tel}" class="header-phone">
        <span class="header-phone__number">${c.display || c.phone}</span>
        <span class="header-phone__flags">${flags}</span>
      </a>`;
    }).join('');
  }

  function brandStyleAttr(name) {
    const styles = SITE_CONFIG.brandStyles || {};
    const hex = (styles[name] || {}).color || '#374151';
    return `color:${hex}`;
  }

  function renderBrands() {
    const grid = document.getElementById('brands-grid');
    if (!grid || !SITE_CONFIG.brands) return;
    grid.innerHTML = SITE_CONFIG.brands.map((brand) =>
      `<span class="brand-tag" style="${brandStyleAttr(brand)}">${brand}</span>`
    ).join('');
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

      if (p.url && p.linkEnabled !== false) {
        return `<a href="${p.url}" class="partner-card" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      }
      return `<a href="#" class="partner-card partner-card--nolink">${inner}</a>`;
    }).join('');

    grid.querySelectorAll('.partner-card--nolink').forEach((el) => {
      el.addEventListener('click', (e) => e.preventDefault());
    });
  }

  function renderIntroVideo() {
    const section = document.getElementById('intro');
    const shell = document.getElementById('intro-video-shell');
    const bg = document.getElementById('intro-video-bg');
    const playerEl = document.getElementById('intro-video-player');
    const cfg = SITE_CONFIG.introVideo;
    const videoId = getIntroVideoId(currentLang);
    if (!section || !playerEl || !cfg?.enabled || !videoId) {
      destroyIntroPlayer();
      if (section) section.hidden = true;
      return;
    }

    section.hidden = false;
    const lang = youtubeCaptionLang(currentLang);
    const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    if (shell) shell.classList.toggle('intro-video__shell--shorts', !!cfg.isShorts);
    if (bg) bg.style.backgroundImage = `url('${thumb}')`;

    if (introYtPlayer && introYtLang === lang && introYtVideoId === videoId) {
      applyYoutubeLocale(introYtPlayer, lang);
      renderIntroHighlights();
      return;
    }

    destroyIntroPlayer();
    const gen = ++introRenderGen;
    const mountId = `intro-yt-mount-${gen}`;
    playerEl.innerHTML = `<div id="${mountId}"></div>`;

    ensureYouTubeApi().then(() => {
      if (gen !== introRenderGen) return;
      if (!document.getElementById(mountId)) return;

      introYtLang = lang;
      introYtVideoId = videoId;

      introYtPlayer = new YT.Player(mountId, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        playerVars: introPlayerVars(lang),
        events: {
          onReady: (event) => {
            if (gen !== introRenderGen) return;
            applyYoutubeLocale(event.target, lang);
          },
          onApiChange: (event) => {
            if (gen !== introRenderGen) return;
            applyYoutubeLocale(event.target, lang);
          },
          onStateChange: (event) => {
            if (gen !== introRenderGen) return;
            if (event.data === YT.PlayerState.PLAYING) {
              applyYoutubeLocale(event.target, lang);
            }
          },
        },
      });
    });

    renderIntroHighlights();
  }

  function renderIntroHighlights() {
    const container = document.getElementById('intro-highlights');
    if (!container) return;

    const items = SITE_CONFIG.introHighlights || [];
    container.innerHTML = items.map((item) => `
      <div class="intro-highlight">
        <span class="intro-highlight__icon" aria-hidden="true">✓</span>
        <span>${t(item.key)}</span>
      </div>`).join('');
  }

  function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = SITE_CONFIG.photos.gallery.map((item) => {
      const alt = item.altKey ? t(item.altKey) : (item.alt || '');
      const type = item.type || (item.videoId ? 'youtube' : item.src?.includes('.mp4') ? 'video' : 'image');

      if (type === 'youtube' && item.videoId) {
        const shortsClass = item.isShorts ? ' gallery__item--shorts' : '';
        return `
      <div class="gallery__item gallery__item--youtube gallery__item--embed${shortsClass}">
        <iframe src="${youtubeEmbedUrl(item.videoId)}"
                title="${alt}" loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>
      </div>`;
      }

      if (type === 'video') {
        const src = asset(item.src);
        return `
      <div class="gallery__item gallery__item--video">
        <video src="${src}" controls playsinline preload="metadata" aria-label="${alt}"></video>
      </div>`;
      }

      const src = asset(item.src);
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
      telephone: (SITE_CONFIG.phoneContacts || []).map((c) => c.phone),
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

  function gtagReportConversion(url) {
    if (!SITE_CONFIG.googleAdsConversion || !window.gtag) {
      if (url) window.location.href = url;
      return false;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      if (url) window.location.href = url;
    };
    window.gtag('event', 'conversion', {
      send_to: SITE_CONFIG.googleAdsConversion,
      event_callback: go,
    });
    setTimeout(go, 1000);
    return false;
  }

  window.gtag_report_conversion = gtagReportConversion;

  function initGoogleAds() {
    if (!SITE_CONFIG.googleAdsConversion) return;

    function bindConversionClicks() {
      document.querySelectorAll('.gads-conversion').forEach((el) => {
        if (el.dataset.gadsBound === '1') return;
        el.dataset.gadsBound = '1';
        el.addEventListener('click', (e) => {
          const url = el.href;
          if (!url || url === '#' || url.endsWith('#')) return;
          e.preventDefault();
          gtagReportConversion(url);
        });
      });
    }

    if (window.gtag) bindConversionClicks();
    else {
      const wait = setInterval(() => {
        if (window.gtag) {
          clearInterval(wait);
          bindConversionClicks();
        }
      }, 100);
      setTimeout(() => clearInterval(wait), 5000);
    }
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
