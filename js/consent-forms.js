(function () {
  'use strict';

  function privacyUrl() {
    const base = typeof window.getSiteBasePath === 'function'
      ? getSiteBasePath()
      : '/';
    return `${base}politica-privacidad/`;
  }

  function getConsentLabelHtml() {
    const lang = document.documentElement.lang || localStorage.getItem('site-lang') || 'es';
    const dict = typeof I18N !== 'undefined' ? (I18N[lang] || I18N.es || I18N.ru) : null;
    const before = dict?.privacyConsentBefore || 'He leído y acepto la ';
    const linkText = dict?.privacyConsentLink || 'Política de Privacidad';
    const after = dict?.privacyConsentAfter || '.';
    const url = privacyUrl();
    return `${before}<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>${after}`;
  }

  function wireForm(form) {
    if (!form || form.dataset.consentWired === '1') return;
    form.dataset.consentWired = '1';

    let wrap = form.querySelector('.form-consent');
    if (!wrap) {
      wrap = document.createElement('label');
      wrap.className = 'form-consent reviews__field';
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        form.insertBefore(wrap, submitBtn);
      } else {
        form.appendChild(wrap);
      }
      wrap.innerHTML = `
        <input type="checkbox" class="privacy-consent-checkbox" name="privacy_accept" value="1" required>
        <span class="form-consent__text"></span>`;
    }

    const textEl = wrap.querySelector('.form-consent__text');
    if (textEl) {
      if (textEl.dataset.consentExact === '1') {
        const url = privacyUrl();
        textEl.innerHTML = `He leído y acepto la <a href="${url}" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>`;
      } else {
        textEl.innerHTML = getConsentLabelHtml();
      }
    }

    const checkbox = wrap.querySelector('.privacy-consent-checkbox');
    const submitBtn = form.querySelector('[type="submit"]');
    if (!checkbox || !submitBtn) return;

    submitBtn.disabled = true;

    const sync = () => {
      submitBtn.disabled = !checkbox.checked;
    };
    checkbox.addEventListener('change', sync);
    sync();
  }

  function initAll() {
    document.querySelectorAll('form[data-requires-privacy]').forEach(wireForm);
  }

  function refreshLabels() {
    document.querySelectorAll('form[data-requires-privacy] .form-consent__text').forEach((el) => {
      if (el.dataset.consentExact === '1') {
        const url = privacyUrl();
        el.innerHTML = `He leído y acepto la <a href="${url}" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>`;
        return;
      }
      el.innerHTML = getConsentLabelHtml();
    });
  }

  window.ElektronConsentForms = { initAll, refreshLabels, wireForm };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
