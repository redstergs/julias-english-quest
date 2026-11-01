# Versionsverlauf

## Version 9.12.4

- Falsche Multiple-Choice-Antworten behalten die bisherige Lernstufe bei. Erst zwei richtige MC-Antworten führen zur Schreibstufe.
- Schreibfehler setzen weiterhin auf die erste Schreibstufe zurück.
- Die gewählte Anzahl Abfragen bleibt unverändert.

## Version 9.12.3

- 10 Wörter bedeutet genau 10 Abfragen, 20 Wörter genau 20 Abfragen (soweit verfügbar).
- Jedes ausgewählte Wort kommt pro Runde einmal vor. Keine angehängten Schreib- oder Fehlerrunden.
- Der gespeicherte Lernstand bestimmt beim nächsten Üben, ob ein Wort als Multiple Choice oder zum Schreiben erscheint.
- Fehler bleiben für spätere Lernrunden gespeichert.
- Frühere Release Notes sind in dieser Datei zusammengeführt; die neuesten Angaben beschreiben das aktuelle Verhalten.

## Frühere Versionen

### RELEASE-V9-12-2

Version 9.12.2
Angebotene Multiple-Choice-Antworten mit Klammern werden korrekt akzeptiert.
Feste Lernphasen: Ausgangsrunde, ggf. eine Fehlerwiederholung, Schreibrunde für neue Wörter, ggf. eine Fehlerwiederholung. Keine erneuten MC-Runden anhand des Lernstands.
Phasen und insgesamt beantwortete Fragen werden angezeigt.
Dateien im bestehenden App-Verzeichnis ersetzen, Auf Update prüfen wählen und Version 9.12.2 kontrollieren.

### RELEASE-V9-12-1

Version 9.12.1 – Begrenzte Lernrunden
Fehler werden je Lernphase höchstens einmal wiederholt. Die Runde endet auch bei wiederholten Fehlern. Neue Wörter durchlaufen weiterhin Multiple Choice und Schreiben.
Installation: Dateien wie bisher im bestehenden App-Verzeichnis ersetzen und Auf Update prüfen wählen.

### RELEASE-V9-12

Julia's English Quest – Version 9.12.0

Neu:
- Hinweis „Noch … Wort/Wörter zu festigen“ startet eine kurze Schreibrunde.
  Bis zu zehn unsichere/schwierige Wörter, ergänzt um bis zu drei andere
  Wiederholungswörter aus allen freigegebenen Units (maximal zehn insgesamt).
- Test-Kachel öffnet den vorhandenen Probetest. Nach dem Testdatum bleibt
  ein ausstehendes Schulergebnis sichtbar und lässt sich direkt eintragen.
- Unit-Kachel öffnet den vorhandenen Lernstand mit aufgeklappten Wortlisten.
- Insgesamt sichere Wörter bleiben ohne Interaktion.
- Heroine als App-Icon, Browser-Icon und Apple-Touch-Icon.
- Bestehendes Layout und Lernregeln bleiben erhalten.

Installation:
Dateien in den bestehenden Webordner hochladen und vorhandene Dateien ersetzen.
Keine Lernstands- oder Unit-JSON importieren. Lernstände bleiben in IndexedDB
und Firebase erhalten. Danach „Auf Update prüfen“ wählen; Version 9.12.0 prüfen.
Ein bereits installiertes App-Icon kann vom Betriebssystem verzögert aktualisiert
werden.

Prüfung:
JavaScript-Syntax und Funktionsprüfungen für gemischte Festigungsrunde,
Probetest inklusive Tastaturbedienung, abgelaufenen Test und Unit-Übersicht.
Ein vollständiger Browser-Test war in dieser Umgebung nicht verfügbar.

### RELEASE-V9-11-3

Julia’s English Quest V9.11.3 – Firebase-Synchronisierung

- Kanonischer JSON-Vergleich: Firestore sortiert Map-Felder anders als der Browser.
- Alte Vergleichsbasen aus V9.11.2 werden beim Laden normalisiert.
- Änderungen während eines laufenden Abgleichs lösen anschließend einen weiteren Abgleich aus.
- Transaktionsschutz gegen echte konkurrierende Schreibzugriffe bleibt aktiv.
- Lokale Daten werden bei fehlgeschlagenen Uploads nicht gelöscht.

INSTALLATION: ZIP-Inhalt ins GitHub-Pages-Repository hochladen.
Vorher auf dem Tablet das aktuelle JSON-Backup aufbewahren.
Auf dem Tablet nach dem Update zuerst den lokalen Lernstand kontrollieren,
dann „Units & Backup“ -> „Jetzt synchronisieren“. Bei Konflikten
LOKAL nur wählen, wenn der Tablet-Lernstand der gewünschte ist.

WICHTIG: Kein Live-Test gegen dein Firebase-Projekt durchgeführt.

### RELEASE-V9-11-2

V9.11.2: Behebt ReferenceError FIREBASE_CONFIG is not defined beim Klick auf Units und Backup. Firebase-Konfiguration wird aus window.QUEST_FIREBASE_CONFIG gelesen. Keine Datenmigration.

### RELEASE-V9-11-1

V9.11.1: Firebase-Zustandsvariablen korrekt initialisiert. Behebt JavaScript-ReferenceError beim Oeffnen von Units & Backup. Keine Aenderungen an Lernstaenden oder Datenformat.

### RELEASE-V9-10-1

V9.10.1: Google Drive Anmeldung nach PWA-Start

- Keine automatisch blockierten Google-Anmeldepopups mehr beim Start.
- Kein Hintergrund-Popup zur Token-Erneuerung.
- Nach Neustart Google Drive einmal per Klick verbinden.
- Manuelle Anmeldung nutzt den Google-Kontowahldialog.
- Status meldet abgelaufenes Token; lokale Daten bleiben erhalten.

WICHTIG: Ohne Backend/Refresh-Token ist eine automatische Wiederverbindung nach Neustart nicht garantiert.

### RELEASE-V9-9

V9.9.0: Google-Drive-Verbindungsstatus, Trennen-Schaltfläche, Token-Erneuerungsversuch vor Ablauf, unterscheidbare Fehlermeldungen. Keine automatische Popup-Anmeldung beim Start. Lokale Daten bleiben beim Trennen erhalten.

### RELEASE-V9-8

V9.8.0 – Neue Units werden gesperrt importiert. Freigabe unter Units & Backup. Bestehende Units bleiben aktiv; manuelle Schulbeherrschung entfernt.

### RELEASE-V9-7-1

V9.7.1: Startseite konsequent als eine blau-violette Hero-Karte mit Heldin links und drei Kacheln rechts; darunter unveraendertes Trainingsformular, gezieltes Ueben als erste Option. App-Skript cache-busted und network-first, um alte Layoutversionen zu vermeiden.

### RELEASE-V9-7

V9.7: Kompakte blau-violette Startseite mit bestehender Heldin, drei Kacheln (Test-Tage / Unit sicher / insgesamt sicher). Training direkt darunter mit gezieltem Schreiben als erste Option, sofern noch unsichere Woerter vorhanden. Richtung und Wortanzahl gelten auch fuer gezieltes Training. Bestehende Daten, Login und Lernregeln unveraendert.

### RELEASE-V9-6

Version 9.6.0: Motivierende Startseite mit Heldin aus der ersten Illustration. Naechster Schultest hat Vorrang; sonst neueste unvollstaendige Unit; sonst Wiederholung. Nur Unit-Ziel hat Fortschrittsbalken. Unveraenderte Lernlogik und Google-Anmeldung.

### RELEASE-V9-5-2

V9.5.2: Google OAuth wird nicht mehr automatisch beim Start ausgelöst (Chrome-Popup-Blocker). Die Verbindung wird über einen bewussten Klick auf „Mit Google verbinden“ wiederhergestellt. Keine erneute Zustimmung erzwingen (prompt leer). Die Google-Konfiguration, lokale Daten und Drive-Synchronisierung bleiben unverändert. Auf GitHub app.js, sw.js, version.json ersetzen. Vorher Backup erstellen.

### RELEASE-V9-5-1

V9.5.1: Datumsformatierung korrigiert. Testdaten und Auszeichnungen werden als ausgeschriebenes deutsches Datum angezeigt. GitHub: app.js, sw.js, version.json ersetzen.

### RELEASE-V9-5

Julia's English Quest 9.5.0

- Richtige und falsche Antworten je Wort sichtbar; ab 9.5 zusätzlich getrennte Multiple-Choice- und Schreibstatistik.
- Lernfortschritt (0/15/30/50/75/100 %) und Testsicherheit getrennt, auf Startseite, Übersicht und Unit.
- Historische Gesamtzahlen werden weiterverwendet; frühere MC-/Schreibaufteilung ist nur näherungsweise ableitbar.
- Testdatum und Erfolge mit ausgeschriebenem deutschem Datum.
- Drive-Verbindung wird auf dem Gerät gemerkt; nach Start stiller OAuth-Versuch ohne dauerhaft gespeichertes Token. Google kann erneute Anmeldung verlangen.
- Version und Updateprüfung unabhängig von Google-Anmeldung; Versionsdatei version.json mit Cache-Bypass.
- Bestehende Units, XP, Schultestergebnisse und Backups bleiben erhalten.

GitHub: app.js, sw.js, version.json hochladen. index.html kann unverändert bleiben.
Vor dem Update manuelles Backup erstellen.

### RELEASE-V9-4

Julia's English Quest V9.4.0 – Updateprüfung

NEU: version.json ist die serverseitige Quelle für die verfügbare Version.
Die tatsächlich laufende Version steht weiterhin direkt in app.js.
Der Update-Check ruft version.json mit Cache-Busting und no-store ab.
Der Service Worker speichert version.json niemals offline.
HTML-Navigation nutzt Netzwerk zuerst, mit Offline-Fallback.
Versionsvergleich numerisch (nur neuere Versionen lösen Update-Hinweis aus).

WICHTIG: Auf GitHub müssen app.js, sw.js und die NEUE version.json hochgeladen werden.
index.html bleibt unverändert. google-config.js bleibt unverändert.
Vor dem Update bitte ein Backup erstellen.

### RELEASE-V9-3

Julia's English Quest 9.3.0

- Konsolidierter Bereich „Mein Lernstand“: Fortschritt je Unit, Testtermine, Schulergebnisse und Auszeichnungen.
- Einheitliche Einstufung sicher/unsicher/schwierig für Startseite, Unit-Ansicht und gezieltes Üben.
- Schreib-Erfolgsserie wird ab jetzt separat gespeichert; bestehende Stufe-5- und schulisch beherrschte Wörter bleiben berücksichtigt.
- Erneuter Fokusversuch beim Öffnen jeder Schreibfrage, auch im Modus „Schwierige & unsichere Wörter“.
- Version 9.3.0 und aktualisierter Service-Worker-Cache.

GitHub: app.js, index.html und sw.js aus diesem ZIP ersetzen.
Google-Konfiguration und lokale Lernstände bleiben unverändert.
Vor dem Update ein Backup erstellen.
Hinweis: Mobile Browser dürfen das automatische Öffnen der Bildschirmtastatur blockieren.

### RELEASE-V9-2

Version 9.2.0: Eingabefokus bei Schreibfragen; nach richtiger Antwort automatische nächste Frage nach 3 Sekunden; Versionsanzeige aus APP_VERSION; Cache v9-2. Für GitHub app.js, index.html und sw.js ersetzen. Vorher Backup erstellen.

### RELEASE-V9-1

V9.1: Google Drive PATCH media upload fix. Ersetzt app.js und sw.js. Zuvor manuelles Backup erstellen. Google-Konfiguration unverändert.

### RELEASE-V9

Julia’s English Quest V9

NEU: Farbwelten je Unit, Enter-Taste zur nächsten Frage, sichtbare Versionsnummer, Unit-Dashboard, gezieltes Training, Schreib-Probetest, Testdatum/Countdown, Schulresultat mit >50%-Regel und Auszeichnungen.

Schulergebnis: Bei >50% werden alle Wörter der Unit schulisch beherrscht, außer ausdrücklich markierten Fehlerwörtern. Bei <=50% werden keine zusätzlichen Wörter markiert. Bisherige Fortschritte bleiben erhalten. Fehlerwörter können wieder gezielt geübt werden.

Google Drive V7/V8: Die bisherige Synchronisierung bleibt unverändert (keine konfliktfreie Mehrgeräte-Zusammenführung). Neue Einstellungen sind in settings enthalten und damit im Backup/Drive-Payload.

Update: ZUERST Backup exportieren. Für das GitHub-Update app.js, index.html und sw.js ersetzen. Die übrigen Dateien bleiben unverändert. Die Version ist im Footer sichtbar.

Wichtig: Der Probetest bewertet, ohne den Lernfortschritt zu verändern. Eine spätere Korrektur des Schulergebnisses vergibt keine zweiten XP.

