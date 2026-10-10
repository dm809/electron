(function () {
  'use strict';

  const STORAGE_KEY = 'elektron-cookie-consent';
  const CONSENT_ALL = 'aceptadas';
  const CONSENT_REJECT = 'rechazadas';

  function getState() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function setState(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }

  function hasMarketingConsent() {
    return getState() === CONSENT_ALL;
  }

  function loadGoogleMarketing() {
    if (window.__elektronMarketingLoaded) return;
    const cfg = typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG : {};
    const adsId = cfg.googleAdsId;
    if (!adsId) return;

    window.__elektronMarketingLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', adsId);

    if (cfg.googleAnalyticsId) {
      window.gtag('config', cfg.googleAnalyticsId);
    }

    document.dispatchEvent(new CustomEvent('elektron:marketing-consent'));
  }

  function hideBanner() {
    const el = document.getElementById('cookie-banner');
    if (el) {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('cookie-banner-open');
  }

  function showBanner() {
    const el = document.getElementById('cookie-banner');
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cookie-banner-open');
  }

  function acceptAll() {
    setState(CONSENT_ALL);
    hideBanner();
    loadGoogleMarketing();
  }

  function rejectAnalytics() {
    setState(CONSENT_REJECT);
    hideBanner();
  }

  function bindBanner() {
    const banner = document.getElementById('cookie-banner');
    if (!banner || banner.dataset.bound === '1') return;
    banner.dataset.bound = '1';

    banner.querySelector('[data-cookie-accept]')?.addEventListener('click', acceptAll);
    banner.querySelector('[data-cookie-reject]')?.addEventListener('click', rejectAnalytics);

    const prefsBtn = banner.querySelector('[data-cookie-prefs]');
    if (prefsBtn) {
      prefsBtn.addEventListener('click', () => {
        const path = typeof window.getSiteBasePath === 'function'
          ? getSiteBasePath()
          : '/';
        window.open(`${path}politica-cookies/`, '_blank', 'noopener,noreferrer');
      });
    }
  }

  function init() {
    bindBanner();
    const state = getState();
    if (state === CONSENT_ALL) {
      loadGoogleMarketing();
      hideBanner();
    } else if (state === CONSENT_REJECT) {
      hideBanner();
    } else {
      showBanner();
    }
  }

  window.ElektronCookieConsent = {
    getState,
    hasMarketingConsent,
    acceptAll,
    rejectAnalytics,
    loadGoogleMarketing,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
