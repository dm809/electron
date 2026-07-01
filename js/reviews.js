(function () {
  'use strict';

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

  function loadLocalApproved() {
    try {
      return JSON.parse(localStorage.getItem(APPROVED_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function buildApprovedList() {
    const local = loadLocalApproved();
    const config = SITE_CONFIG.reviews || [];
    return [...local, ...config].map((r) => ({ ...r, _pending: false }));
  }

  function paintReviews(all) {
    const list = document.getElementById('reviews-list');
    if (!list) return;

    if (!all.length) {
      list.innerHTML = `<p class="reviews__empty">${getT('reviewsEmpty')}</p>`;
      return;
    }

    list.innerHTML = all.map((r) => renderReviewCard(r)).join('');
  }

  function renderReviewCard(review) {
    return `
      <article class="review-card">
        <div class="review-card__head">
          <div class="review-card__author">${escapeHtml(review.name)}</div>
        </div>
        <div class="review-card__rating-wrap" aria-label="${review.rating}/5">${starsHtml(review.rating)}</div>
        <p class="review-card__text">${escapeHtml(review.text)}</p>
        ${review.date ? `<time class="review-card__date">${formatDate(review.date)}</time>` : ''}
      </article>`;
  }

  function renderReviews() {
    paintReviews(buildApprovedList());

    if (!window.SupabaseReviews || !SupabaseReviews.isConfigured()) return;

    SupabaseReviews.fetchApproved(5000)
      .then((remote) => {
        if (!remote.length) return;
        paintReviews(remote.map((r) => ({ ...r, _pending: false })));
      })
      .catch(() => {});
  }

  function adminBaseUrl() {
    const path = (SITE_CONFIG.basePath || '/electron/').replace(/\/?$/, '/');
    if (location.protocol === 'file:') return `https://dm809.github.io${path}`;
    if (location.origin.includes('github.io')) return `${location.origin}${path}`;
    return `https://dm809.github.io${path}`;
  }

  function buildApproveUrl(reviewId) {
    const pin = SITE_CONFIG.adminLocalPin || '472891';
    if (reviewId) {
      return `${adminBaseUrl()}admin.html?approve=${encodeURIComponent(reviewId)}&pin=${encodeURIComponent(pin)}`;
    }
    return `${adminBaseUrl()}admin.html`;
  }

  function buildPublishUrl(review) {
    const pin = SITE_CONFIG.adminLocalPin || '472891';
    const q = new URLSearchParams({
      pub: '1',
      pin,
      name: review.name,
      r: String(review.rating),
      text: review.text.slice(0, 300),
    });
    return `${adminBaseUrl()}admin.html?${q.toString()}`;
  }

  async function notifyOwnerByEmail(review, reviewId) {
    const email = SITE_CONFIG.notifyEmail;
    if (!email) return;

    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const approveUrl = reviewId ? buildApproveUrl(reviewId) : null;
    const publishUrl = buildPublishUrl(review);
    const mainLink = approveUrl || publishUrl;

    const payload = {
      _subject: '⭐ Новый отзыв ELEKTRON — нажми ОПУБЛИКОВАТЬ',
      _template: 'table',
      _captcha: 'false',
      name: review.name,
      rating: `${stars} (${review.rating}/5)`,
      message: review.text,
      '👉 ОПУБЛИКОВАТЬ (нажми эту ссылку)': mainLink,
      'Запасная ссылка': publishUrl,
      instructions: 'Нажми «ОПУБЛИКОВАТЬ» в письме — откроется сайт и отзыв появится на elektron.',
    };

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) console.warn('Email notify HTTP', res.status);
    } catch (err) {
      console.warn('Email notify failed:', err);
    }
  }

  async function submitReview(review) {
    let reviewId = null;

    if (window.SupabaseReviews && SupabaseReviews.isConfigured()) {
      try {
        const row = await SupabaseReviews.insertReview(review, 6000);
        if (row && row.id) reviewId = row.id;
      } catch (err) {
        console.warn('Supabase insert failed:', err);
      }
    }

    await notifyOwnerByEmail(review, reviewId);
    return { ok: true, remote: Boolean(reviewId), id: reviewId };
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
    updateReviewPlaceholders: updateReviewPlaceholders,
    init: bootReviews,
  };

  bootReviews();
})();
