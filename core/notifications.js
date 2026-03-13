// envol-notifications.js - Version corrigée pour OneSignal
console.log('🔔 [Notifications] Chargement du module...');

// Préférence utilisateur (ON/OFF) pour les rappels (indépendant de la permission navigateur)
const APP = window.APP_CONFIG || {};
const APP_ID = APP.ID || 'app';
const APP_NAME = APP.NAME || 'APP';
const STORAGE_PREFIX = APP.STORAGE_PREFIX || `${APP_ID}_`;
const APP_ICON_192 = APP.ICON_192 || './core/assets/icons/default-192.png';
const APP_ICON_512 = APP.ICON_512 || APP_ICON_192;

const NOTIF_PREF_KEY = `${STORAGE_PREFIX}notifications_enabled`;
const ENABLE_ONESIGNAL = window.ENABLE_ONESIGNAL === true;

function notifLsGet(key, fallback = null) {
  const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return value !== null ? value : fallback;
}

function notifLsSet(key, value) {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
}

function isProgressPaused() {
  return notifLsGet('progress_paused', 'false') === 'true';
}



// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔔 [Notifications] DOM chargé, initialisation...');

   
  // ✅ Mettre à jour le toggle tout de suite (sans attendre OneSignal)
  updateToggleButton();
  
  // Initialiser après un délai pour laisser OneSignal se charger
  setTimeout(initEnvolNotifications, 2000);
});



// ===========================================================================
// DEBUG: SURVEILLANCE DES BOUTONS et FONCTIONS UTILITAIRES
// ===========================================================================

console.log('🔍 Boutons trouvés:', {
  toggle: !!document.getElementById('notifications-toggle-btn'),
  allow: !!document.getElementById('allow-notifications-btn'),
  test: !!document.getElementById('test-notification-android-btn')
});

    // ==============================================================
    // =====  Préparation de l'update du bouton d'abonnement :
    // ===== Fonction de test d'abonnement OneSignal améliorée

    function debugOneSignalState() {
      console.log('=== DEBUG ÉTAT ONESIGNAL ===');
      if (!ENABLE_ONESIGNAL) {
        console.warn('🛑 OneSignal désactivé -> debugOneSignalState ignoré');
        return;
      }
      
      // 1. Permission native
      console.log('1. Notification.permission:', Notification.permission);
      
      if (typeof OneSignal !== 'undefined') {
        console.log('2. OneSignal disponible');
        
        // 2a. Notifications API
        console.log('3. OneSignal.Notifications:', OneSignal.Notifications);
        console.log('4. OneSignal.Notifications.permission:', OneSignal.Notifications?.permission);
        
        // 2b. Subscription
        const sub = OneSignal.User?.PushSubscription;
        console.log('5. OneSignal.User.PushSubscription:', sub);
        
        if (sub) {
          console.log('6. Détails subscription:');
          // Affiche toutes les propriétés (même privées)
          console.log('   - raw object:', JSON.stringify(sub, null, 2));
          
          // Teste optIn()
          console.log('   - optIn available?', typeof sub.optIn === 'function');
        }
      }
      
      console.log('=== FIN DEBUG ===');
    }
    
    // Exécutez (si on veut que OneSignal s'active)
    // debugOneSignalState(); // désactivé en prod / tant que OneSignal off





//===========================================================================
// 1. Fonction principale d'initialisation


    async function initEnvolNotifications() {
      console.log('🔔 [Notifications] Début initialisation...');

      try {
        if (!ENABLE_ONESIGNAL) {
          console.log('🛑 [Notifications] OneSignal désactivé, notifications natives uniquement');
          setupFallbackNotifications();
          await setupNotificationUI(null);
          return;
        }

        if (typeof OneSignal === 'undefined') {
          console.warn('⚠️ [Notifications] OneSignal non disponible');

          if (window.OneSignalGlobal) {
            console.log('🔔 [Notifications] Utilisation OneSignalGlobal');
            await setupOneSignal(window.OneSignalGlobal);
          } else {
            console.warn('⚠️ [Notifications] OneSignal absent, fallback natif');
            setupFallbackNotifications();
          }
          return;
        }
        
        console.log('✅ [Notifications] OneSignal disponible');
        setupOneSignal(OneSignal);
        
      } catch (error) {
        console.error('❌ [Notifications] Erreur initialisation:', error);
        setupFallbackNotifications();
      }
    }




//===========================================================================
// 2. Configuration OneSignal

      async function setupOneSignal(oneSignal) {
        console.log('🔔 [Notifications] Configuration OneSignal...');
        
        try {
          // Vérifier si OneSignal est déjà initialisé (optionnel)
          if (oneSignal.config && oneSignal.config.appId) {
            console.log('✅ [Notifications] OneSignal déjà initialisé avec App ID:', oneSignal.config.appId);
          } else {
            console.warn('⚠️ [Notifications] OneSignal pas encore initialisé');
            // Ne pas réinitialiser! Attendre
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
         // 1. D'ABORD l'interface utilisateur (CRITIQUE)
          console.log('🎯 Configuration interface...');
          setupNotificationUI(oneSignal);
          
          // 2. ENSUITE les notifications (peuvent échouer sans bloquer l'app)
          console.log('🔔 Configuration notifications...');

          // 2A. OneSignal (silencieux si échec)
          try {
            await setupDailyNotifications(oneSignal);
            console.log('✅ OneSignal configuré');
          } catch (e) {
            console.warn('⚠️ OneSignal notifications échoué:', e);
          }

         // 2B. Notifications natives (respecter le toggle ON/OFF)
          try {
            const pref = notifLsGet('notifications_enabled', 'true');
            if (pref !== 'false') {
              await programmerNotificationQuotidienne();
              console.log('✅ Notifications natives prêtes');
            } else {
              console.log('🔕 Programmation non lancée (toggle OFF)');
            }
          } catch (e) {
            console.warn('⚠️ Notifications natives échouées:', e);
          }

          
        } catch (error) {
          console.error('❌ [Notifications] Erreur configuration:', error);
              // ESSAYER QUAND MÊME l'interface minimaliste
          try {
            if (typeof setupNotificationUI === 'function') {
              setupNotificationUI({}); // Version minimaliste
            }
          } catch (uiError) {
            console.error('❌ Interface aussi en échec');
          }
        }
      }



 //===========================================================================
  // 3. Configuration notifications quotidiennes

      async function setupDailyNotifications(oneSignal) {
        console.log('🔔 [Notifications] Configuration notifications quotidiennes...');
        
        // Récupérer l'heure configurée
        const heureNotification = notifLsGet('heure_notification', '09:00');
        const [heures, minutes] = heureNotification.split(':').map(Number);
        
        console.log(`🔔 [Notifications] Heure configurée: ${heures}h${minutes}`);
        
        // Pour OneSignal, on doit créer des tags/custom data
        // Les vraies notifications programmées nécessitent le dashboard OneSignal
        
        // Méthode simplifiée: utiliser les tags
        await oneSignal.User.addTag('notification_time', heureNotification);
        await oneSignal.User.addTag('app_name', APP_NAME);
        
        console.log('✅ [Notifications] Tags configurés');
      }


  //===========================================================================//
  //========================= BOUTONS TECHNIQUES ==============================//
  //===========================================================================//



  
  //===========================================================================
  // 4. Configuration INTERFACE UTILISATEUR (boutons, messages)

  
    // ==============================================================
    // =============== Solution pour le bouton toggle et 
    // ========== gestion de l'abonnement : Détection unifiée 

    async function getNotificationStatus() {
      const permission = Notification.permission; // "granted" | "denied" | "default"
      const hasPermission = (permission === "granted");
    
      // Préférence utilisateur (ON/OFF) pour ENVOL (indépendant de la permission navigateur)
      const pref = notifLsGet('notifications_enabled', 'true');
      const enabledByUser = (pref !== "false"); // par défaut: true si jamais rien n'est stocké
    
      // Si pas de permission, on ne peut pas considérer "actif", même si l'utilisateur veut ON
      const finalStatus = hasPermission && enabledByUser;
    
      return {
        permission,
        hasPermission,
        enabledByUser,
        finalStatus
      };
    }



  // ============================================
  // ===== Définition de updateToggleButton() :

  async function updateToggleButton() {
    const toggleBtn = document.getElementById('notifications-toggle-btn');
    if (!toggleBtn) return;
  
    const status = await getNotificationStatus();
    const isActive = status.finalStatus;
  
    // Mise à jour UI
    if (isActive) {
      toggleBtn.className = 'backup-btn toggle-on';
      toggleBtn.innerHTML = '🔕 Notifications activées : Désactiver les notifications ?';
    } else {
      toggleBtn.className = 'backup-btn toggle-off';
      toggleBtn.innerHTML = '🔔 Notifications désactivées : Activer les notifications ?';
    }
  
    return isActive;
  }


  //==== Fin de la définition d'updateToggleButton() 

  
  async function setupNotificationUI(oneSignal) {
    console.log('🔔 [Notifications] Configuration UI...');
  
    // ========== MISE À JOUR INITIALE DU BOUTON ==========
     await updateToggleButton();
    
    
    // ========== DÉTECTION NAVIGATEUR ============
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    console.log('🔔 [Notifications] User Agent:', userAgent.substring(0, 80) + '...');
    console.log('🔔 [Notifications] Platform:', platform);
    
    const isIOS = /iPhone|iPad|iPod/i.test(platform) || 
                  /iPhone|iPad|iPod/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent);
    
    console.log('🔔 [Notifications] Détection:', { isIOS, isFirefox, isChrome });
  
  
    
    
    // ========== MESSAGES INFORMATIFS ==========
    if (isIOS) {
      console.log('🍎 iOS détecté - Notifications push non supportées');
      
      // Message visuel pour iOS
      const iosWarning = document.createElement('div');
      iosWarning.className = 'browser-warning';
      iosWarning.innerHTML = `
        <p><strong>📱 Sur iOS</strong>, les notifications push ne fonctionnent pas quand l\'app est fermée (limitation Apple).</p>
        <p>Mais <strong>tu peux recevoir des notifications quand ENVOL est ouverte !</strong></p>
        <p>Garde un onglet ouvert pour tes rappels quotidiens 😊</p>
      `;
      
      const troubleshooting = document.querySelector('.troubleshooting');
      if (troubleshooting) {
        troubleshooting.insertBefore(iosWarning, troubleshooting.firstChild);
      }
    } // fin de if (isIOS)
  
  
    
    if (isFirefox && !isIOS) {
      console.log('🦊 Firefox détecté - Notifications possibles avec limitations');
      
      // Message pour Firefox
      const firefoxWarning = document.createElement('div');
      firefoxWarning.className = 'browser-warning.firefox';
      firefoxWarning.innerHTML = `
        <p><strong>🦊 Firefox détecté :</strong></p>
        <p>Tes notifications peuvent être bloquées par la "Protection renforcée".</p>
        <p><em>Si besoin, désactive-la temporairement dans les paramètres.</em></p>
      `;
      
      const troubleshooting = document.querySelector('.troubleshooting');
      if (troubleshooting && !isIOS) {
        troubleshooting.insertBefore(firefoxWarning, troubleshooting.firstChild);
      }
    }
  
  
    
    // =======================================================================
    // ========== BOUTON ON/OFF INTELLIGENT ==================================
    // =======================================================================
    
    const toggleBtn = document.getElementById('notifications-toggle-btn');
  
    
    if (toggleBtn) {
      console.log('✅ [Notifications] Bouton toggle trouvé');  
  
      
      updateToggleButton();


    //================================================================
    //======= ÉCOUTE D'UNE INTERACTION AVEC LE BOUTON TOGGLE =========
    
      toggleBtn.addEventListener('click', async function() {
        console.log('🔔 [Notifications] Clic toggle');
      
        const status = await getNotificationStatus(); 
        // status.finalStatus = ON réel (permission + pref)
      
        if (status.finalStatus) {
          // =========================
          // DÉSACTIVER
          // =========================
          if (confirm('Voudrais-tu désactiver tes notifications quotidiennes ?\n\nTu pourras les réactiver à tout moment si tu changes d\'avis 😊')) {
            try {
              // 1) Préférence OFF (c'est CE qui pilote le bouton)
              notifLsSet('notifications_enabled', 'false');
      
              // 2) Stopper les notifications locales programmées (si l'app est ouverte)
              if (typeof window.stopNotificationsQuotidiennes === 'function') {
                window.stopNotificationsQuotidiennes();
              }
      
              // 3) OneSignal opt-out (désactive les push)
              if (oneSignal?.User?.PushSubscription?.optOut) {
                await oneSignal.User.PushSubscription.optOut();
              }
      
              alert("✅ C'est noté. Tes notifications ENVOL sont désactivées.\n\n💡 Pour retirer l'autorisation du navigateur, fais-le dans les paramètres de notifications de ton navigateur.");
            } catch (error) {
              console.error('Erreur désactivation:', error);
              alert('Oh mince ! Je n\'ai pas réussi à désactiver correctement.\n\nEssaie de fermer/réouvrir l\'app puis réessaye, ou utilise le bouton \"Vider le cache\".');
            }
          }
        } else {
          // =========================
          // ACTIVER
          // =========================
      
          // On enregistre l'intention ON tout de suite (le bouton passera ON)
          localStorage.setItem(NOTIF_PREF_KEY, 'true');
      
          if (isIOS) {
            alert('📱 Sur iOS, selon la configuration, les notifications peuvent être limitées quand l\'app est fermée.\n\nMais tu peux recevoir des rappels quand ENVOL est ouverte.\n\nGarde un onglet ouvert pour tes rappels quotidiens 😊');
            setTimeout(updateToggleButton, 300);
            return;
          }
      
          if (isFirefox) {
            alert('🦊 Firefox peut bloquer les notifications avec sa "Protection renforcée".\n\nSi la popup n\'apparaît pas, désactive-la temporairement dans les paramètres.\n\nMerci pour ta patience 🙏');
          }
      
          try {
            // Demande de permission via OneSignal
            if (ENABLE_ONESIGNAL && oneSignal?.Slidedown) {
              await oneSignal.Slidedown.promptPush();
            } else if ('Notification' in window) {
              await Notification.requestPermission();
              updateToggleButton();
            }
      
            setTimeout(async () => {
              if (Notification.permission === "granted") {
                // OK : permission accordée -> ON réel
                alert('🎉 Génial ! Tes notifications sont maintenant activées !\n\nChaque jour, je te rappellerai de venir faire ton défi ENVOL.\n\nÀ demain pour la prochaine aventure ! 🚀');
      
                // Optionnel : relancer la programmation locale si tu l'utilises
                if (typeof programmerNotificationQuotidienne === 'function') {
                  programmerNotificationQuotidienne();
                }
      
              } else {
                // Permission refusée -> on remet OFF pour ne pas être incohérent
                notifLsSet('notifications_enabled', 'false');
      
                if (Notification.permission === "denied") {
                  alert('Je comprends ! Tu as choisi de ne pas recevoir de notifications.\n\nSi tu changes d\'avis, tu peux les autoriser dans les paramètres de ton navigateur.\n\nTon parcours continue quand même ! 🌈');
                } else {
                  alert('Je n’ai pas pu activer les notifications (permission non accordée).\n\nTu peux réessayer ou vérifier les réglages du navigateur. 💡');
                }
              }
      
              updateToggleButton();
            }, 700);
      
          } catch (error) {
            console.error('Erreur activation:', error);
      
            // échec -> remettre OFF sinon bouton incohérent
            notifLsSet('notifications_enabled', 'false');
      
            alert('Oups ! Je n\'ai pas réussi à afficher la demande de permission...\n\nPeut-être qu\'un bloqueur ou une protection de navigateur empêche ça.\n\nEssaie avec Chrome ou désactive temporairement les protections 💡');
          }
        }
      
        setTimeout(updateToggleButton, 300);
      });

    } // Fin de if (toggleBtn) plus haut que toggleBtn.addEventListener('click', async function()


    
    

  
    // =======================================================================
    // ========== BOUTON "AUTORISER NOTIFICATIONS" ===========================
    // =======================================================================

  
    const allowBtn = document.getElementById('allow-notifications-btn');
    if (allowBtn) {
      console.log('✅ [Notifications] Bouton allow trouvé');
      
      allowBtn.addEventListener('click', async function() {
        console.log('🔔 [Notifications] Clic sur autoriser notifications');
        
    if (isIOS) {
      alert('📱 Sur iOS, les notifications push ne fonctionnent pas quand l\'app est fermée (limitation Apple).\n\nMais tu peux recevoir des notifications quand ENVOL est ouverte !\n\nGarde un onglet ouvert pour tes rappels quotidiens 😊');
      return;
    }
        
        if (isFirefox) {
          alert('🦊 Firefox détecté :\nLa "Protection renforcée" peut bloquer OneSignal.');
        }
        
        try {
          const currentPermission = Notification.permission;
          console.log('Permission actuelle:', currentPermission);
          
          if (currentPermission === "default") {
            if (ENABLE_ONESIGNAL && oneSignal?.Slidedown) {
              await oneSignal.Slidedown.promptPush();
            } else if ('Notification' in window) {
              await Notification.requestPermission();
              updateToggleButton();
            }
            
            setTimeout(() => {
              if (Notification.permission === "granted") {
                alert('✅ Notifications activées !');
              }
            }, 2000);
            
          } else if (currentPermission === "granted") {
            alert('✅ Tu es déjà abonné.e aux notifications !');
          } else {
            alert('❌ Notifications bloquées.\nAutorise-les dans les paramètres de ton navigateur. 🙂');
          }
          
        } catch (error) {
          console.error('❌ Erreur:', error);
          alert('⚠️ Erreur technique : ' + error.message);
        }
      });
    }  // fin de  if (allowBtn)



  
  
  // ========== BOUTON "TEST NOTIFICATION" ==========
  const testBtn = document.getElementById('test-notification-android-btn');
    if (testBtn) {
      console.log('✅ [Notifications] Bouton test trouvé');
      
      // MARQUER le bouton comme ayant déjà un gestionnaire
      testBtn.setAttribute('data-has-handler', 'true');
      
      testBtn.addEventListener('click', async function() {
      console.log('🔔 Test complet des notifications...');
      
      let resultats = [];
      let conseils = [];
      let permissionOk = true;
      
      // 1. TEST PERMISSION
      if (Notification.permission !== "granted") {
        resultats.push('❌ PERMISSION: Non accordée');
        conseils.push('• Clique sur "Activer les notifications"');
        permissionOk = false;
      } else {
        resultats.push('✅ PERMISSION: Accordée');
      }
      
     // 2. TEST NOTIFICATIONS NATIVES (seulement si permission)
      if (permissionOk) {
        try {

          if (typeof window.envoyerNotificationDuJour === 'function') {
            await window.envoyerNotificationDuJour(true);
            resultats.push('✅ NATIVES: Test riche envoyé (Service Worker)');
          } else {
            resultats.push('⚠️ NATIVES: envoyerNotificationDuJour indisponible');
          }
        } catch (e) {
          console.error('❌ Test natif via SW:', e);
          resultats.push('❌ NATIVES: ' + e.message);
        }
      } else {
        resultats.push('⚠️ NATIVES: Test impossible (permission manquante)');
      }

      
      // 3. TEST ONESIGNAL (toujours, même sans permission native)
      if (typeof OneSignal !== 'undefined') {
        if (typeof OneSignal !== 'undefined' && OneSignal.Notifications) {
          try {
            // Méthode v16
            const canSend = await OneSignal.Notifications.canSend();
            
            if (canSend) {
              // Envoyer une notification via l'API moderne
              await OneSignal.Notifications.sendNotification({
                title: `🎯 ${APP_NAME} - Test OneSignal`,
                message: 'Ceci est un test de notification push',
                url: window.location.href,
                icon: APP_ICON_192
              });
              resultats.push('✅ ONESIGNAL: Test envoyé (v16)');
            } else {
              resultats.push('⚠️ ONESIGNAL: Peut envoyer: ' + canSend);
            }
          } catch (e) {
            resultats.push('❌ ONESIGNAL: ' + e.message);
            if (e.message.includes('not subscribed')) {
              conseils.push('• Active OneSignal avec le bouton toggle');
            }
          }
        }
      } else {
        resultats.push('⚠️ ONESIGNAL: Non disponible');
        if (/Firefox/i.test(navigator.userAgent)) {
          conseils.push('• Firefox bloque OneSignal (normal)');
        }
        conseils.push('• Utilise les notifications natives');
      }
      
      // 4. AFFICHER RÉSULTATS COMPLETS
      let message = 
        '🔔 TESTS TERMINÉS 🔔\n\n' +
        resultats.join('\n') + '\n\n';
        
      if (conseils.length > 0) {
        message += '💡 CONSEILS :\n' + conseils.join('\n') + '\n\n';
      }
      
      message += 
        '📱 iOS & 🦊 Firefox : Garde l\'app ouverte pour les notifications';
      
      alert(message);
      
      // 5. SI PERMISSION MANQUANTE, PROPOSER DE L'ACTIVER
      if (!permissionOk) {
        if (confirm('Voudrais-tu activer les notifications maintenant ?')) {
          if (typeof OneSignal !== 'undefined' && OneSignal.Slidedown) {
            OneSignal.Slidedown.promptPush();
          } else if ('Notification' in window) {
            Notification.requestPermission();
          }
        }
      }
    });
    } // ←  FERMER if (testBtn)
  } //---- fin de  async function setupNotificationUI(oneSignal)
  
  // ========== FONCTION TEST NOTIFICATIONS ==========
  function testNotification() {
    console.log('🔔 Test manuel de notification...');
    
    if (typeof envoyerNotificationDuJour === 'function') {
      envoyerNotificationDuJour();
    } else if (typeof window.envoyerNotificationDuJour === 'function') {
      window.envoyerNotificationDuJour();
    } else {
      console.error('❌ Fonction non disponible');
      console.log('💡 Recharge la page pour charger envol-notifications.js');
    }
  }



  
  //===========================================================================//
  //======================= FIN BOUTONS TECHNIQUES ============================//
  //===========================================================================//
  
  
  
  //===========================================================================
  // 5. Fallback (plan B) - FONCTION SÉPARÉE !
    
    function setupFallbackNotifications() {
      console.log('🔔 [Notifications] Utilisation fallback (notifications natives)');

      const toggleBtn = document.getElementById('notifications-toggle-btn');
      const allowBtn = document.getElementById('allow-notifications-btn');
      const testBtn = document.getElementById('test-notification-android-btn');

      if (!('Notification' in window)) {
        console.warn('❌ [Notifications] API Notification non disponible sur ce navigateur');

        if (toggleBtn) {
          toggleBtn.disabled = true;
          toggleBtn.classList.remove('toggle-on');
          toggleBtn.classList.add('toggle-off');
          toggleBtn.innerHTML = '🚫 Notifications non supportées sur ce navigateur';
        }

        if (allowBtn) {
          allowBtn.disabled = true;
          allowBtn.textContent = '🚫 Notifications non supportées';
        }

        if (testBtn) {
          testBtn.disabled = true;
          testBtn.textContent = '🚫 Test indisponible';
        }

        return;
      }

      if (/Firefox/i.test(navigator.userAgent)) {
        console.log('ℹ️ Firefox détecté - OneSignal bloqué par la protection');
      }

      console.log(`🔔 [Notifications] Permission actuelle : ${Notification.permission}`);

      if (typeof updateToggleButton === 'function') {
        updateToggleButton();
      }

      // Le bouton test est géré uniquement par setupNotificationUI()
    } // ← fin de function setupFallbackNotifications()
  
  
  
  // =====================================================================
  // ==============🔔 NOTIFICATIONS NATIVES QUOTIDIENNES 🔔===============
  // =====================================================================
  
  let notificationsProgrammees = false;
  let notificationTimeoutId = null;
  
  // Permet d'arrêter proprement la programmation (pour le toggle OFF)
  function stopNotificationsQuotidiennes() {
    notificationsProgrammees = false;
    if (notificationTimeoutId) {
      clearTimeout(notificationTimeoutId);
      notificationTimeoutId = null;
    }
    console.log('🔕 Notifications quotidiennes stoppées');
  }
  window.stopNotificationsQuotidiennes = stopNotificationsQuotidiennes;

  
async function programmerNotificationQuotidienne() {
  console.log(`🔔 [Programmation ${APP_NAME}] Début...`);

  if (isProgressPaused()) {
    console.log(`⏸️ [Programmation ${APP_NAME}] Progression en pause`);
    return;
  }

  const pref = notifLsGet('notifications_enabled', 'true');
  if (pref === 'false') {
    console.log(`⏸️ [Programmation ${APP_NAME}] Désactivée par l’utilisateur (toggle OFF)`);
    return;
  }


   

  // Vérifier si déjà programmée
  if (notificationsProgrammees) {
    console.log('🔔 [Programmation] Déjà en cours');
    return;
  }

  // Vérifier la permission AVANT
  if (Notification.permission !== 'granted') {
    console.log('❌ [Programmation] Permission non accordée');
    return;
  }

  // MAINTENANT on peut marquer comme programmée
  notificationsProgrammees = true;

  // 2. Récupérer l'heure configurée
  const heureNotification = notifLsGet('heure_notification', '08:00');
  const [heures, minutes] = heureNotification.split(':').map(Number);

  // 3. Calculer l'heure de déclenchement
  const maintenant = new Date();
  const heureDeclenchement = new Date();
  heureDeclenchement.setHours(heures, minutes, 0, 0);

  // Si l'heure est déjà passée aujourd'hui, programmer pour demain
  if (heureDeclenchement < maintenant) {
    heureDeclenchement.setDate(heureDeclenchement.getDate() + 1);
  }

  const delaiMs = heureDeclenchement.getTime() - maintenant.getTime();

  console.log(`🔔 Notification programmée à ${heureNotification} (dans ${Math.round(delaiMs / 1000 / 60)} minutes)`);

  // 4. Programmer la notification (ANNULABLE)
  notificationTimeoutId = setTimeout(async () => {
    await envoyerNotificationDuJour();
    programmerNotificationQuotidienne();
  }, delaiMs);
} // Fin de async function programmerNotificationQuotidienne()

  
async function envoyerNotificationDuJour(isTest = false) {
  try {
    if (!isTest && isProgressPaused()) {
      console.log(`⏸️ [Notification ${APP_NAME}] Ignorée : progression en pause`);
      return;
    }

    const jourActuel = parseInt(notifLsGet('jour_actuel', '1'), 10) || 1;

      // 2. Récupérer le défi du jour
      const defi = getDefiByDay(jourActuel);
      
      if (!defi) {
        console.error('❌ Défi non trouvé pour le jour', jourActuel);
        return;
      }
      
      // NOTIFICATION DE TEST vs QUOTIDIENNE
    const isTestMode = isTest === true;
    
    const reg = ('serviceWorker' in navigator) ? await navigator.serviceWorker.ready.catch(() => null) : null;

    if (reg?.active) {
      reg.active.postMessage({
        action: 'SEND_NOTIFICATION',
        appId: APP_ID,
        appName: APP_NAME,
        jour: jourActuel,
        titre: defi.titre,
        description: defi.description,
        isTest: isTestMode,
        icon: APP_ICON_192,
        badge: APP_ICON_192,
        url: window.location.href,
        tag: `${APP_ID}-jour-${jourActuel}`
      });

      console.log('✅ Notification quotidienne envoyée via Service Worker');

    } else {
      // NOTIFICATION DE TEST avec plus d'options
      const options = {
        body: `Jour ${jourActuel}: ${defi.titre}\n\n${defi.description.substring(0, 100)}...`,
        icon: APP_ICON_192,
        tag: `test-${Date.now()}`,
        requireInteraction: true,
        data: {
          jour: jourActuel,
          url: window.location.href,
          type: 'test'
        }
      };
      
      const notification = new Notification(
        isTestMode ? `🎯 ${APP_NAME} - Test Notification` : `🔔 ${APP_NAME} - Jour ${jourActuel}`,
        options
      );
      
      // Gestion des clics sur la notification
      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        
        // Action par défaut
        if (defi.termine) {
          alert(`Défi du jour ${jourActuel} déjà validé !`);
        } else {
          alert(`Défi du jour ${jourActuel}: ${defi.titre}`);
        }
        
        notification.close();
      };
      
      // Gestion des boutons d'action
      notification.addEventListener('click', function(event) {
        const action = event.action;
        
        if (action === 'voir') {
          window.focus();
          alert(`📖 Défi du jour ${jourActuel}:\n\n${defi.titre}\n\n${defi.description}`);
        } else if (action === 'marquer') {
          window.focus();
          if (confirm(`Marquer le défi jour ${jourActuel} comme accompli ?`)) {
            // Marquer comme fait (si c'est le jour actuel)
            if (jourActuel === parseInt(notifLsGet('jour_actuel', '1'), 10)) {
              const defiObj = getDefiByDay(jourActuel);
              if (defiObj) {
                defiObj.termine = true;
                defiObj.dateValidation = new Date().toISOString();
                alert('✅ Défi marqué comme accompli !');
              }
            }
          }
        }
      });
      
      // Auto-fermeture après 10 secondes (au lieu de 30)
      setTimeout(() => notification.close(), 10000);
      
      console.log('✅ Notification de test envoyée (native avec actions)');
    }
    
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
  }
} // fin de async function envoyerNotificationDuJour()


//=================================================================================
//=========== VARIABLES EN EXPOSITION GLOBALE POUR DEBOGGAGE : ====================
    
window.envoyerNotificationDuJour = envoyerNotificationDuJour;
window.programmerNotificationQuotidienne = programmerNotificationQuotidienne;
window.testNotification = testNotification; // Définie DANS setupNotificationUI
window.setupNotificationUI = setupNotificationUI; // Pour debug
window.debugOneSignalState = debugOneSignalState;
window.getNotificationStatus = getNotificationStatus;
window.updateToggleButton = updateToggleButton;

console.log('🔧 Fonctions debug disponibles:');
console.log('- debugOneSignalState()');
console.log('- getNotificationStatus()');
console.log('- updateToggleButton()');

console.log('✅ envol-notifications.js - Toutes les fonctions disponibles');
    

//============= FIN DE L'EXPOSITION GLOBALE POUR DEBOGGAGE  =======================
//=================================================================================


