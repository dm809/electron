(function () {
  'use strict';

  const PIN_KEY = 'elektron-admin-pin';
  let currentTab = 'pending';
  let adminPin = '';

  const els = {
    setup: document.getElementById('admin-setup'),
    login: document.getElementById('admin-login'),
    dashboard: document.getElementById('admin-dashboard'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
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

  function translateError(error) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('invalid pin')) {
      return 'Неверный PIN-код. По умолчанию: 472891 (если запускал supabase-admin-pin.sql)';
    }
    if (msg.includes('function') && msg.includes('does not exist')) {
      return 'Запусти SQL из файла supabase-admin-pin.sql в Supabase → SQL Editor';
    }
    if (msg.includes('reviews') && msg.includes('does not exist')) {
      return 'Запусти SQL из файла supabase-setup.sql в Supabase → SQL Editor';
    }
    return error?.message || 'Ошибка подключения';
  }

  async function verifyPin(pin) {
    const { data, error } = await db().rpc('admin_check_pin', { p_pin: pin });
    if (error) throw error;
    return Boolean(data);
  }

  async function init() {
    if (!SupabaseReviews.isConfigured()) {
      showPanel('setup');
      return;
    }

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
      } catch {
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
      showError(translateError(err));
    }
  }

  function logout() {
    clearPin();
    showPanel('login');
    showError('');
    document.getElementById('admin-pin').value = '';
  }

  async function fetchReviews(status) {
    const { data, error } = await db().rpc('admin_get_reviews', {
      p_pin: adminPin,
      p_status: status,
    });
    if (error) throw error;
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
    const { error } = await db().rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'approved',
    });
    if (error) throw error;
  }

  async function rejectReview(id) {
    const { error } = await db().rpc('admin_set_status', {
      p_pin: adminPin,
      p_id: id,
      p_status: 'rejected',
    });
    if (error) throw error;
  }

  async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв навсегда?')) return;
    const { error } = await db().rpc('admin_delete_review', {
      p_pin: adminPin,
      p_id: id,
    });
    if (error) throw error;
  }

  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(document.getElementById('admin-pin').value);
  });

  els.logoutBtn.addEventListener('click', logout);
  els.refreshBtn.addEventListener('click', loadReviews);

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
