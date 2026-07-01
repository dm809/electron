(function () {
  'use strict';

  const STORAGE_KEY = 'elektron-pending-reviews';
  const APPROVED_KEY = 'elektron-approved-reviews';

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadLocal(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalPending(review) {
    const list = loadLocal(STORAGE_KEY);
    list.unshift(review);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  }

  function buildLocalList(includePending) {
    const pending = includePending ? loadLocal(STORAGE_KEY) : [];
    const approved = loadLocal(APPROVED_KEY);
    const configApproved = SITE_CONFIG.reviews || [];

    return [
      ...pending.map((r) => ({ ...r, _pending: true })),
      ...approved.map((r) => ({ ...r, _pending: false })),
      ...configApproved.map((r) => ({ ...r, _pending: false })),
    ];
  }

  function paintReviews(all) {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (!all.length) {
      list.innerHTML = `<p class="reviews__empty">${getT('reviewsEmpty')}</p>`;
      return;
    }

    list.innerHTML = all.map((r) => renderReviewCard(r, r._pending)).join('');
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

  function renderReviews() {
    paintReviews(buildLocalList(true));

    if (!window.SupabaseReviews || !SupabaseReviews.shouldUse()) return;

    SupabaseReviews.fetchApproved(4000)
      .then((remote) => {
        if (!remote.length) return;
        const localPending = loadLocal(STORAGE_KEY);
        paintReviews([
          ...localPending.map((r) => ({ ...r, _pending: true })),
          ...remote.map((r) => ({ ...r, _pending: false })),
        ]);
      })
      .catch(() => {
        SupabaseReviews.markSkip();
      });
  }

  async function submitReview(review) {
    saveLocalPending(review);

    if (window.SupabaseReviews && SupabaseReviews.shouldUse()) {
      try {
        await SupabaseReviews.insertReview(review, 4000);
        return { ok: true, remote: true };
      } catch (err) {
        console.warn('Supabase insert failed, saved locally:', err);
        SupabaseReviews.markSkip();
      }
    }

    return { ok: true, local: true };
  }

  function resetStarRating() {
    const hidden = document.getElementById('review-rating');
    if (hidden) hidden.value = '5';
    setStarRating(5);
  }

  function setStarRating(value) {
    const container = document.getElementById('review-star-input');
    if (!container) return;

    container.querySelectorAll('.star-input__star').forEach((star) => {
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

  function initReviewForm() {
    const form = document.getElementById('review-form');
    const success = document.getElementById('review-success');
    const errorEl = document.getElementById('review-error');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = form.querySelector('#review-name').value.trim();
      const rating = form.querySelector('#review-rating').value;
      const text = form.querySelector('#review-text').value.trim();
      const submitBtn = form.querySelector('.reviews__submit');

      if (!name || !text) {
        form.reportValidity();
        return;
      }

      if (errorEl) errorEl.hidden = true;
      if (submitBtn) submitBtn.disabled = true;

      const review = {
        name,
        rating: Number(rating),
        text,
        date: new Date().toISOString(),
      };

      try {
        await submitReview(review);
        form.reset();
        resetStarRating();
        renderReviews();

        if (success) {
          success.hidden = false;
          setTimeout(() => { success.hidden = true; }, 8000);
        }
      } catch (err) {
        console.error('Review submit error:', err);
        if (errorEl) {
          errorEl.textContent = getT('reviewsError');
          errorEl.hidden = false;
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function updateReviewPlaceholders() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = getT(el.dataset.i18nPlaceholder);
    });
  }

  let reviewsBooted = false;

  function bootReviews() {
    if (reviewsBooted) return;
    reviewsBooted = true;
    initStarRating();
    initReviewForm();
    renderReviews();
    updateReviewPlaceholders();
  }

  window.ReviewsModule = {
    render: renderReviews,
    updatePlaceholders: updateReviewPlaceholders,
    init: bootReviews,
  };

  bootReviews();
})();
