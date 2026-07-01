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
    const stars = Array.from({ length: 5 }, (_, i) => {
      const filled = i < n;
      return `<span class="star-display__star${filled ? ' star-display__star--filled' : ''}" aria-hidden="true">★</span>`;
    }).join('');
    return `<span class="star-display" aria-label="${n}/5">${stars}</span>`;
  }

  function starString(rating) {
    const n = Math.min(5, Math.max(1, Number(rating) || 5));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
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

  /** Для отзывов всегда wa.me/номер?text= — короткая ссылка wa.me/message/ не принимает текст */
  function buildWhatsappUrl(message) {
    const phone = String(SITE_CONFIG.whatsappPhone || '').replace(/\D/g, '');
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

  function resetStarRating() {
    const hidden = document.getElementById('review-rating');
    if (hidden) hidden.value = '5';
    setStarRating(5);
  }

  function setStarRating(value) {
    const container = document.getElementById('review-star-input');
    if (!container) return;

    const stars = container.querySelectorAll('.star-input__star');
    stars.forEach((star) => {
      const val = Number(star.dataset.value);
      star.classList.toggle('star-input__star--active', val <= value);
      star.setAttribute('aria-pressed', val === value ? 'true' : 'false');
    });
  }

  function initStarRating() {
    const container = document.getElementById('review-star-input');
    const hidden = document.getElementById('review-rating');
    if (!container || !hidden) return;

    let current = Number(hidden.value) || 5;
    const stars = container.querySelectorAll('.star-input__star');

    function paint(preview) {
      const val = preview ?? current;
      stars.forEach((star) => {
        star.classList.toggle('star-input__star--active', Number(star.dataset.value) <= val);
      });
    }

    stars.forEach((star) => {
      const val = Number(star.dataset.value);

      star.addEventListener('click', () => {
        current = val;
        hidden.value = String(val);
        paint();
      });

      star.addEventListener('mouseenter', () => paint(val));
      star.addEventListener('focus', () => paint(val));
    });

    container.addEventListener('mouseleave', () => paint());
    container.addEventListener('focusout', (e) => {
      if (!container.contains(e.relatedTarget)) paint();
    });

    paint();
  }

  function openWhatsapp(message) {
    const url = buildWhatsappUrl(message);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = url;
    }
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
        `${starString(rating)} (${rating}/5)`,
        `${name}:`,
        text,
        '',
        getT('reviewsWaFooter'),
      ].join('\n');

      savePendingReview(review);
      renderReviews();
      openWhatsapp(waMessage);

      form.reset();
      resetStarRating();

      if (success) {
        success.hidden = false;
        setTimeout(() => { success.hidden = true; }, 8000);
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
      initStarRating();
      initReviewForm();
      renderReviews();
      updateReviewPlaceholders();
    },
  };
})();
