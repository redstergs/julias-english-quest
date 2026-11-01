JULIA'S ENGLISH QUEST — OFFLINE PWA

WICHTIG: Eine installierbare PWA muss zuerst über HTTPS oder localhost geöffnet werden.
Ein Doppelklick auf index.html ist NICHT die korrekte Installationsmethode.

WINDOWS (falls Python installiert ist):
1. ZIP entpacken.
2. Im entpackten Ordner eine Konsole öffnen.
3. python -m http.server 8765
4. Chrome oder Edge öffnen: http://localhost:8765
5. App über Browsermenü > Installieren installieren.
6. Nach erfolgreichem ersten Laden kann sie offline verwendet werden.
   Der lokale Server wird für die installierte Offline-PWA dann nicht benötigt.

CHROMEBOOK:
Die App-Dateien müssen einmalig auf einem HTTPS-Webhost bereitgestellt werden,
z.B. GitHub Pages, Netlify oder ein eigener Webserver mit HTTPS.
Danach im Chrome öffnen und über das Menü installieren.
Sobald die Dateien gecacht wurden, funktioniert die App offline.

GERÄTEWECHSEL:
Auf Windows: Einstellungen > Backup herunterladen.
Auf Chromebook: Einstellungen > Backup wiederherstellen.

NEUE UNITS:
Eine JSON-Datei wie BEISPIEL-UNIT-IMPORT.json vorbereiten und in Einstellungen
importieren. Eine Unit-ID sollte eindeutig bleiben. Neue Vokabeln können
nachträglich ergänzt werden. Bestehende Einträge bleiben beim Import unverändert.

DATEN:
Der Lernstand liegt in IndexedDB im Browserprofil und ist an die Origin
(Website-Adresse) gebunden. Bei Löschen von Website-Daten geht er verloren.
Regelmäßig Backups herunterladen!

Hinweis: Die Vokabelliste aus dem Foto wurde aus dem bisherigen Gespräch
übernommen; vor schulischer Nutzung bitte gegen das Buch prüfen.
