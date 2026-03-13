// config.js (dans sekhamet-enveloppe/)

/* =========================================================
   CONFIGURATION DE L'APPLICATION
   ========================================================= */

const urlParams = new URLSearchParams(window.location.search);
const appFromUrl = urlParams.get("app");

/* =========================================================
   CONFIGURATION DES PROGRAMMES À AFFICHER
   ========================================================= */

// CHANGER CETTE VARIABLE pour choisir les pages gérées par l'app :
// variables possibles : ["origine", "enveloppe", "emergence"]
// puis quand les paramètres seront entrés "fondement" (pour la mini-app bonus sur la préparation de notre environnement pour bien vivre le programme principal) et éventuellement "envol"
window.ALLOWED_APP_IDS = ["fondation","origine", "enveloppe", "emergence","envol","reset"];
// Les notifications suivent exactement les mêmes pages
window.NOTIFICATION_APP_IDS = window.ALLOWED_APP_IDS;

// CHANGER CETTE VARIABLE pour choisir la PAGE PAR DÉFAUT vers laquelle on est redirigé en cas de soucis :
window.DEFAULT_APP_ID = "fondation";
window.TECH_SUPPORT_EMAIL = "contact@sekhamet.com";


// OneSignal : laisser sur false tant que tu veux seulement les notifs natives
window.ENABLE_ONESIGNAL = false;

// Programme actif
window.APP_ID = window.ALLOWED_APP_IDS.includes(appFromUrl)
  ? appFromUrl
  : window.DEFAULT_APP_ID;


/* =========================================================
   CONFIGURATION DES PROGRAMMES
   ========================================================= */

window.APP_CONFIGS = {
  envol: {
    ID: "envol",
    NAME: "ENVOL",
    STORAGE_PREFIX: "envol_",
    CACHE_NAME: "envol-pwa-v1",
    ICON_192: "./core/assets/icons/ENVOL-192.png",
    ICON_512: "./core/assets/icons/ENVOL-512.png",
    NOTIF_TITLE: "ENVOL — Défi du jour",
    INSTALL_TITLE: "Installer ENVOL ?",
    INSTALL_LABEL: "📱 Installer ENVOL sur l'écran d'accueil",
    MAIN_TITLE: "Comprendre et utiliser les mécanismes de mon corps et de mon esprit en 77 jours",
    BROWSER_TITLE: "ENVOL - Défi Quotidien",
    TOTAL_DAYS: 77,
    SUPPORT_URL: "https://coaching.sekhamet.com/school/course/envol/"
  },

  origine: {
    ID: "origine",
    NAME: "ORIGINE",
    STORAGE_PREFIX: "origine_",
    CACHE_NAME: "origine-pwa-v1",
    ICON_192: "./core/assets/icons/ORIGINE-192.png",
    ICON_512: "./core/assets/icons/ORIGINE-512.png",
    NOTIF_TITLE: "ORIGINE — Défi du jour",
    INSTALL_TITLE: "Installer ORIGINE ?",
    INSTALL_LABEL: "📱 Installer ORIGINE sur l'écran d'accueil",
    MAIN_TITLE: "Vers une alimentation consciente en 21 jours",
    BROWSER_TITLE: "ORIGINE - Défi Quotidien",
    TOTAL_DAYS: 21,
    SUPPORT_URL: "https://coaching.sekhamet.com/school/course/origine/"
  },

  enveloppe: {
    ID: "enveloppe",
    NAME: "ENVELOPPE",
    STORAGE_PREFIX: "enveloppe_",
    CACHE_NAME: "enveloppe-pwa-v1",
    ICON_192: "./core/assets/icons/ENVELOPPE-192.png",
    ICON_512: "./core/assets/icons/ENVELOPPE-512.png",
    NOTIF_TITLE: "ENVELOPPE — Défi du jour",
    INSTALL_TITLE: "Installer ENVELOPPE ?",
    INSTALL_LABEL: "📱 Installer ENVELOPPE sur l'écran d'accueil",
    MAIN_TITLE: "Je fais de mon corps mon Sanctuaire en 30 jours",
    BROWSER_TITLE: "ENVELOPPE - Défi Quotidien",
    TOTAL_DAYS: 31,
    SUPPORT_URL: "https://coaching.sekhamet.com/school/course/enveloppe/"
  },

  emergence: {
    ID: "emergence",
    NAME: "EMERGENCE",
    STORAGE_PREFIX: "emergence_",
    CACHE_NAME: "emergence-pwa-v1",
    ICON_192: "./core/assets/icons/EMERGENCE-192.png",
    ICON_512: "./core/assets/icons/EMERGENCE-512.png",
    NOTIF_TITLE: "EMERGENCE — Défi du jour",
    INSTALL_TITLE: "Installer EMERGENCE ?",
    INSTALL_LABEL: "📱 Installer EMERGENCE sur l'écran d'accueil",
    MAIN_TITLE: "Je fais de mon Inconscient mon Allié évolutif en 66 jours",
    BROWSER_TITLE: "EMERGENCE - Défi Quotidien",
    TOTAL_DAYS: 62,
    SUPPORT_URL: "https://coaching.sekhamet.com/school/course/emergence/"
  },

reset: {
    ID: "reset",
    NAME: "RESET",
    STORAGE_PREFIX: "reset_",
    CACHE_NAME: "reset-pwa-v1",
    ICON_192: "./core/assets/icons/RESET-192.png",
    ICON_512: "./core/assets/icons/RESET-512.png",
    NOTIF_TITLE: "RESET — Défi du jour",
    INSTALL_TITLE: "Installer RESET ?",
    INSTALL_LABEL: "📱 Installer RESET sur l'écran d'accueil",
    MAIN_TITLE: "Reviens à toi, un pas à la fois.",
    BROWSER_TITLE: "RESET - Défi Quotidien",
    TOTAL_DAYS: 25,
    SUPPORT_URL: NaN
  },
  fondation: {
    ID: "fondation",
    NAME: "FONDATION",
    STORAGE_PREFIX: "fondation_",
    CACHE_NAME: "fondation-pwa-v1",
    ICON_192: "./core/assets/icons/FONDATION-192.png",
    ICON_512: "./core/assets/icons/FONDATION-512.png",
    NOTIF_TITLE: "FONDATION — Défi du jour",
    INSTALL_TITLE: "Installer FONDATION ?",
    INSTALL_LABEL: "📱 Installer FONDATION sur l'écran d'accueil",
    MAIN_TITLE: "Prépare ton terrain",
    BROWSER_TITLE: "FONDATION - Défi Quotidien",
    TOTAL_DAYS: 7,
    SUPPORT_URL: "https://github.com/Iscobia/base-pwa-coaching/blob/main/data/FONDATION_Support.pdf"
  },
};


/* =========================================================
   CONFIG ACTIVE
   ========================================================= */

window.APP_CONFIG = window.APP_CONFIGS[window.APP_ID] || window.APP_CONFIGS.enveloppe;
