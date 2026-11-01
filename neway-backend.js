/* ---------------------------------------------------------------------------
 * Project NeWay — collegamento form al backend
 * Incluso in ogni pagina con:  <script src="/neway-backend.js" defer></script>
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var API = (window.NEWAY_API_BASE || '').replace(/\/$/, '');

  function alpineData() {
    if (!window.Alpine || typeof window.Alpine.$data !== 'function') return null;
    try {
      return window.Alpine.$data(document.body);
    } catch (e) {
      return null;
    }
  }

  function showError(form, message) {
    var box = form.querySelector('[data-neway-error]');
    if (!box) {
      box = document.createElement('p');
      box.setAttribute('data-neway-error', '');
      box.className = 'text-xs font-semibold text-[#C2410C] mt-2';
      form.appendChild(box);
    }
    box.textContent = message;
  }

  function clearError(form) {
    var box = form.querySelector('[data-neway-error]');
    if (box) box.textContent = '';
  }

  // --- Contatore posti -----------------------------------------------------
  function loadCounter() {
    var valueEl = document.getElementById('counter-value');
    var totalEl = document.getElementById('counter-total');
    var barEl = document.getElementById('counter-bar');
    if (!valueEl || !totalEl) return;

    fetch(API + '/api/counter', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) return;
        valueEl.textContent = data.value;
        totalEl.textContent = data.total;
        if (barEl) barEl.style.width = data.percent + '%';
      })
      .catch(function () { /* il contatore resta sul placeholder */ });
  }

  // --- Invio form ----------------------------------------------------------
  function handleSubmit(form, event) {
    var kind = form.getAttribute('data-neway-form');
    if (!kind) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.dataset.busy === 'true') return;
    clearError(form);

    var fields = new FormData(form);
    var payload = {
      name: (fields.get('name') || '').toString().trim(),
      email: (fields.get('email') || '').toString().trim(),
      website: (fields.get('website') || '').toString(),
      privacy: fields.get('privacy') === 'on' || fields.get('privacy') === 'true',
      marketing: fields.get('marketing') === 'on' || fields.get('marketing') === 'true',
      consentVersion: '2026-10',
      source: form.getAttribute('data-neway-source') || 'landing'
    };

    if (kind === 'contact') {
      payload.topic = (fields.get('topic') || '').toString().trim();
      payload.message = (fields.get('message') || '').toString().trim();
    }

    var button = form.querySelector('button[type="submit"]');
    var label = button ? button.innerHTML : '';
    form.dataset.busy = 'true';
    if (button) {
      button.disabled = true;
      button.classList.add('opacity-60');
      button.textContent = 'Invio in corso...';
    }

    fetch(API + '/api/' + kind, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status >= 200 && result.status < 300 && result.data.ok) {
          var key = form.getAttribute('data-neway-success');
          var data = alpineData();
          if (key && data) data[key] = true;
          form.reset();
          return;
        }

        if (result.status === 422) {
          showError(form, 'Controlla i campi: alcuni dati non sono validi.');
        } else if (result.status === 429) {
          showError(form, 'Troppi tentativi ravvicinati. Riprova tra un minuto.');
        } else {
          showError(form, 'Invio non riuscito. Riprova o scrivici a manuel.desimone@projectneway.it.');
        }
      })
      .catch(function () {
        showError(form, 'Connessione assente. Controlla la rete e riprova.');
      })
      .finally(function () {
        form.dataset.busy = 'false';
        if (button) {
          button.disabled = false;
          button.classList.remove('opacity-60');
          button.innerHTML = label;
        }
      });
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form && form.getAttribute && form.getAttribute('data-neway-form')) {
      handleSubmit(form, event);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCounter);
  } else {
    loadCounter();
  }
})();
