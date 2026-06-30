(function () {
  'use strict';

  const STORAGE_KEY = 'elektron-pending-reviews';

  function getT(key) {
    if (typeof window.__siteT === 'function') return window.__siteT(key);
    const lang = localStorage.getItem('site-lang') || 'ru';
    const dict = I18N[lang] || I18N.ru;
    return dict[key] || I18N.ru[key] || key;
  }

  function starsHtml(rating) {
    const n = Math.min(5, Math.max(1, Number(rating) || 5));
    return `<span class="review-card__rating">${n}/5</span>`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const locale = document.documentElement.lang || 'ru';
      return new Date(dateStr).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function loadPendingReviews() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function savePendingReview(review) {
    const list = loadPendingReviews();
    list.unshift(review);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  }

  function buildWhatsappUrl(message) {
    if (SITE_CONFIG.whatsappUrl && SITE_CONFIG.whatsappUrl.includes('wa.me/message/')) {
      return `${SITE_CONFIG.whatsappUrl}?text=${encodeURIComponent(message)}`;
    }
    const phone = SITE_CONFIG.whatsappPhone;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function renderReviewCard(review, pending) {
    const pendingBadge = pending
      ? `<span class="review-card__badge">${getT('reviewsPending')}</span>`
      : '';

    return `
      <article class="review-card${pending ? ' review-card--pending' : ''}">
        <div class="review-card__head">
          <div class="review-card__author">${escapeHtml(review.name)}</div>
          ${pendingBadge}
        </div>
        <div class="review-card__rating-wrap" aria-label="${review.rating}/5">${starsHtml(review.rating)}</div>
        <p class="review-card__text">${escapeHtml(review.text)}</p>
        ${review.date ? `<time class="review-card__date">${formatDate(review.date)}</time>` : ''}
      </article>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderReviews() {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    const published = SITE_CONFIG.reviews || [];
    const pending = loadPendingReviews();
    const all = [
      ...pending.map((r) => ({ ...r, _pending: true })),
      ...published.map((r) => ({ ...r, _pending: false })),
    ];

    if (!all.length) {
      list.innerHTML = `<p class="reviews__empty">${getT('reviewsEmpty')}</p>`;
      return;
    }

    list.innerHTML = all.map((r) => renderReviewCard(r, r._pending)).join('');
  }

  function initReviewForm() {
    const form = document.getElementById('review-form');
    const success = document.getElementById('review-success');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('#review-name').value.trim();
      const rating = form.querySelector('#review-rating').value;
      const text = form.querySelector('#review-text').value.trim();

      if (!name || !text) {
        form.reportValidity();
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const review = { name, rating: Number(rating), text, date };

      const waMessage = [
        getT('reviewsWaPrefix'),
        '',
        `⭐ ${rating}/5`,
        `${name}:`,
        text,
      ].join('\n');

      savePendingReview(review);
      renderReviews();

      window.open(buildWhatsappUrl(waMessage), '_blank', 'noopener');

      form.reset();
      const ratingEl = document.getElementById('review-rating');
      if (ratingEl) ratingEl.value = '5';

      if (success) {
        success.hidden = false;
        setTimeout(() => { success.hidden = true; }, 6000);
      }
    });
  }

  function updateReviewPlaceholders() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = getT(el.dataset.i18nPlaceholder);
    });
  }

  window.ReviewsModule = {
    render: renderReviews,
    updatePlaceholders: updateReviewPlaceholders,
    init: () => {
      initReviewForm();
      renderReviews();
      updateReviewPlaceholders();
    },
  };
})();
