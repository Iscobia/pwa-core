# pwa-core
Moteur PWA partagé par ORIGINE, ENVELOPPE et EMERGENCE

**Le rôle de chaque fichier :**

`/pwa-core/calendar-engine.js`

Le moteur commun : calendrier, affichage du défi, validation/rattrapage, sauvegarde/chargement, export/import backup, reset, clear cache.

Il lit uniquement :
- window.APP_CONFIG (paramètres de la PWA)
- window.DEFIS (liste des défis)


`/sekhamet-origine/config.js`

La config ORIGINE : appId, title, daysTotal, storagePrefix, systemeUrl, cacheName.
C’est ça qui rend le stockage local distinct des autres PWAs.


`/sekhamet-origine/data/defis.js`
La liste des défis uniquement : window.DEFIS = [...]


`/sekhamet-origine/index.html`
Charge dans le bon ordre : config.js → defis.js → origine-notifications.js → calendar-engine.js


`/sekhamet-origine/service-worker.js`
Cache minimal (HTML/CSS/config/défis/moteur)
- Gère CLEAR_CACHE (pour ton bouton “vider le cache”)
- Garde le système de notif native + actions (MARK_DONE)
