(function () {
  'use strict';

  const PIN_KEY = 'elektron-admin-pin';
  let adminPin = '';

  const els = {
    login: document.getElementById('admin-login'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    manualForm: document.getElementById('manual-form'),
    loginError: document.getElementById('login-error'),
    list: document.getElementById('admin-list'),
    empty: document.getElementById('admin-empty'),
    count: document.getElementById('site-review-count'),
    refreshBtn: document.getElementById('refresh-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    manual: document.getElementById('admin-manual'),
  };

  function localPin() {
    return String(SITE_CONFIG.adminLocalPin || '472891');
  }

  function verifyPin(pin) {
    return String(pin).trim() === localPin();
  }

  function starsHtml(rating) {
    const n = Math.min(5, Math.max(1, Number(rating) || 5));
    return Array.from({ length: 5 }, (_, i) =>
      `<span class="star-display__star${i < n ? ' star-display__star--filled' : ''}">★</span>`
    ).join('');
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleString('ru', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch {
      return dateStr || '';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showPanel(name) {
    els.login.hidden = name !== 'login';
    els.dashboard.hidden = name !== 'dashboard';
  }

  function showError(msg) {
    els.loginError.textContent = msg;
    els.loginError.hidden = !msg;
  }

  function updateGitHubStatus(msg) {
    const el = document.getElementById('github-status');
    if (el) el.textContent = msg || '';
  }

  function getGitHubTokenField() {
    const el = document.getElementById('github-token');
    return el ? el.value.trim() : '';
  }

  function saveGitHubTokenFromField() {
    const token = getGitHubTokenField();
    if (!token) {
      SiteReviewsStore.setGitHubToken('');
      updateGitHubStatus('Token не сохранён.');
      return false;
    }
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      updateGitHubStatus('Нужна строка ghp_... (classic token, галочка repo)');
      return false;
    }
    SiteReviewsStore.setGitHubToken(token);
    updateGitHubStatus('✓ Token сохранён.');
    const btn = document.getElementById('github-sync-btn');
    if (btn) btn.textContent = 'Token сохранён ✓';
    return true;
  }

  function ensureGitHubToken() {
    if (SiteReviewsStore.getGitHubToken()) return true;
    if (getGitHubTokenField()) return saveGitHubTokenFromField();
    updateGitHubStatus('Вставь GitHub token и нажми «Сохранить token».');
    return false;
  }

  function getUrlParams() {
    const p = new URLSearchParams(location.search);
    return {
      pin: p.get('pin'),
      pub: p.get('pub') === '1',
      name: p.get('name'),
      rating: Number(p.get('r') || p.get('rating') || 5),
      text: p.get('text'),
    };
  }

  function clearUrlParams() {
    history.replaceState({}, '', 'admin.html');
  }

  async function tryAutoPublishFromEmail() {
    const params = getUrlParams();
    if (!params.pub || !params.name || !params.text) return false;

    if (params.pin && verifyPin(params.pin)) adminPin = params.pin.trim();

    if (!adminPin) {
      showPanel('login');
      if (params.pin) document.getElementById('admin-pin').value = params.pin;
      showError('');
      updateGitHubStatus('Войди PIN 472891 — отзыв из письма опубликуется сам.');
      return false;
    }

    showPanel('dashboard');
    await publishReview(params.name, params.rating, params.text);
    clearUrlParams();
    return true;
  }

  async function init() {
    const params = getUrlParams();
    if (params.pin) document.getElementById('admin-pin').value = params.pin;

    const saved = sessionStorage.getItem(PIN_KEY);
    if (saved && verifyPin(saved)) {
      adminPin = saved;
      showPanel('dashboard');
      if (await tryAutoPublishFromEmail()) return;
      await loadReviews();
      return;
    }

    if (params.pub) {
      showPanel('login');
      updateGitHubStatus('Войди PIN 472891 для публикации из email.');
      return;
    }

    showPanel('login');
  }

  async function login(pin) {
    showError('');
    const cleanPin = String(pin).trim();
    if (!verifyPin(cleanPin)) {
      showError('Неверный PIN. Введи: 472891');
      return;
    }
    adminPin = cleanPin;
    sessionStorage.setItem(PIN_KEY, cleanPin);
    showPanel('dashboard');
    if (await tryAutoPublishFromEmail()) return;
    await loadReviews();
  }

  function logout() {
    sessionStorage.removeItem(PIN_KEY);
    adminPin = '';
    showPanel('login');
    showError('');
    document.getElementById('admin-pin').value = '';
  }

  function renderCard(review, index) {
    return `
      <article class="admin-card">
        <div class="admin-card__head">
          <strong>${escapeHtml(review.name)}</strong>
          <time>${formatDate(review.date)}</time>
        </div>
        <div class="star-display">${starsHtml(review.rating)}</div>
        <p class="admin-card__text">${escapeHtml(review.text)}</p>
        <div class="admin-card__actions">
          <button type="button" class="btn btn--sm btn--reject" data-action="delete" data-index="${index}">Удалить</button>
        </div>
      </article>`;
  }

  async function loadReviews() {
    els.list.innerHTML = '<p class="admin__loading">Загрузка...</p>';
    els.empty.hidden = true;

    const reviews = await SiteReviewsStore.fetchFromSite(8000);
    if (els.count) {
      els.count.textContent = `На сайте сейчас: ${reviews.length} ${reviews.length === 1 ? 'отзыв' : 'отзыва(ов)'}`;
    }

    if (!reviews.length) {
      els.list.innerHTML = '';
      els.empty.hidden = false;
      els.empty.textContent = 'На сайте пока нет отзывов. Опубликуй первый ↓';
      return;
    }

    els.list.innerHTML = reviews.map((r, i) => renderCard(r, i)).join('');
  }

  async function publishReview(name, rating, text) {
    if (!ensureGitHubToken()) {
      const merged = SiteReviewsStore.mergeReviews(
        await SiteReviewsStore.fetchFromSite(8000),
        [{ name, rating, text, date: new Date().toISOString() }]
      );
      await SiteReviewsStore.copyJsonForManualEdit(merged);
      alert(
        'Token не настроен.\n\n1. JSON скопирован / скачан\n2. Откроется GitHub — вставь JSON в data/reviews.json\n3. Commit changes\n\nЧерез 1–2 мин отзыв на сайте.'
      );
      return;
    }

    const result = await SiteReviewsStore.publishReview({ name, rating, text });

    if (result.ok) {
      alert('✓ Отзыв на сайте! Подожди 1–2 мин → Ctrl+F5 на главной.');
      window.open(`${location.origin}${(typeof getSiteBasePath === 'function' ? getSiteBasePath() : '/')}index.html`, '_blank');
      await loadReviews();
      return;
    }

    if (result.scope === 'no_token' && result.merged) {
      await SiteReviewsStore.copyJsonForManualEdit(result.merged);
      alert('Автопубликация не вышла. JSON скопирован — вставь на GitHub в data/reviews.json');
      return;
    }

    if (result.merged) {
      await SiteReviewsStore.copyJsonForManualEdit(result.merged);
      alert(`Ошибка: ${result.error || 'неизвестно'}\n\nJSON скопирован — вставь вручную на GitHub:\n${SiteReviewsStore.editUrl}`);
    } else {
      alert(`Ошибка: ${result.error || 'не удалось опубликовать'}`);
    }
  }

  async function deleteReview(index) {
    if (!confirm('Удалить этот отзыв с сайта?')) return;
    const reviews = await SiteReviewsStore.fetchFromSite(8000);
    reviews.splice(index, 1);

    if (!ensureGitHubToken()) {
      await SiteReviewsStore.copyJsonForManualEdit(reviews);
      alert('Обнови JSON на GitHub вручную (файл открыт / скопирован).');
      return;
    }

    const pushed = await SiteReviewsStore.pushToGitHub(reviews);
    if (!pushed.ok) {
      alert(SiteReviewsStore.formatGhError(pushed));
      return;
    }
    await loadReviews();
  }

  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(document.getElementById('admin-pin').value);
  });

  els.manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('manual-name').value.trim();
    const rating = Number(document.getElementById('manual-rating').value);
    const text = document.getElementById('manual-text').value.trim();
    const btn = els.manualForm.querySelector('button[type="submit"]');
    if (!name || !text) return;

    btn.disabled = true;
    try {
      await publishReview(name, rating, text);
      els.manualForm.reset();
      document.getElementById('manual-rating').value = '5';
    } finally {
      btn.disabled = false;
    }
  });

  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', loadReviews);

  els.list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    btn.disabled = true;
    try {
      await deleteReview(Number(btn.dataset.index));
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('github-sync-btn')?.addEventListener('click', () => {
    if (saveGitHubTokenFromField()) alert('Token сохранён. Теперь «Опубликовать» работает автоматически.');
  });

  document.getElementById('github-edit-btn')?.addEventListener('click', async () => {
    const reviews = await SiteReviewsStore.fetchFromSite(8000);
    await SiteReviewsStore.copyJsonForManualEdit(reviews);
    alert('JSON скопирован. На GitHub нажми Commit changes.');
  });

  init();
})();
