(function () {
  'use strict';

  const PIN_KEY = 'elektron-admin-pin';
  const LOCAL_STORAGE_KEY = 'elektron-pending-reviews';
  const LOCAL_APPROVED_KEY = 'elektron-approved-reviews';

  let currentTab = 'pending';
  let adminPin = '';
  let useLocalMode = false;

  const els = {
    setup: document.getElementById('admin-setup'),
    login: document.getElementById('admin-login'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    loginWarn: document.getElementById('login-warn'),
    list: document.getElementById('admin-list'),
    empty: document.getElementById('admin-empty'),
    count: document.getElementById('pending-count'),
    refreshBtn: document.getElementById('refresh-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    tabs: document.querySelectorAll('.admin__tab'),
  };

  function db() {
    return SupabaseReviews.getClient();
  }

  function localPin() {
    return String(SITE_CONFIG.adminLocalPin || '472891');
  }

  function getSavedPin() {
    return sessionStorage.getItem(PIN_KEY) || '';
  }

  function savePin(pin) {
    sessionStorage.setItem(PIN_KEY, pin);
    adminPin = pin;
  }

  function clearPin() {
    sessionStorage.removeItem(PIN_KEY);
    adminPin = '';
  }

  function loadLocalList(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
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
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
    els.setup.hidden = name !== 'setup';
    els.login.hidden = name !== 'login';
    els.dashboard.hidden = name !== 'dashboard';
  }

  function showError(msg) {
    els.loginError.textContent = msg;
    els.loginError.hidden = !msg;
  }

  function showWarn(msg) {
    if (!els.loginWarn) return;
    els.loginWarn.textContent = msg;
    els.loginWarn.hidden = !msg;
  }

  function networkErrorMessage() {
    return 'Не удаётся связаться с Supabase (Failed to fetch). Зайди на supabase.com → открой проект → нажми Restore project / Восстановить. Подожди 2 минуты и обнови страницу.';
  }

  function translateError(error) {
    const msg = (error?.message || String(error)).toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return networkErrorMessage();
    }
    if (msg.includes('invalid pin')) {
      return 'Неверный PIN-код. По умолчанию: 472891';
    }
    if (msg.includes('function') && msg.includes('does not exist')) {
      return 'Запусти SQL из файла supabase-admin-pin.sql в Supabase → SQL Editor';
    }
    if (msg.includes('reviews') && msg.includes('does not exist')) {
      return 'Запусти SQL из файла supabase-setup.sql в Supabase → SQL Editor';
    }
    return error?.message || 'Ошибка подключения';
  }

  async function detectMode() {
    if (!SupabaseReviews.isConfigured() || !SupabaseReviews.shouldUse()) {
      useLocalMode = true;
      return false;
    }
    const result = await SupabaseReviews.testConnection(4000);
    useLocalMode = !result.ok;
    if (result.reason === 'network') {
      showWarn('⚠ Supabase сейчас недоступен. Работает локальный режим (только этот браузер). ' + networkErrorMessage());
    } else if (useLocalMode && result.reason === 'no_table') {
      showWarn('⚠ Запусти supabase-setup.sql и supabase-admin-pin.sql в Supabase SQL Editor.');
    }
    return !useLocalMode;
  }

  async function verifyPin(pin) {
    if (useLocalMode) {
      return pin === localPin();
    }
    const data = await SupabaseReviews.rpc('admin_check_pin', { p_pin: pin }, 4000);
    return Boolean(data);
  }

  async function init() {
    if (!SupabaseReviews.isConfigured()) {
      showPanel('setup');
      return;
    }

    await detectMode();

    const saved = getSavedPin();
    if (saved) {
      try {
        const ok = await verifyPin(saved);
        if (ok) {
          adminPin = saved;
          showPanel('dashboard');
          await loadReviews();
          return;
        }
        clearPin();
      } catch (err) {
        if ((err?.message || '').toLowerCase().includes('failed to fetch')) {
          useLocalMode = true;
          if (saved === localPin()) {
            adminPin = saved;
            showPanel('dashboard');
            showWarn('⚠ Локальный режим — восстанови проект в Supabase для работы с телефонов клиентов.');
            await loadReviews();
            return;
          }
        }
        clearPin();
      }
    }

    showPanel('login');
  }

  async function login(pin) {
    showError('');
    const cleanPin = String(pin).trim();

    if (!cleanPin) {
      showError('Введите PIN-код');
      return;
    }

    await detectMode();

    try {
      const ok = await verifyPin(cleanPin);
      if (!ok) {
        showError('Неверный PIN-код. По умолчанию: 472891');
        return;
      }
      savePin(cleanPin);
      showPanel('dashboard');
      await loadReviews();
    } catch (err) {
      console.error(err);
      const msg = translateError(err);
      if ((err?.message || '').toLowerCase().includes('failed to fetch') && cleanPin === localPin()) {
        useLocalMode = true;
        savePin(cleanPin);
        showPanel('dashboard');
        showWarn('⚠ Локальный режим активен. Восстанови проект в Supabase.');
        await loadReviews();
        return;
      }
      showError(msg);
    }
  }

  function logout() {
    clearPin();
    showPanel('login');
    showError('');
    showWarn('');
    document.getElementById('admin-pin').value = '';
  }

  async function fetchReviews(status) {
    if (useLocalMode) {
      if (status === 'pending') {
        return loadLocalList(LOCAL_STORAGE_KEY).map((r, i) => ({
          id: `local-p-${i}`,
          name: r.name,
          rating: r.rating,
          text: r.text,
          created_at: r.date,
          status: 'pending',
          _localIndex: i,
        }));
      }
      return loadLocalList(LOCAL_APPROVED_KEY).map((r, i) => ({
        id: `local-a-${i}`,
        name: r.name,
        rating: r.rating,
        text: r.text,
        created_at: r.date,
        status: 'approved',
        _localIndex: i,
      }));
    }

    const data = await SupabaseReviews.rpc('admin_get_reviews', {
      p_pin: adminPin,
      p_status: status,
    }, 4000);
    return data || [];
  }

  function pluralReviews(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'отзыв';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
    return 'отзывов';
  }

  function renderCard(review) {
    const isPending = review.status === 'pending';

    const actions = isPending
      ? `
        <div class="admin-card__actions">
          <button type="button" class="btn btn--sm btn--approve" data-action="approve" data-id="${review.id}">✓ Опубликовать</button>
          <button type="button" class="btn btn--sm btn--reject" data-action="reject" data-id="${review.id}">✕ Отклонить</button>
        </div>`
      : `
        <div class="admin-card__actions">
          <button type="button" class="btn btn--sm btn--reject" data-action="delete" data-id="${review.id}">Удалить</button>
        </div>`;

    return `
      <article class="admin-card${isPending ? ' admin-card--pending' : ''}">
        <div class="admin-card__head">
          <strong>${escapeHtml(review.name)}</strong>
          <time>${formatDate(review.created_at)}</time>
        </div>
        <div class="star-display">${starsHtml(review.rating)}</div>
        <p class="admin-card__text">${escapeHtml(review.text)}</p>
        ${actions}
      </article>`;
  }

  async function loadReviews() {
    els.list.innerHTML = '<p class="admin__loading">Загрузка...</p>';
    els.empty.hidden = true;

    try {
      const status = currentTab === 'pending' ? 'pending' : 'approved';
      const reviews = await fetchReviews(status);

      if (currentTab === 'pending') {
        els.count.textContent = `${reviews.length} ${pluralReviews(reviews.length)}`;
      } else {
        const pending = await fetchReviews('pending');
        els.count.textContent = `${pending.length} ${pluralReviews(pending.length)}`;
      }

      if (!reviews.length) {
        els.list.innerHTML = '';
        els.empty.hidden = false;
        return;
      }

      els.list.innerHTML = reviews.map(renderCard).join('');
    } catch (err) {
      console.error(err);
      if ((err?.message || '').toLowerCase().includes('invalid pin')) {
        logout();
        showError('Сессия истекла — введите PIN снова');
        return;
      }
      els.list.innerHTML = `<p class="admin__error">${escapeHtml(translateError(err))}</p>`;
    }
  }

  async function approveReview(id) {
    if (useLocalMode) {
      const pending = loadLocalList(LOCAL_STORAGE_KEY);
      const idx = Number(String(id).replace('local-p-', ''));
      const review = pending[idx];
      if (!review) return;
      const approved = loadLocalList(LOCAL_APPROVED_KEY);
      approved.unshift(review);
      pending.splice(idx, 1);
      saveLocalList(LOCAL_STORAGE_KEY, pending);
      saveLocalList(LOCAL_APPROVED_KEY, approved);
      return;
    }
    await SupabaseReviews.rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'approved',
    }, 4000);
  }

  async function rejectReview(id) {
    if (useLocalMode) {
      const pending = loadLocalList(LOCAL_STORAGE_KEY);
      pending.splice(Number(String(id).replace('local-p-', '')), 1);
      saveLocalList(LOCAL_STORAGE_KEY, pending);
      return;
    }
    await SupabaseReviews.rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'rejected',
    }, 4000);
  }

  async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв навсегда?')) return;
    if (useLocalMode) {
      const approved = loadLocalList(LOCAL_APPROVED_KEY);
      approved.splice(Number(String(id).replace('local-a-', '')), 1);
      saveLocalList(LOCAL_APPROVED_KEY, approved);
      return;
    }
    await SupabaseReviews.rpc('admin_delete_review', {
      p_pin: adminPin,
      p_id: id,
    }, 4000);
  }

  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(document.getElementById('admin-pin').value);
  });

  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', async () => {
    await detectMode();
    loadReviews();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      els.tabs.forEach((t) => t.classList.toggle('admin__tab--active', t === tab));
      loadReviews();
    });
  });

  els.list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;
    btn.disabled = true;

    try {
      if (action === 'approve') await approveReview(id);
      else if (action === 'reject') await rejectReview(id);
      else if (action === 'delete') await deleteReview(id);
      await loadReviews();
    } catch (err) {
      console.error(err);
      alert(translateError(err));
    } finally {
      btn.disabled = false;
    }
  });

  init();
})();
