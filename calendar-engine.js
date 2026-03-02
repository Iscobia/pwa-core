// /pwa-core/calendar-engine.js
// Moteur commun (calendrier + progression + sauvegarde + backup) pour tes PWAs.
// Attendu avant chargement :
//   window.APP_CONFIG = { appId, title, daysTotal, storagePrefix, systemeUrl, cacheName? }
//   window.DEFIS = [ { jour, titre, description, termine, dateValidation }, ... ]

(function () {
  'use strict';

  const cfg = window.APP_CONFIG || {};
  const appId = String(cfg.appId || 'app').trim();
  const title = String(cfg.title || 'Programme').trim();
  const daysTotal = Number(cfg.daysTotal || 77);
  const storagePrefix = String(cfg.storagePrefix || (appId + ':'));
  const systemeUrl = cfg.systemeUrl ? String(cfg.systemeUrl) : '';
  const cacheName = String(cfg.cacheName || (appId + '-cache-v1'));

  function k(key) { return storagePrefix + key; }

  // --- Données défis (en mémoire)
  const DEFIS = Array.isArray(window.DEFIS) ? window.DEFIS : [];
  if (!Array.isArray(DEFIS) || DEFIS.length === 0) {
    console.error(`[${appId}] DEFIS manquant ou vide. Vérifie data/defis.js (window.DEFIS).`);
  }

  // --- Helpers dates
  function todayFR() {
    return new Date().toLocaleDateString('fr-FR'); // dd/mm/yyyy
  }

  function parseDateFRSafe(str) {
    if (!str) return null;
    const m = String(str).trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
    return new Date(yyyy, mm - 1, dd, 12, 0, 0); // midi: évite bugs DST
  }

  // --- Récupérer un défi
  function getDefiByDay(jourNumero) {
    const j = Number(jourNumero);
    if (!Number.isFinite(j)) return null;
    return DEFIS.find(d => Number(d.jour) === j) || null;
  }

  // --- Stockage progression
  function saveProgression() {
    try {
      localStorage.setItem(k('defis'), JSON.stringify(DEFIS));
    } catch (e) {
      console.error(`[${appId}] Impossible de sauvegarder progression:`, e);
    }
  }

  function loadProgression() {
    try {
      const raw = localStorage.getItem(k('defis'));
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return;

      saved.forEach((s) => {
        const d = getDefiByDay(s.jour);
        if (!d) return;
        d.termine = !!s.termine;
        d.dateValidation = s.dateValidation ?? null;
      });
    } catch (e) {
      console.error(`[${appId}] Impossible de charger progression:`, e);
    }
  }

  function initStorageDefaults() {
    if (!localStorage.getItem(k('jour_actuel'))) localStorage.setItem(k('jour_actuel'), '1');
    if (!localStorage.getItem(k('heure_notification'))) localStorage.setItem(k('heure_notification'), '08:00');
    if (!localStorage.getItem(k('defis_madeup'))) localStorage.setItem(k('defis_madeup'), JSON.stringify([]));
    if (!localStorage.getItem(k('dernier_acces'))) localStorage.setItem(k('dernier_acces'), todayFR());
    if (!localStorage.getItem(k('dernier_changement_jour'))) localStorage.setItem(k('dernier_changement_jour'), todayFR());
  }

  // --- Etats globaux
  let jourActuel = parseInt(localStorage.getItem(k('jour_actuel')) || '1', 10);
  if (!jourActuel || Number.isNaN(jourActuel)) jourActuel = 1;
  let jourAffiche = jourActuel;

  // --- DOM refs (IDs existants dans ton HTML)
  const elCurrentDay = () => document.getElementById('current-day');
  const elDayCurrent = () => document.getElementById('day-current');
  const elDayTotal = () => document.getElementById('day-total');
  const elTitle = () => document.getElementById('challenge-title');
  const elDesc = () => document.getElementById('challenge-description');
  const calendarGrid = () => document.getElementById('calendar-grid');
  const markDoneButton = () => document.getElementById('mark-done-btn');
  const notificationTimeSelect = () => document.getElementById('notification-time');

  // --- UI : bouton Mark Done
  function updateMarkDoneButtonUI(jour) {
    const btn = markDoneButton();
    if (!btn) return;

    const jourCourant = parseInt(String(jourActuel), 10) || 1;
    const jourCible = parseInt(String(jour), 10);
    const defi = getDefiByDay(jourCible);
    if (!defi || Number.isNaN(jourCible)) return;

    const madeupDefis = JSON.parse(localStorage.getItem(k('defis_madeup')) || '[]');
    const estRattrape = madeupDefis.includes(jourCible);

    btn.classList.remove('mark-future', 'mark-rattraper', 'mark-madeup', 'mark-done', 'mark-default');

    let label = '✅ Marquer comme accompli';
    let disabled = false;
    let stateClass = 'mark-default';

    if (jourCible > jourCourant) {
      label = '⏳ Disponible le jour J';
      disabled = true;
      stateClass = 'mark-future';
    } else if (defi.termine) {
      label = '✅ Accompli !';
      disabled = true;
      stateClass = 'mark-done';
    } else if (estRattrape) {
      label = '✨ Déjà rattrapé';
      disabled = true;
      stateClass = 'mark-madeup';
    } else if (jourCible < jourCourant) {
      label = '✨ Rattraper ce défi';
      stateClass = 'mark-rattraper';
    }

    btn.textContent = label;
    btn.disabled = disabled;
    btn.classList.add(stateClass);
  }

  // --- Affichage défi
  function afficherDefiDuJour(jour) {
    const defi = getDefiByDay(jour);
    if (!defi) return;

    jourAffiche = Number(jour);

    const a = elCurrentDay(); if (a) a.textContent = String(jourAffiche);
    const b = elDayCurrent(); if (b) b.textContent = String(jourAffiche);
    const t = elTitle(); if (t) t.textContent = defi.titre || '';
    const d = elDesc(); if (d) d.textContent = defi.description || '';

    updateMarkDoneButtonUI(jourAffiche);
  }

  // --- Calendrier
  function centrerCalendrierSurJour(jour) {
    const grid = calendarGrid();
    if (!grid) return;
    const idx = Math.max(0, Number(jour) - 1);
    const el = grid.children[idx];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }

  function genererCalendrier() {
    const grid = calendarGrid();
    if (!grid) return;

    grid.innerHTML = '';

    const madeupDefis = JSON.parse(localStorage.getItem(k('defis_madeup')) || '[]');

    for (let jour = 1; jour <= daysTotal; jour++) {
      const defi = getDefiByDay(jour);
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      dayEl.textContent = String(jour);

      const estDejaRattrape = madeupDefis.includes(jour);

      if (defi && defi.termine) {
        dayEl.classList.add('completed');
      } else if (estDejaRattrape) {
        dayEl.classList.add('madeup');
      } else if (jour === jourActuel) {
        dayEl.classList.add('current');
      } else if (jour < jourActuel) {
        dayEl.classList.add('missed');
      } else {
        dayEl.classList.add('upcoming');
      }

      dayEl.addEventListener('click', () => afficherDefiDuJour(jour));
      grid.appendChild(dayEl);
    }

    centrerCalendrierSurJour(jourActuel);
  }

  // --- Avancement jour (multi-jours)
  function verifierEtAvancerJour() {
    try {
      let jour = parseInt(localStorage.getItem(k('jour_actuel')) || '1', 10);
      if (!jour || Number.isNaN(jour)) jour = 1;

      const ancien = jourActuel;
      jourActuel = jour;

      const auj = todayFR();
      const dernierStr = localStorage.getItem(k('dernier_changement_jour'));

      if (!dernierStr) {
        localStorage.setItem(k('dernier_changement_jour'), auj);
      } else if (dernierStr !== auj) {
        const ancienneDate = parseDateFRSafe(dernierStr);
        const nouvelleDate = parseDateFRSafe(auj);

        if (ancienneDate && nouvelleDate) {
          const diffMs = nouvelleDate.getTime() - ancienneDate.getTime();
          const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffJours > 0) {
            const nouveauJour = Math.min(daysTotal, jourActuel + diffJours);
            if (nouveauJour !== jourActuel) {
              jourActuel = nouveauJour;
              localStorage.setItem(k('jour_actuel'), String(jourActuel));
            }
            localStorage.setItem(k('dernier_changement_jour'), auj);
          }
        } else {
          localStorage.setItem(k('dernier_changement_jour'), auj);
        }
      }

      if (jourAffiche === ancien && jourActuel !== ancien) {
        afficherDefiDuJour(jourActuel);
      } else if (!jourAffiche) {
        afficherDefiDuJour(jourActuel);
      }

      genererCalendrier();
      return jourActuel;
    } catch (e) {
      console.error(`[${appId}] Erreur verifierEtAvancerJour:`, e);
      return jourActuel;
    }
  }

  // --- Validation / rattrapage
  function markDayDone(jourCible) {
    const j = Number(jourCible);
    const defi = getDefiByDay(j);
    if (!defi) return;

    const madeupDefis = JSON.parse(localStorage.getItem(k('defis_madeup')) || '[]');

    if (j < jourActuel && !madeupDefis.includes(j)) {
      madeupDefis.push(j);
      localStorage.setItem(k('defis_madeup'), JSON.stringify(madeupDefis));
    }

    defi.termine = true;
    defi.dateValidation = todayFR();
    saveProgression();

    afficherDefiDuJour(j);
    genererCalendrier();
  }

  // --- Backup export/import
  function exportBackup() {
    const backupData = {
      appId,
      version: '1.0',
      timestamp: new Date().toISOString(),
      progression: JSON.parse(localStorage.getItem(k('defis')) || '[]'),
      jourActuel: localStorage.getItem(k('jour_actuel')),
      dernierChangement: localStorage.getItem(k('dernier_changement_jour')),
      heureNotification: localStorage.getItem(k('heure_notification')),
      defisMadeup: JSON.parse(localStorage.getItem(k('defis_madeup')) || '[]'),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sauvegarde-${appId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    alert('✅ Sauvegarde exportée !');
  }

  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backupData = JSON.parse(String(event.target.result || ''));
          if (!backupData || !backupData.progression || !backupData.jourActuel) {
            throw new Error('Format invalide');
          }
          if (backupData.appId && String(backupData.appId) !== appId) {
            const ok = confirm(`Cette sauvegarde est marquée pour "${backupData.appId}". L’importer quand même ?`);
            if (!ok) return;
          }

          if (confirm(`Importer la sauvegarde du ${new Date(backupData.timestamp).toLocaleDateString('fr-FR')} ?`)) {
            localStorage.setItem(k('defis'), JSON.stringify(backupData.progression));
            localStorage.setItem(k('jour_actuel'), String(backupData.jourActuel));
            if (backupData.dernierChangement) localStorage.setItem(k('dernier_changement_jour'), String(backupData.dernierChangement));
            if (backupData.heureNotification) localStorage.setItem(k('heure_notification'), String(backupData.heureNotification));
            if (Array.isArray(backupData.defisMadeup)) localStorage.setItem(k('defis_madeup'), JSON.stringify(backupData.defisMadeup));

            loadProgression();
            verifierEtAvancerJour();
            afficherDefiDuJour(parseInt(localStorage.getItem(k('jour_actuel')) || '1', 10));
            alert('✅ Progression importée !');
          }
        } catch (err) {
          console.error(`[${appId}] Erreur import backup:`, err);
          alert('❌ Fichier invalide.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // --- Reset
  function resetProgress() {
    if (!confirm('ÊTES-VOUS ABSOLUMENT SÛR ?\n\nTous vos défis validés seront effacés !')) return;
    if (!confirm('DERNIÈRE CHANCE : "Annuler" pour garder, "OK" pour supprimer.')) return;

    DEFIS.forEach(d => { d.termine = false; d.dateValidation = null; });
    localStorage.setItem(k('defis'), JSON.stringify(DEFIS));
    localStorage.setItem(k('jour_actuel'), '1');
    localStorage.setItem(k('defis_madeup'), JSON.stringify([]));

    const auj = todayFR();
    localStorage.setItem(k('dernier_changement_jour'), auj);
    localStorage.setItem(k('dernier_acces'), auj);

    alert('🗑️ Progression supprimée.');
    window.location.reload();
  }

  // --- Cache clear (fallback)
  async function clearCacheNow() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          if (key === cacheName) await caches.delete(key);
        }
      }
    } catch (e) {
      console.error(`[${appId}] Erreur clear cache:`, e);
    }
  }

  // --- Bind UI
  function bindUI() {
    const totalEl = elDayTotal();
    if (totalEl) totalEl.textContent = String(daysTotal);

    const btn = markDoneButton();
    if (btn && !btn.dataset.listenerAttached) {
      btn.dataset.listenerAttached = 'true';
      btn.addEventListener('click', () => {
        const jourCible = parseInt(String(jourAffiche), 10);
        if (!Number.isFinite(jourCible)) return;
        markDayDone(jourCible);
      });
    }

    const timeSelect = notificationTimeSelect();
    if (timeSelect && !timeSelect.dataset.listenerAttached) {
      timeSelect.dataset.listenerAttached = 'true';
      timeSelect.value = localStorage.getItem(k('heure_notification')) || '08:00';
      timeSelect.addEventListener('change', () => {
        localStorage.setItem(k('heure_notification'), timeSelect.value);
      });
    }

    document.getElementById('export-backup-btn')?.addEventListener('click', exportBackup);
    document.getElementById('import-backup-btn')?.addEventListener('click', importBackup);
    document.getElementById('reset-progress-btn')?.addEventListener('click', resetProgress);

    document.getElementById('clear-cache-btn')?.addEventListener('click', async function () {
      const btn = this;
      if (!confirm('Vider le cache ?')) return;
      btn.textContent = 'Nettoyage...';
      btn.disabled = true;

      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          const done = new Promise((resolve) => {
            messageChannel.port1.onmessage = (event) => resolve(!!(event.data && event.data.success));
            setTimeout(() => resolve(false), 1500);
          });

          navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE', cacheName }, [messageChannel.port2]);

          const ok = await done;
          if (!ok) await clearCacheNow();
        } else {
          await clearCacheNow();
        }
      } catch (e) {
        await clearCacheNow();
      }

      window.location.reload();
    });

    if (systemeUrl) {
      document.querySelectorAll('[data-systeme-link]').forEach((a) => {
        a.setAttribute('href', systemeUrl);
      });
    }
  }

  // --- Service Worker -> App (boutons notification)
  function bindServiceWorkerMessages() {
    if (!('serviceWorker' in navigator)) return;
    if (window.__pwaCoreSWMsgListenerAttached) return;
    window.__pwaCoreSWMsgListenerAttached = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      try {
        const data = event.data || {};
        if (data.action === 'MARK_DONE') {
          const jourNotif = parseInt(String(data.jour), 10);
          if (Number.isFinite(jourNotif)) {
            afficherDefiDuJour(jourNotif);
            const btn = markDoneButton();
            if (btn) setTimeout(() => btn.click(), 0);
          }
        }
      } catch (e) {
        console.error(`[${appId}] Erreur message SW:`, e);
      }
    });
  }

  // --- Boot
  function boot() {
    console.log(`🚀 [${appId}] Démarrage moteur commun (${title})`);

    initStorageDefaults();
    loadProgression();
    bindServiceWorkerMessages();
    bindUI();

    verifierEtAvancerJour();
    afficherDefiDuJour(jourActuel);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') verifierEtAvancerJour();
    });

    // Exposer debug si besoin
    window.getDefiByDay = getDefiByDay;
    window.verifierEtAvancerJour = verifierEtAvancerJour;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
