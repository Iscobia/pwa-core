(function () {
// app.js - Logique principale de l'application

const userAgent = navigator.userAgent;
const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

// Config par app (chargée via config.js dans chaque repo enfant)
const APP = window.APP_CONFIG || {};
const APP_ID = APP.ID || "app";
const APP_NAME = APP.NAME || "APP";
const APP_MAIN_TITLE = APP.MAIN_TITLE || "Mon Défi Quotidien";
const APP_BROWSER_TITLE = APP.BROWSER_TITLE || `${APP_NAME} - Défi Quotidien`;
const APP_ICON_192 = APP.ICON_192 || "./core/assets/icons/default-192.png";
const APP_ICON_512 = APP.ICON_512 || "./core/assets/icons/default-512.png";
const APP_SUPPORT_URL = APP.SUPPORT_URL || "#";
const TECH_SUPPORT_EMAIL = window.TECH_SUPPORT_EMAIL || "";


console.log("APP_ID:", APP_ID);
console.log("APP_NAME:", APP_NAME);
console.log("DEFIS LOADED:", window.DEFIS?.length);

// Cache name isolé par app (utile surtout pour Service Worker / caches)
const CACHE_NAME = APP.CACHE_NAME || `${APP_ID}-pwa-v1`;

// Stockage isolé par app
const STORAGE_PREFIX = APP.STORAGE_PREFIX || `${APP_ID}_`;

// ===============================
// Gestion du stockage local
// ===============================

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
} // lsGet("jour_actuel") lit : origine_jour_actuel || et si Si APP_ID = "enveloppe" : enveloppe_jour_actuel

function lsGet(key, fallback = null) {
  const value = localStorage.getItem(storageKey(key));
  return value !== null ? value : fallback;
}

function lsSet(key, value) {
  localStorage.setItem(storageKey(key), value);
}

function lsRemove(key) {
  localStorage.removeItem(storageKey(key));
}

// ============== FONCTION PAUSE ==================//

function isProgressPaused() {
  return lsGet('progress_paused', 'false') === 'true';
}

function setProgressPaused(value) {
  lsSet('progress_paused', value ? 'true' : 'false');
}

function updatePauseProgressionButton() {
  const btn = document.getElementById('pause-progression-btn');
  if (!btn) return;

  if (isProgressPaused()) {
    btn.textContent = `▶️ Relancer ma progression dans ${APP_NAME}`;
    btn.classList.add('is-paused');
  } else {
    btn.textContent = `⏸️ Mettre ma progression dans ${APP_NAME} en pause`;
    btn.classList.remove('is-paused');
  }
}

// ============== FIN de la FONCTION PAUSE ==================//


let INSTALL_APP_NAME = "EVOLUTION";

async function loadInstallAppNameFromManifest() {
  try {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return;

    const manifestUrl = new URL(manifestLink.getAttribute('href'), window.location.href);
    const response = await fetch(manifestUrl.href, { cache: 'no-store' });
    if (!response.ok) return;

    const manifest = await response.json();
    INSTALL_APP_NAME = manifest.short_name || manifest.name || "EVOLUTION";

    console.log("📦 INSTALL_APP_NAME:", INSTALL_APP_NAME);

    updateBackupWarningNote();
  } catch (e) {
    console.warn("⚠️ Impossible de lire le manifest pour short_name :", e);
  }
}

function updateBackupWarningNote() {
  const note = document.getElementById('evolution-backup-warning');
  if (!note) return;

  const allowedIds = Array.isArray(window.ALLOWED_APP_IDS) ? window.ALLOWED_APP_IDS : [window.APP_ID];

  if (allowedIds.length <= 1) {
    note.textContent = '';
    note.style.display = 'none';
    return;
  }

  note.textContent = `ATTENTION : tu ne sauvegardes ici que ta progression sur ${APP_NAME}. Si tu veux aussi protéger ta progression sur les autres thèmes, exporte-les depuis leurs pages respectives.`;
  note.style.display = 'block';
}


let jourActuel = parseInt(lsGet('jour_actuel', '1'), 10) || 1;
let jourAffiche = jourActuel;

// === On choisi le programme à montrer :

function renderProgramSelector() {
  const container = document.getElementById("program-selector");
  if (!container) return;

  const allowedIds = Array.isArray(window.ALLOWED_APP_IDS) ? window.ALLOWED_APP_IDS : [window.APP_ID];

  const allPrograms = {
    envol: {
      id: "envol",
      name: "ENVOL",
      subtitle: "(Ré)Alignement Corps et Esprit",
      themeClass: "theme-envol"
    },
    origine: {
      id: "origine",
      name: "ORIGINE",
      subtitle: "Alimentation consciente",
      themeClass: "theme-origine"
    },
    enveloppe: {
      id: "enveloppe",
      name: "ENVELOPPE",
      subtitle: "Retour à Soi par le corps",
      themeClass: "theme-enveloppe"
    },
    emergence: {
      id: "emergence",
      name: "EMERGENCE",
      subtitle: "Inconscient allié",
      themeClass: "theme-emergence"
    },
    reset: {
      id: "reset",
      name: "RESET",
      subtitle: "Reviens à toi, un pas à la fois",
      themeClass: "theme-reset"
    },
    fondation: {
      id: "fondation",
      name: "FONDATION",
      subtitle: "Prépare ton terrain",
      themeClass: "theme-fondation"
    },

  };

  const programs = allowedIds
    .map(id => allPrograms[id])
    .filter(Boolean);

  container.innerHTML = "";

  if (programs.length <= 1) {
    container.style.display = "none";
    return;
  }

  container.style.display = "";
  container.className = "program-selector-grid";

  programs.forEach(program => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `program-chip ${program.themeClass}`;

    if (program.id === window.APP_ID) {
      button.classList.add("is-active");
      button.disabled = true;
    } else {
      button.classList.add("is-inactive");
    }

    button.innerHTML = `
      <span class="program-chip-name">${program.name}</span>
      <span class="program-chip-subtitle">${program.subtitle}</span>
    `;

    button.addEventListener("click", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("app", program.id);
      window.location.href = url.toString();
    });

    container.appendChild(button);
  });
}


function applyAppBranding() {
  document.title = APP_BROWSER_TITLE;

  const mainTitle = document.getElementById("app-main-title");
  if (mainTitle) {
    mainTitle.textContent = APP_MAIN_TITLE;
  }

  const favicon = document.getElementById("app-favicon");
  if (favicon) favicon.href = APP_ICON_192;

  const appleTouchIcon = document.getElementById("app-apple-touch-icon");
  if (appleTouchIcon) appleTouchIcon.href = APP_ICON_192;

  const footerLogo = document.getElementById("footer-logo");
  if (footerLogo) {
    footerLogo.src = APP_ICON_192;
    footerLogo.alt = APP_NAME;
  }

  const dayTotalElement = document.getElementById("day-total");
  if (dayTotalElement) {
    dayTotalElement.textContent = String(APP.TOTAL_DAYS || 0);
  }
  const supportLink = document.getElementById("support-link");
  if (supportLink) {
    supportLink.href = APP_SUPPORT_URL;
  }
}

let errorBannerInitialized = false;
let latestTechnicalError = null;
const technicalErrorHistory = [];

function pushTechnicalError(entry) {
  technicalErrorHistory.push(entry);
  while (technicalErrorHistory.length > 10) {
    technicalErrorHistory.shift();
  }
  latestTechnicalError = entry;
}

function buildTechnicalErrorReport() {
  const lines = [
    `App: ${APP_NAME}`,
    `App ID: ${APP_ID}`,
    `URL: ${window.location.href}`,
    `User agent: ${navigator.userAgent}`,
    `Date: ${new Date().toISOString()}`,
    ''
  ];

  technicalErrorHistory.forEach((entry, index) => {
    lines.push(`--- Erreur ${index + 1} ---`);
    lines.push(`Type: ${entry.type}`);
    lines.push(`Message: ${entry.message || ''}`);
    if (entry.source) lines.push(`Source: ${entry.source}`);
    if (entry.lineno) lines.push(`Ligne: ${entry.lineno}`);
    if (entry.colno) lines.push(`Colonne: ${entry.colno}`);
    if (entry.stack) lines.push(`Stack: ${entry.stack}`);
    lines.push('');
  });

  return lines.join('\n');
}

function showTechnicalErrorBanner(entry) {
  pushTechnicalError(entry);

  const banner = document.getElementById('error-banner');
  const text = document.getElementById('error-banner-text');
  const mailBtn = document.getElementById('error-banner-mail');
  const copyBtn = document.getElementById('error-banner-copy');
  const closeBtn = document.getElementById('error-banner-close');

  if (!banner || !text || !mailBtn || !copyBtn || !closeBtn) return;

  text.textContent = `Une erreur a été détectée dans ${APP_NAME}. Tu peux continuer à utiliser l’app, ou envoyer un signalement technique.`;

  banner.hidden = false;

  if (!errorBannerInitialized) {
    closeBtn.addEventListener('click', () => {
      banner.hidden = true;
    });

    copyBtn.addEventListener('click', async () => {
      const report = buildTechnicalErrorReport();
      try {
        await navigator.clipboard.writeText(report);
        copyBtn.textContent = '✅ Détails copiés';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copier les détails';
        }, 1500);
      } catch (e) {
        console.warn('Copie impossible :', e);
      }
    });

    mailBtn.addEventListener('click', () => {
      const report = buildTechnicalErrorReport();

      if (!TECH_SUPPORT_EMAIL) {
        alert("Aucun e-mail de support n'est configuré pour l'instant. Tu peux copier les détails puis les envoyer manuellement.");
        return;
      }

      const subject = encodeURIComponent(`[${APP_NAME}] Signalement technique`);
      const body = encodeURIComponent(report);
      window.location.href = `mailto:${TECH_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    });

    errorBannerInitialized = true;
  }
}

function setupTechnicalErrorCapture() {
  window.addEventListener('error', (event) => {
    showTechnicalErrorBanner({
      type: 'error',
      message: event.message || 'Erreur inconnue',
      source: event.filename || '',
      lineno: event.lineno || '',
      colno: event.colno || '',
      stack: event.error?.stack || ''
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    showTechnicalErrorBanner({
      type: 'unhandledrejection',
      message: reason?.message || String(reason || 'Promesse rejetée'),
      source: '',
      lineno: '',
      colno: '',
      stack: reason?.stack || ''
    });
  });
}


function getNotificationAppIds() {
  return Array.isArray(window.NOTIFICATION_APP_IDS) && window.NOTIFICATION_APP_IDS.length
    ? window.NOTIFICATION_APP_IDS
    : [APP_ID];
}

function appStorageKey(appId, key) {
  return `${appId}_${key}`;
}

function appLsGet(appId, key, fallback = null) {
  const value = localStorage.getItem(appStorageKey(appId, key));
  return value !== null ? value : fallback;
}

function appLsSet(appId, key, value) {
  localStorage.setItem(appStorageKey(appId, key), value);
}

function appLsRemove(appId, key) {
  localStorage.removeItem(appStorageKey(appId, key));
}

function getDefiByDayForApp(appId, jourNumero) {
  const defis = window.DEFIS_BY_APP?.[appId];
  if (!Array.isArray(defis)) return null;
  return defis.find(defi => defi.jour === jourNumero) || null;
}

function isProgressPausedForApp(appId) {
  return appLsGet(appId, 'progress_paused', 'false') === 'true';
}


function buildNotificationTargetUrl(appId) {
  const allowedIds = Array.isArray(window.ALLOWED_APP_IDS) ? window.ALLOWED_APP_IDS : [APP_ID];
  const currentUrl = new URL(window.location.href);

  if (allowedIds.length <= 1) {
    currentUrl.searchParams.delete('app');
    return currentUrl.toString();
  }

  currentUrl.searchParams.set('app', appId);
  return currentUrl.toString();
}


async function showDailyWakeNotificationIfNeededForApp(appId) {
  const appConfig = window.APP_CONFIGS?.[appId];
  if (!appConfig) return false;

  if (isProgressPausedForApp(appId)) return false;

  const today = new Date().toLocaleDateString('fr-FR');
  const lastShownKey = 'last_daily_notif_shown';
  const lockKey = 'daily_notif_lock';

  if (appLsGet(appId, lastShownKey) === today) return false;
  if (appLsGet(appId, lockKey) === today) return false;
  appLsSet(appId, lockKey, today);

  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const jourActuel = parseInt(appLsGet(appId, 'jour_actuel', '1'), 10) || 1;
    const defi = getDefiByDayForApp(appId, jourActuel);
    if (!defi) {
      appLsRemove(appId, lockKey);
      return false;
    }

    const notifTitle = `${appConfig.NAME} - Jour ${jourActuel} - ${defi.titre}`;
    const notifBody = (defi.description || '').substring(0, 240);
    const icon192 = appConfig.ICON_192 || './core/assets/icons/default-192.png';
    const targetUrl = buildNotificationTargetUrl(appId);

    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) {
      await reg.showNotification(notifTitle, {
        body: notifBody,
        icon: icon192,
        badge: icon192,
        tag: `${appId}-jour-${jourActuel}`,
        requireInteraction: true,
        data: {
          jour: String(jourActuel),
          url: targetUrl
        }
      });
    } else {
      new Notification(notifTitle, {
        body: notifBody,
        icon: icon192,
        tag: `${appId}-jour-${jourActuel}`
      });
    }

    appLsSet(appId, lastShownKey, today);
    return true;
  } catch (e) {
    appLsRemove(appId, lockKey);
    console.warn(`Notif wake impossible pour ${appId}:`, e);
    return false;
  }
}

async function showDailyWakeNotificationsForConfiguredApps() {
  const appIds = getNotificationAppIds();
  const results = [];

  for (const appId of appIds) {
    const sent = await showDailyWakeNotificationIfNeededForApp(appId);
    results.push({ appId, sent });

    await new Promise(resolve => setTimeout(resolve, 350));
  }

  console.log('🔔 Résultats wake multi-app:', results);
  return results;
}



// === On attend que envol-notifications.js soit chargé :

// Au début de app.js
console.log('🔔 app.js chargement...');

// Attendre que notifications.js soit prêt
function initApp() {
  console.log('🔔 Initialisation app...');

  renderProgramSelector();
  applyAppBranding();

  if (typeof setupNotificationUI === 'function') {
    console.log('✅ notifications disponibles');
  }
}

// Deux méthodes pour attendre
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  setTimeout(initApp, 1000); // Donner du temps à envol-notifications.js
}

console.log("APP_ID:", APP_ID);
console.log("APP_NAME:", APP_NAME);
console.log("DEFIS LOADED:", window.DEFIS?.length);


// ========== FONCTIONS GÉRANT ONESIGNAL ==========

// Fonction sécurisée pour accéder à OneSignal - AMÉLIORÉE
function safeOneSignal() {
    if (typeof OneSignal !== 'undefined' && OneSignal) {
        return OneSignal;
    }
    console.warn('[OneSignal] Pas encore chargé');
    return null;
}

// Fonction pour attendre OneSignal SANS ERREUR
function waitForOneSignal(maxSeconds = 5) {
    return new Promise((resolve) => {
        // Si déjà disponible
        if (typeof OneSignal !== 'undefined' && OneSignal) {
            console.log('[OneSignal] Déjà chargé');
            resolve(OneSignal);
            return;
        }
        
        console.log('[OneSignal] Attente du chargement...');
        
        // Vérifier toutes les 100ms
        let attempts = 0;
        const maxAttempts = maxSeconds * 10; // 10 vérifications par seconde
        
        const interval = setInterval(() => {
            attempts++;
            
            if (typeof OneSignal !== 'undefined' && OneSignal) {
                clearInterval(interval);
                console.log(`[OneSignal] Chargé après ${attempts/10}s`);
                resolve(OneSignal);
                return;
            }
            
            // Timeout après maxSeconds
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn(`[OneSignal] Non chargé après ${maxSeconds}s`);
                resolve(null); // Retourne null au lieu de planter
            }
        }, 100);
    });
}



// ========== DEBUG SIMPLIFIÉ ONESIGNAL ==========
function debugOneSignal() {
  console.log('🔍 [DEBUG] Vérification OneSignal...');
  
  setTimeout(async () => {
    console.log('=== DEBUG ONESIGNAL ===');
    
    try {
      // Vérifier si OneSignal est chargé
      if (typeof OneSignal !== 'undefined') {
        console.log('✅ OneSignal chargé');
        console.log('Version SDK:', OneSignal.VERSION || 'Inconnue');
        
        // Vérifier l'initialisation
        if (OneSignal.config && OneSignal.config.appId) {
          console.log('✅ App ID configuré:', OneSignal.config.appId);
          
          // Vérifier l'abonnement
          try {
            if (OneSignal.User && OneSignal.User.PushSubscription) {
              const isSubscribed = Notification.permission === "granted";
              console.log('🔔 Abonnement actif:', isSubscribed);
              
              if (isSubscribed) {
                console.log('🎉 Prêt pour les notifications push !');
              }
            }
          } catch (e) {
            console.log('⚠️ Impossible de vérifier abonnement:', e.message);
          }
        } else {
          console.log('⚠️ OneSignal pas encore initialisé');
        }
      } else {
        console.log('❌ OneSignal non détecté');
        console.log('Causes possibles:');
        console.log('1. Bloqueur de scripts (uBlock, AdBlock)');
        console.log('2. Firefox avec protection renforcée');
        console.log('3. Connexion lente au CDN');
        
        // Suggestion

        
          
        if (/Firefox/i.test(navigator.userAgent)) {
          console.log('💡 Firefox: Désactivez "Protection renforcée" temporairement');
        }
      }
    } catch (error) {
      console.error('❌ Erreur debug:', error);
    }
    
    console.log('=== FIN DEBUG ===');
  }, 4000); // Attendre 4 secondes
}





// ========== FONCTIONS GLOBALES =====================================
function centrerCalendrierSurJour(jour) {
  const index = jour - 1;
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  const days = grid.children;
  if (days[index]) {
    const row = Math.floor(index / 10);
    grid.scrollTop = row * (50 + 8);
  }
}

function showInstallOverlay() {
  if (lsGet('install_prompt_shown')) return;
  const overlay = document.createElement('div');
  overlay.id = 'install-overlay';
  overlay.innerHTML = `
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:white; padding:30px; border-radius:20px; max-width:400px; text-align:center;">
        <h2>Installer ${INSTALL_APP_NAME} ?</h2>
        <p>Pour un accès rapide depuis ton écran d'accueil,</p>
        <div id="install-instructions">
          <p>👇🏻 clique sur le bouton jaune👇🏻</p>
          <p>"📱 Installer ${INSTALL_APP_NAME} sur l'écran d'accueil"</p>
          <p>ou</p>
          <p><strong>Android :</strong> Menu → "Ajouter à l'écran d'accueil"</p>
          <p><strong>iOS :</strong> Partager → "Sur l'écran d'accueil"</p>
        </div>
        <button id="close-overlay" style="margin-top:20px; padding:10px 20px; background:#0ea5e9; color:white; border:none; border-radius:8px;">
          Compris, merci !
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-overlay').addEventListener('click', () => {
    overlay.remove();
    lsSet('install_prompt_shown', 'true');
  });
  setTimeout(() => {
    if (document.getElementById('install-overlay')) {
      document.getElementById('install-overlay').remove();
      lsSet('install_prompt_shown', 'true');
    }
  }, 10000);
}

async function checkNotificationPermission() {
  try {
    // Attendre que OneSignal soit disponible
    await new Promise(resolve => {
      if (typeof OneSignal !== 'undefined') {
        resolve();
        return;
      }
      
      // Vérifier toutes les 100ms pendant 5 secondes
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (typeof OneSignal !== 'undefined') {
          clearInterval(check);
          resolve();
        }
        if (attempts > 50) { // 5 secondes
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    
    // Si OneSignal est disponible, l'utiliser
    if (typeof OneSignal !== 'undefined') {
      try {
        // Ancienne méthode
        if (typeof OneSignal.isPushNotificationsEnabled === 'function') {
          const isSubscribed = await OneSignal.isPushNotificationsEnabled();
          return isSubscribed ? 'granted' : 'default';
        }
        // Nouvelle méthode
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          const subscription = OneSignal.User.PushSubscription;
          return subscription.optIn ? 'granted' : 'denied';
        }
      } catch (e) {
        console.warn('Erreur OneSignal API:', e);
      }
    }
    
    // Fallback: Notification API native
    if ('Notification' in window) {
      return Notification.permission;
    }
    
    return 'unsupported';
    
  } catch (error) {
    console.warn('Erreur vérification permission:', error);
    return 'unsupported';
  }
}

function detecterAndroidEtNotifications() {
  const androidNotificationSection = document.getElementById('allow-notifications-btn')?.closest('.trouble-item');
  if (androidNotificationSection) {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isiOS) {
      androidNotificationSection.style.display = 'none';
    } else {
      androidNotificationSection.style.display = 'block';
    }
  }
  document.querySelectorAll('.trouble-item').forEach(section => {
    if (section !== androidNotificationSection) {
      section.style.display = 'block';
      section.style.visibility = 'visible';
      section.style.opacity = '1';
    }
  });
}

function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        reg.update();
        setInterval(() => reg.update(), 24 * 60 * 60 * 1000);
      }
    });
  }
}



// ===================================================================
// ========== LOGIQUE PRINCIPALE =====================================
// ========== DÉBUT DU DOM CONTENT LOADED ============================
// ===================================================================


document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Initialisation ${APP_NAME}...`);
      setupTechnicalErrorCapture();
      await loadInstallAppNameFromManifest();
      debugOneSignal();
    

    //=============================================================
    //============ BANNIÈRE OFFLINE-ONLINE ========================
    
      function showNetworkBanner(message, type) {
        // Supprimer ancienne bannière
        const oldBanner = document.getElementById('network-banner');
        if (oldBanner) oldBanner.remove();
        
        // Créer nouvelle bannière
        const banner = document.createElement('div');
        banner.id = 'network-banner';
        banner.className = `network-banner ${type}`;
        banner.textContent = message;
        
        document.body.prepend(banner);
        
        // Si c'est "online", supprimer après 1 seconde
        if (type === 'online') {
          setTimeout(() => {
            banner.remove();
          }, 1000);
        }
      }
  
      // État initial
      if (!navigator.onLine) {
        showNetworkBanner('⚠️ Hors ligne - Mode local activé', 'offline');
      }
      
      // Écouter les changements
      window.addEventListener('online', () => {
        showNetworkBanner('✅ Réseau rétabli !', 'online');
      });
      
      window.addEventListener('offline', () => {
        showNetworkBanner('⚠️ Hors ligne - Mode local activé', 'offline');
      });
    
    //============ FIN DE LA BANNIÈRE OFFLINE-ONLINE ==============
    //=============================================================


  
    // ============================================================
    // ===== DÉCLARATION DES VARIABLES :
    // ================================
      
      // Vérification des boutons
      console.log('=== VÉRIFICATION BOUTONS ===');
      console.log('test-notification-android-btn:', document.getElementById('test-notification-android-btn') ? '✅' : '❌');
      console.log('allow-notifications-btn:', document.getElementById('allow-notifications-btn') ? '✅' : '❌');
      console.log('=== FIN VÉRIFICATION ===');
      
      // Initialiser l'app
      if (typeof initializeApp === 'function') initializeApp();
      
      // Détection Android
      detecterAndroidEtNotifications();
      
      // Éléments DOM
      const currentDayElement = document.getElementById('current-day');
      const dayCurrentElement = document.getElementById('day-current');
      const dayTotalElement = document.getElementById('day-total');
      const challengeTitleElement = document.getElementById('challenge-title');
      const challengeDescriptionElement = document.getElementById('challenge-description');
      const markDoneButton = document.getElementById('mark-done-btn');
      const pauseProgressionButton = document.getElementById('pause-progression-btn');

    let notesSaveTimer = null;
    
    function setNotesStatus(msg) {
      if (!notesStatus) return;
      notesStatus.textContent = msg || '';
    }
      
      // Synchroniser l'affichage avec l'état global (pas de "let" ici : on utilise le jourAffiche global)
      jourAffiche = jourActuel;

      // On vérifie l'état de pause ou d'avancement de chaque progression :
      updatePauseProgressionButton();

      if (pauseProgressionButton && !pauseProgressionButton.dataset.listenerAttached) {
        pauseProgressionButton.dataset.listenerAttached = "true";

        pauseProgressionButton.addEventListener('click', function () {

          const currentlyPaused = isProgressPaused();
          const newPausedState = !currentlyPaused;

          // Si on passe en pause
          if (!currentlyPaused && newPausedState) {

            const jourActuel = parseInt(lsGet('jour_actuel', '1'), 10) || 1;

            let wasCompleted = false;

            if (window.DEFIS && window.DEFIS[jourActuel - 1]) {
              wasCompleted = window.DEFIS[jourActuel - 1].termine === true;
            }

            lsSet('pause_day_was_completed', wasCompleted ? 'true' : 'false');
          }

          setProgressPaused(newPausedState);


          // Si on relance la progression
          if (currentlyPaused && !newPausedState) {

            const wasCompleted = lsGet('pause_day_was_completed', 'false') === 'true';

            if (wasCompleted) {

              let jourActuel = parseInt(lsGet('jour_actuel', '1'), 10) || 1;

              if (window.DEFIS && jourActuel < window.DEFIS.length) {
                jourActuel = jourActuel + 1;
                lsSet('jour_actuel', String(jourActuel));
              }
            }

            // On efface la mémoire de pause
            lsRemove('pause_day_was_completed');
          }


          updatePauseProgressionButton();

          alert(
            newPausedState
              ? `⏸️ La progression ${APP_NAME} est maintenant en pause.`
              : `▶️ La progression ${APP_NAME} reprend à partir d’aujourd’hui.`
          );
          window.location.reload();
        });
      }




      // Listener DU bouton "Marquer comme accompli" (à attacher UNE SEULE FOIS)
        if (markDoneButton && !markDoneButton.dataset.listenerAttached) {
          markDoneButton.dataset.listenerAttached = "true";

          markDoneButton.addEventListener('click', function() {
            try {
              const jourCourant = parseInt(lsGet('jour_actuel', '1'), 10) || 1;
              const jourCible = parseInt(jourAffiche, 10) || jourCourant;

              const defi = getDefiByDay(jourCible);
              if (!defi) return;

              console.log('✅ [VALIDATION] jourCible:', jourCible, 'jourCourant:', jourCourant, 'APP_ID:', APP_ID);

              if (jourCible > jourCourant) {
                alert("⏳ Tu pourras valider ce défi le jour J (ou rattraper un défi passé).");
                return;
              }

              if (jourCible < jourCourant) {
                const madeupDefis = JSON.parse(lsGet('defis_madeup', '[]'));
                if (!madeupDefis.includes(jourCible)) {
                  madeupDefis.push(jourCible);
                  lsSet('defis_madeup', JSON.stringify(madeupDefis));
                  alert("✨ Défi rattrapé avec succès !");
                } else {
                  alert("✨ Ce défi est déjà rattrapé.");
                }
              } else {
                if (!defi.termine) {
                  defi.termine = true;
                  defi.dateValidation = new Date().toISOString();
                  alert("✅ Défi validé ! À demain pour le prochain.");
                } else {
                  alert("✅ Ce défi est déjà accompli.");
                }
              }

              if (typeof saveProgression === 'function') saveProgression();

              afficherDefiDuJour(jourCible);
              if (typeof genererCalendrier === 'function') genererCalendrier();

            } catch (e) {
              console.error("❌ Erreur validation défi:", e);
              alert("Oh mince… une erreur est survenue pendant la validation. Essaie de recharger l’app.");
            }
          });
        }


      // Réception des actions venant du Service Worker (boutons de notification)
      if ('serviceWorker' in navigator && !window.__envolSWMsgListenerAttached) {
        window.__envolSWMsgListenerAttached = true;
      
        navigator.serviceWorker.addEventListener('message', (event) => {
          try {
            const data = event.data || {};
            if (data.action === 'MARK_DONE') {
              const jourNotif = parseInt(data.jour, 10);
              console.log('🔔 [SW->APP] MARK_DONE reçu pour jour:', jourNotif);
      
              if (!isNaN(jourNotif)) {
                // Affiche le bon jour (met à jour jourAffiche)
                afficherDefiDuJour(jourNotif);
      
                // Applique la validation/rattrapage via ton handler existant
                if (markDoneButton) {
                  setTimeout(() => markDoneButton.click(), 0);
                }
              }
            }
          } catch (e) {
            console.error('❌ Erreur message SW:', e);
          }
        });
      }


  
      const calendarGrid = document.getElementById('calendar-grid');
      const notificationTimeSelect = document.getElementById('notification-time');
  
      
    // ========== GESTION DES JOURS (AVEC JOURS MANQUÉS) ==========

 
    
    // Nouvelle propriété : défis "rattrapés" (ratés mais validés après)
    function initMadeupDefis() {
      if (!lsGet('defis_madeup')) {
        lsSet('defis_madeup', JSON.stringify([]));
      }
    }


    //===================================================================
    //======= VÉRIFIER JOURS MANQUÉS ====================================
    // Vérifier et gérer les jours manqués depuis la dernière connexion
    //===================================================================

    
    function verifierJoursManques() {
      const aujourdhui = new Date().toLocaleDateString('fr-FR');
      const dernierAcces = lsGet('dernier_acces');
      
      // Premier accès
      if (!dernierAcces) {
        lsSet('dernier_acces',aujourdhui);
        return jourActuel;
      }

      // Calculer différence en jours
      const date1 = new Date(dernierAcces.split('/').reverse().join('-'));
      const date2 = new Date(aujourdhui.split('/').reverse().join('-'));
      const diffJours = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));

      console.log('📅 Dernier accès:', dernierAcces, 'Différence:', diffJours, 'jours');

      if (diffJours > 0) {
        // Marquer les jours passés comme manqués (sauf si déjà fait ou rattrapé)
        for (let i = 0; i < diffJours && jourActuel + i <= APP.TOTAL_DAYS; i++) {
          const jourAMarquer = jourActuel + i;
          const defi = getDefiByDay(jourAMarquer);

          // Vérifier si déjà rattrapé
          const madeupDefis = JSON.parse(lsGet('defis_madeup', '[]'));
          const estDejaRattrape = madeupDefis.includes(jourAMarquer);

          if (defi && !defi.termine && !estDejaRattrape) {
            console.log(`❌ Jour ${jourAMarquer} marqué comme manqué`);
            // On ne change pas defi.termine ici, on utilise juste la classe CSS
          }
        }

        // Mettre à jour le dernier accès
        lsSet('dernier_acces',aujourdhui);
      }

      return jourActuel;
    }

      //===================================================================
      //======= FIN DE 'VÉRIFIER JOURS MANQUÉS' =============================
      //===================================================================


      // Fonction originale anti-speed running (conservée)
      function peutPasserAuJourSuivant() {
        const aujourdhui = new Date().toLocaleDateString('fr-FR');
        const dernierChangement = lsGet('dernier_changement_jour');

        // DEBUG
        console.log('📅 [DEBUG] Vérification avancement:', {
          aujourdhui,
          dernierChangement,
          sontIdentiques: dernierChangement === aujourdhui,
          jourActuel: parseInt(lsGet('jour_actuel', '1'))
        });

         // ✅ Premier accès : on initialise, mais on N'AVANCE PAS
        if (!dernierChangement) {
          console.log('✅ Premier accès - initialisation (pas d’avancement)');
          lsSet('dernier_changement_jour',aujourdhui);
          return false;
        }


        // Autoriser si dates différentes
        if (dernierChangement !== aujourdhui) {
          console.log('✅ Nouveau jour - autorisé');
          return true; // pas d'écriture ici
        }

        console.log('❌ Même jour - bloqué');
        return false;
      }

//==== PROTECTION pour bonne lecture des dates même en cas de changement futur ou autre formatage de dates :
  // parseDateFRSafe() sert à lire/convertir une string en Date :
  function parseDateFRSafe(str) {
    if (!str) return null;
    const m = String(str).trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    // Midi pour éviter les soucis de changement d’heure
    return new Date(yyyy, mm - 1, dd, 12, 0, 0);
  }

  // Ici on génère une string de date “canonique” pour comparer
  function getDateStrFR(date = new Date()) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  //======FIN de la protection du helper


function verifierEtAvancerJour() {
  if (isProgressPaused()) {
    console.log(`⏸️ [${APP_NAME}] progression en pause : aucun avancement du jour`);
    return;
  }
  try {
    let jour = parseInt(lsGet('jour_actuel', '1'), 10);
    if (!jour || isNaN(jour)) jour = 1;

    // On synchronise la variable globale
    const ancienJourActuel = jourActuel;
    jourActuel = jour;

    // (si tu as cette fonction, garde-la)
    if (typeof verifierJoursManques === 'function') {
      verifierJoursManques();
    }

    console.log('🚀 [DEBUG] verifierEtAvancerJour appelé');
    console.log('   Jour actuel (stocké):', jourActuel);

    // ======= NOUVEAU : calcul delta jours (multi-jours) =======
    const aujourdhuiStr = new Date().toLocaleDateString('fr-FR'); // "dd/mm/yyyy"
    const dernierStr = lsGet('dernier_changement_jour'); // "dd/mm/yyyy" ou null

    console.log('   Date aujourd’hui:', aujourdhuiStr);
    console.log('   Dernier changement:', dernierStr);

    // Premier lancement : on pose juste la référence, sans avancer
    if (!dernierStr) {
      lsSet('dernier_changement_jour',aujourdhuiStr);
      console.log('✅ Premier lancement : dernier_changement_jour initialisé (pas d’avancement)');
    } else {
      // Si la date a changé, on calcule combien de jours se sont écoulés
      if (dernierStr !== aujourdhuiStr) {
        // Parse FR "dd/mm/yyyy" -> Date à MIDI (évite bugs changement d’heure)
        const ancienneDate = parseDateFRSafe(dernierStr);
        const nouvelleDate = parseDateFRSafe(aujourdhuiStr);

        if (!ancienneDate || !nouvelleDate) {
          console.warn('⚠️ Date invalide détectée -> resync dernier_changement_jour', { dernierStr, aujourdhuiStr });
          lsSet('dernier_changement_jour',aujourdhuiStr);
          return jourActuel; // on ne casse pas l’app
        }


        const diffMs = nouvelleDate.getTime() - ancienneDate.getTime();
        const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        console.log('📅 [DEBUG] Différence réelle en jours:', diffJours);

        if (diffJours > 0) {
          const nouveauJour = Math.min(APP.TOTAL_DAYS, jourActuel + diffJours);
          if (nouveauJour !== jourActuel) {
            jourActuel = nouveauJour;
            lsSet('jour_actuel',String(jourActuel));
            console.log(`🎯 AVANCÉ de ${diffJours} jour(s) -> jour_actuel:`, jourActuel);
          } else {
            console.log('⏸️ Déjà au max (APP.TOTAL_DAYS), pas d’avancement');
          }

          // Important : on met à jour la date de référence
          lsSet('dernier_changement_jour',aujourdhuiStr);
        } else {
          console.log('⏸️ Date différente mais diffJours <= 0 (heure/date système ?) — pas d’avancement');
          // On peut quand même resynchroniser la date si tu veux être stricte :
          // lsSet('dernier_changement_jour',aujourdhuiStr);
        }
      } else {
        console.log('❌ Même jour - bloqué');
      }
    }
    // ======= FIN NOUVEAU =======




    // ✅ Ne change l’écran que si l’utilisateur regardait le jour J (ou si rien n’est affiché)
    if (!jourAffiche) {
      jourAffiche = jourActuel;
      afficherDefiDuJour(jourActuel);
    } else if (jourAffiche === ancienJourActuel && jourActuel !== ancienJourActuel) {
      afficherDefiDuJour(jourActuel); // mettra jourAffiche = jourActuel
    } else {
      console.log('👀 Affichage conservé sur jourAffiche:', jourAffiche);
    }

    // Rafraîchir le calendrier
    if (typeof genererCalendrier === 'function') {
      genererCalendrier();
    }

    return jourActuel;
  } catch (e) {
    console.error('❌ Erreur verifierEtAvancerJour:', e);
    return jourActuel;
  }
} // Fin de VérifierEtAvancerJour

// ===== FIN de Notification Jouralière à l'ouverture de l'app ===== //

// ===== Notes (stockées localement) =====
const NOTES_KEY = 'notes';

function getAllNotes() {
  try { return JSON.parse(lsGet(NOTES_KEY, '{}')); }
  catch { return {}; }
}

function getNoteForDay(day) {
  const notes = getAllNotes();
  return notes[String(day)] || '';
}

function setNoteForDay(day, text) {
  const notes = getAllNotes();
  const k = String(day);
  const v = String(text || '');

  if (v.trim() === '') {
    delete notes[k];
  } else {
    notes[k] = v;
  }
  lsSet(NOTES_KEY, JSON.stringify(notes));
}

// ===== Fin des Notes (stockées localement) =====


    // ========== FONCTIONS D'AFFICHAGE (MODIFIÉES) ==========

  function afficherDefiDuJour(jour) {
      const defi = getDefiByDay(jour);
      if (!defi) return;


    // Pour que quand on clique un jour du calendrier ou quand le jour avance,
    // les notes affichées suivent: ==========================================
      const notesTextarea = document.getElementById('notes-textarea');
      const notesStatus = document.getElementById('notes-status');
      if (notesTextarea) notesTextarea.value = getNoteForDay(jour);
      if (notesStatus) notesStatus.textContent = '';
    // =======================================================================

      jourAffiche = jour; // 👈 IMPORTANT


      if (currentDayElement) currentDayElement.textContent = jour;
      if (dayCurrentElement) dayCurrentElement.textContent = jour;
      if (dayTotalElement) dayTotalElement.textContent = String(APP.TOTAL_DAYS || 0);
      if (challengeTitleElement) challengeTitleElement.textContent = defi.titre;
      if (challengeDescriptionElement) challengeDescriptionElement.textContent = defi.description;


  // Notes : charger celles du jour affiché
  if (notesTextarea) notesTextarea.value = getNoteForDay(jour);
  if (notesStatus) notesStatus.textContent = '';

  // ✅ Mettre à jour le bouton selon l'état du jour affiché
  updateMarkDoneButtonUI(jour);
  refreshNotesUIForDay(jour);

  console.log("📌 afficherDefiDuJour appelé avec:", jour, "=> jourAffiche =", jourAffiche);
  }




 function updateMarkDoneButtonUI(jour) {
    if (!markDoneButton) return;

    const jourCourant = parseInt(jourActuel, 10) || 1;
    const jourCible = parseInt(jour, 10);
    const defi = getDefiByDay(jourCible);
    if (!defi || isNaN(jourCible)) return;

    const madeupDefis = JSON.parse(lsGet('defis_madeup', '[]'));
    const estRattrape = madeupDefis.includes(jourCible);

    // Nettoyer les états couleur précédents (on garde tes classes de base)
    markDoneButton.classList.remove(
      'mark-future', 'mark-rattraper', 'mark-madeup', 'mark-done', 'mark-default'
    );

    // Par défaut
    let label = "✅ Marquer comme accompli";
    let disabled = false;
    let stateClass = "mark-default";

    if (jourCible > jourCourant) {
      label = "⏳ Disponible le jour J";
      disabled = true;
      stateClass = "mark-future";     // gris
    } else if (defi.termine) {
      label = "✅ Accompli !";
      disabled = true;
      stateClass = "mark-done";       // (tu peux laisser vert ou neutre)
    } else if (estRattrape) {
      label = "✨ Déjà rattrapé";
      disabled = true;
      stateClass = "mark-madeup";     // jaune
    } else if (jourCible < jourCourant) {
      label = "✨ Rattraper ce défi";
      stateClass = "mark-rattraper";  // rouge
    }

    markDoneButton.textContent = label;
    markDoneButton.disabled = disabled;
    markDoneButton.classList.add(stateClass);
  }






    function genererCalendrier() {
      if (!calendarGrid) return;
      calendarGrid.innerHTML = '';

      // Initialiser les défis rattrapés
      initMadeupDefis();
      const madeupDefis = JSON.parse(lsGet('defis_madeup', '[]'));

      for (let jour = 1; jour <= APP.TOTAL_DAYS; jour++) {
        const defi = getDefiByDay(jour);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = jour;

        const estDejaRattrape = madeupDefis.includes(jour);

        if (defi.termine) {
          dayElement.classList.add('completed'); // Vert
        } else if (estDejaRattrape) {
          dayElement.classList.add('madeup'); // Jaune (rattrapé)
        } else if (jour === jourActuel) {
          dayElement.classList.add('current'); // Bleu
        } else if (jour < jourActuel && !defi.termine && !estDejaRattrape) {
          dayElement.classList.add('missed'); // Rouge (raté)
        } else {
          dayElement.classList.add('upcoming'); // Gris
        }

        dayElement.addEventListener('click', () => afficherDefiDuJour(jour));
        calendarGrid.appendChild(dayElement);
      }
      centrerCalendrierSurJour(jourActuel);
    }



        // ========== RÉGLAGES UI ==========
    // ✅ Le listener "markDoneButton" est attaché plus haut UNE SEULE FOIS
    // (celui qui gère jourAffiche/jourCible et le rattrapage)

    // Sélecteur d'heure de notification (1 seul listener)
    if (notificationTimeSelect && !notificationTimeSelect.dataset.listenerAttached) {
      notificationTimeSelect.dataset.listenerAttached = "true";

      const heureSauvegardee = localStorage.getItem('heure_notification') || '08:00';
      notificationTimeSelect.value = heureSauvegardee;

      notificationTimeSelect.addEventListener('change', function() {
        localStorage.setItem(STORAGE_PREFIX + 'heure_notification', notificationTimeSelect.value);
        console.log('⏰ Heure de notification sauvegardée:', notificationTimeSelect.value);
      });
    }


// ========== NOTES (par jour) ==========

    // 1) Références DOM
    const notesTextarea = document.getElementById('notes-textarea');
    const clearNotesBtn = document.getElementById('clear-notes-btn');
    const notesStatusEl = document.getElementById('notes-status');
    notesSaveTimer = null;

    // 2) Helpers stockage
    function getNotesMap() {
      try {
        return JSON.parse(lsGet('notes_by_day', '{}'));
      } catch {
        return {};
      }
    }

    function setNotesMap(map) {
      lsSet('notes_by_day', JSON.stringify(map));
    }

    function getNoteForDay(day) {
      const map = getNotesMap();
      return map[String(day)] || '';
    }

    function setNoteForDay(day, text) {
      const map = getNotesMap();
      const key = String(day);
      if (!text || !text.trim()) {
        delete map[key];
      } else {
        map[key] = text;
      }
      setNotesMap(map);
    }

    function setNotesStatus(msg) {
      if (!notesStatusEl) return;
      notesStatusEl.textContent = msg || '';
    }

    // 3) Charger les notes du jour affiché (à appeler quand on change de jour)
    function refreshNotesUIForDay(day) {
      if (!notesTextarea) return;
      notesTextarea.value = getNoteForDay(day);
      setNotesStatus('');
    }

    // 4) Listeners
    if (notesTextarea) {
      notesTextarea.addEventListener('input', () => {
        const day =
          parseInt(jourAffiche, 10) ||
          (parseInt(lsGet('jour_actuel', '1'), 10) || 1);

        setNotesStatus('Sauvegarde…');
        clearTimeout(notesSaveTimer);

        notesSaveTimer = setTimeout(() => {
          setNoteForDay(day, notesTextarea.value);
          setNotesStatus('✅ Sauvegardé');
          setTimeout(() => setNotesStatus(''), 1500);
        }, 350);
      });
    }

    if (clearNotesBtn && notesTextarea) {
      clearNotesBtn.addEventListener('click', () => {
        const day =
          parseInt(jourAffiche, 10) ||
          (parseInt(lsGet('jour_actuel', '1'), 10) || 1);

        if (!confirm('Effacer les notes de ce jour ?')) return;

        notesTextarea.value = '';
        setNoteForDay(day, '');
        setNotesStatus('🧹 Notes effacées');
        setTimeout(() => setNotesStatus(''), 1500);
      });
    }

    // 5) Premier chargement (jour actuel affiché au démarrage)
    refreshNotesUIForDay(jourAffiche);

// =========== NOTES fin =================



      // ========== BOUTONS DÉPANNAGE ==========

      // 1. VIDER LE CACHE
      document.getElementById('clear-cache-btn')?.addEventListener('click', async function () {
        const btn = this;
        const originalText = btn.textContent;

        const confirmed = confirm(
          "Tu vas vider le cache de l'application et recharger la page. Continuer ?"
        );
        if (!confirmed) return;

        btn.disabled = true;
        btn.textContent = "🧹 Nettoyage...";

        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }

          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          console.log("✅ Cache et Service Workers supprimés");

          // Petit délai pour laisser le navigateur finir le nettoyage
          setTimeout(() => {
            window.location.reload();
          }, 300);

        } catch (error) {
          console.error("❌ Erreur pendant le nettoyage du cache :", error);
          alert("Le nettoyage du cache a rencontré un problème. Tu peux réessayer.");
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });



      // 4. EXPORTER SAUVEGARDE
      document.getElementById('export-backup-btn')?.addEventListener('click', function() {
        const backupData = {
        version: '1.0',
        appId: APP_ID,
        appName: APP_NAME,
        timestamp: new Date().toISOString(),
        progression: JSON.parse(lsGet('defis_progression', '[]')),
        jourActuel: lsGet('jour_actuel', '1'),
        dernierChangement: lsGet('dernier_changement_jour', null),
        heureNotification: lsGet('heure_notification', '08:00'),
        notesByDay: JSON.parse(lsGet('notes_by_day', '{}')),
      };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sauvegarde-${APP_ID}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Sauvegarde exportée !');
      });



      // 5. IMPORTER SAUVEGARDE
      document.getElementById('import-backup-btn')?.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(event) {
            try {
              const backupData = JSON.parse(event.target.result);
              if (backupData.appId && backupData.appId !== APP_ID) {
                alert(`⚠️ Cette sauvegarde appartient au programme ${backupData.appId}, pas à ${APP_ID}.`);
                return;
              }
              if (!backupData.progression || !backupData.jourActuel) throw new Error('Format invalide');
              if (confirm(`Importer la sauvegarde du ${new Date(backupData.timestamp).toLocaleDateString('fr-FR')} ?`)) {
              lsSet('defis_progression', JSON.stringify(backupData.progression));
              lsSet('jour_actuel', backupData.jourActuel);
              if (backupData.dernierChangement) lsSet('dernier_changement_jour', backupData.dernierChangement);
              if (backupData.heureNotification) lsSet('heure_notification', backupData.heureNotification);

              // ✅ Notes (par jour)
              if (backupData.notesByDay) {
                lsSet('notes_by_day', JSON.stringify(backupData.notesByDay));
              } else if (backupData.notes) {
                // Compatibilité ancienne sauvegarde "notes"
                // Si c'était une string -> on la met sur le jourActuel importé
                if (typeof backupData.notes === 'string') {
                  const day = String(backupData.jourActuel || 1);
                  lsSet('notes_by_day', JSON.stringify({ [day]: backupData.notes }));
                } else if (typeof backupData.notes === 'object') {
                  // Si c'était déjà un map -> on le reprend tel quel
                  lsRemove('notes_by_day');
                }
              } else {
                lsRemove('notes_by_day');
              }

              // (Optionnel) on supprime l’ancienne clé si tu veux éviter la confusion
              lsRemove('notes');

              alert('✅ Progression importée !');
              window.location.reload();
              }
            } catch (error) {
              console.error('Erreur import:', error);
              alert('❌ Fichier invalide.');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });

      // 6. SUPPRIMER PROGRESSION
      document.getElementById('reset-progress-btn')?.addEventListener('click', function() {
        if (!confirm(`ÊTES-VOUS ABSOLUMENT SÛR ?\n\nToute la progression du programme ${APP_NAME} sera effacée.`)) return;
        if (!confirm(`DERNIÈRE CHANCE : "Annuler" pour garder ${APP_NAME}, "OK" pour supprimer.`)) return;

        const wasPaused = isProgressPaused();

        window.DEFIS.forEach(defi => {
          defi.termine = false;
          defi.dateValidation = null;
        });

        if (typeof saveProgression === 'function') saveProgression();

        lsSet('jour_actuel', '1');

        const aujourdhui = new Date().toLocaleDateString('fr-FR');
        lsSet('dernier_changement_jour', aujourdhui);
        lsSet('dernier_acces', aujourdhui);
        lsSet('heure_notification', '08:00');
        lsSet('defis_madeup', JSON.stringify([]));
        lsSet('notes_by_day', JSON.stringify({}));
        lsRemove('notes');
        lsRemove('install_prompt_shown');
        lsSet('progress_paused', wasPaused ? 'true' : 'false');

        alert(`🗑️ Progression ${APP_NAME} supprimée.`);
        window.location.reload();
      });



      // ========== EXPORTS DEBUG (dans le bon scope) ==========
      window.verifierEtAvancerJour = verifierEtAvancerJour;
      window.peutPasserAuJourSuivant = peutPasserAuJourSuivant;

      console.log('🔧 Exports debug (initApp):', {
        verifierEtAvancerJour: typeof window.verifierEtAvancerJour,
        peutPasserAuJourSuivant: typeof window.peutPasserAuJourSuivant
      });

      // ========== INITIALISATION FINALE ==========

      // On vérifie d'abord le jour avant d'avancer :
      // On vérifie d'abord le jour avant d'avancer :
      verifierEtAvancerJour();

      const jourActuelApresSync = parseInt(lsGet('jour_actuel', '1'), 10) || 1;
      jourActuel = jourActuelApresSync;
      jourAffiche = jourActuelApresSync;

      // Toujours afficher le défi du jour
      afficherDefiDuJour(jourActuelApresSync);

      // Toujours générer le calendrier, même si la progression est en pause
      if (typeof genererCalendrier === 'function') {
        genererCalendrier();
      }

      showDailyWakeNotificationsForConfiguredApps().then(results => console.log('🔔 Notifs wake envoyées ?', results));



      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('👁️ [APP] Retour au premier plan -> resync jour');
          verifierEtAvancerJour();
          showDailyWakeNotificationsForConfiguredApps();
        }
      });

    
    // ===================================================================================
    // ========== GESTION PWA ============================================================
        
    let deferredPrompt;
    const installButton = document.createElement('button');
    installButton.id = 'install-pwa-btn';
    installButton.className = 'install-btn';
    installButton.textContent = `📱 Installer ${INSTALL_APP_NAME} sur l'écran d'accueil`;
    installButton.style.cssText = `
      display: none;
      width: calc(100% - 40px);
      max-width: 400px;
      margin: 20px auto 50px auto;
      background: linear-gradient(160deg, #f29a0b 0%, #ed5d0e 100%);
      color: white;
      border: none;
      padding: 16px 24px;
     border-radius: 12px;
     font-weight: bold;
     font-size: 1.1rem;
     cursor: pointer;
     text-align: center;
     box-shadow: 0 4px 15px rgba(11, 37, 47, 0.3);
     transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    
        
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('👍 beforeinstallprompt déclenché');
      event.preventDefault();
      deferredPrompt = event;
      installButton.style.display = 'block';
      const footer = document.querySelector('.app-footer');
      if (footer) {
        const footerContent = footer.querySelector('.footer-content');
        if (footerContent) {
          footer.insertBefore(installButton, footerContent);
        } else {
          footer.prepend(installButton);
        }
      }
    });
    
        
    
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        alert("Pour installer l'application :\n\n1. Sur Android : menu → \"Ajouter à l'écran d'accueil\"\n2. Sur iOS : utilisez le bouton Partager (📤) de Safari → \"Sur l'Écran d'Accueil\"");
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Choix utilisateur : ${outcome}`);
      deferredPrompt = null;
      installButton.style.display = 'none';
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installée avec succès !');
      installButton.style.display = 'none';
    });
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 App déjà installée');
      installButton.style.display = 'none';
    }

    
    //=============== CHARGEMENT DU MODULE DE NOTIFICATION ===============
    //====================================================================

    // Charger le module notifications UNIQUEMENT si OneSignal est disponible
setTimeout(() => {
  if (typeof OneSignal !== 'undefined' || typeof window.OneSignalGlobal !== 'undefined') {
    console.log('🔔 Chargement module notifications...');
    const script = document.createElement('script');
    // script.src = '/sekhamet-envol/envol-notifications.js';
    script.onload = () => console.log('✅ Module notifications chargé');
    document.head.appendChild(script);
  } else {
    console.warn('⚠️ OneSignal non disponible - notifications désactivées');
  }
}, 3000);


});

//============ FIN DU DOM CONTENT LOADED ===================

// ====== Notification journalière au réveil de l'app (1 fois / jour) ======
    async function showDailyWakeNotificationIfNeeded() {
      if (isProgressPaused()) return false;
      const today = new Date().toLocaleDateString('fr-FR');

      // Déjà montré aujourd'hui -> stop
      if (lsGet('last_daily_notif_shown') === today) return false;

      // Anti-double déclenchement la même seconde (DOMContentLoaded + visibilitychange)
      const lockKey = 'daily_notif_lock';
      if (lsGet(lockKey) === today) return false;
      lsSet(lockKey, today);
    
      if (!('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;
    
      try {
        // ✅ Priorité: notif riche via ton pipeline existant
        if (typeof window.envoyerNotificationDuJour === 'function') {
          await window.envoyerNotificationDuJour();
          lsSet('last_daily_notif_shown', today);
          return true;
        }
    
        // ✅ Fallback minimaliste (SEULEMENT si la riche n'est pas dispo)
        const reg = await navigator.serviceWorker?.getRegistration?.();
        const ICON_192 = APP.ICON_192 || "./core/assets/icons/default-192.png";
        if (reg?.showNotification) {
          await reg.showNotification((APP.NOTIF_TITLE || `${APP_NAME} — Défi du jour`), {
            body: "Ton défi du jour t’attend ✨",
            icon: ICON_192,
            badge: ICON_192,
            tag: `${APP_ID}-daily`,
            renotify: false
          });
          lsSet('last_daily_notif_shown', today);
          return true;
        }
    
        // Dernier fallback: Notification directe
        new Notification((APP.NOTIF_TITLE || `${APP_NAME} — Défi du jour`), {
          body: "Ton défi du jour t’attend ✨",
          tag: "envol-daily"
        });
        lsSet('last_daily_notif_shown', today);
        return true;
      } catch (e) {
        // si échec -> on retire le lock pour retenter au prochain wake
        lsRemove(lockKey);
        console.warn("Notif wake impossible:", e);
        return false;
      }
    } // FIn des Notification journalières au réveil de l'app

window.showDailyWakeNotificationIfNeeded = showDailyWakeNotificationIfNeeded;
window.showDailyWakeNotificationIfNeededForApp = showDailyWakeNotificationIfNeededForApp;
window.showDailyWakeNotificationsForConfiguredApps = showDailyWakeNotificationsForConfiguredApps;


//==========================================================
//================== DEBOGG SECTION =========================

// Export de la fonction getDefiByDay() pour l'utiliser dans envol-notifications.js
window.getDefiByDay = getDefiByDay;
console.log('✅ getDefiByDay exposée globalement');

console.log('✅ app.js chargé complètement');

// Déclencher l'événement pour signaler que app.js est prêt
window.dispatchEvent(new Event('app-ready'));

// ===== Export / Debug =====

// Exposer getDefiByDay (utile pour tests et notifications)
if (typeof getDefiByDay === 'function') {
  window.getDefiByDay = getDefiByDay;
}

console.log('📋 Fonctions disponibles:', {
  getDefiByDay: typeof getDefiByDay,
  envoyerNotificationDuJour_local: typeof envoyerNotificationDuJour,
  envoyerNotificationDuJour_window: typeof window.envoyerNotificationDuJour
});

// Expositions globales sécurisées (évite ReferenceError si fonctions non globales)
if (typeof peutPasserAuJourSuivant === 'function') {
  window.peutPasserAuJourSuivant = peutPasserAuJourSuivant;
}
if (typeof verifierEtAvancerJour === 'function') {
  window.verifierEtAvancerJour = verifierEtAvancerJour;
}


console.log('🔧 Fonctions debug app.js exposées:');
console.log('- peutPasserAuJourSuivant()');
console.log('- verifierEtAvancerJour()');

})();
