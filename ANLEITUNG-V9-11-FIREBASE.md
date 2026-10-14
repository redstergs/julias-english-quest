# Julia’s English Quest V9.11 – Firebase-Migration

## Vor dem Hochladen
1. Das bereits heruntergeladene JSON-Backup sicher aufbewahren.
2. In Firebase Console → Authentication → Anmeldemethode **Google** aktivieren.
3. Unter Authentication → Einstellungen → Autorisierte Domains **redstergs.github.io** hinzufügen.
4. In Firestore eine Datenbank im **Produktionsmodus** anlegen (Spark-Tarif beibehalten).
5. Unter Firestore → Regeln den Inhalt von `firestore.rules` einfügen und **Veröffentlichen**.

## Veröffentlichung
Den **gesamten Inhalt** dieses ZIP ins Stammverzeichnis des GitHub-Pages-Repositories hochladen (vorhandene Dateien ersetzen). Wichtig: `firebase-config.js` ist neu. `google-config.js` ist für V9.11 nicht mehr nötig. Die App bleibt unter GitHub Pages.

## Einmalige Migration – unbedingt auf dem Gerät mit dem aktuellen Lernstand
1. PWA aktualisieren, **Version 9.11.0** prüfen.
2. In **Units & Backup** kontrollieren, ob alle Units, Fortschritte und Schultests lokal vorhanden sind.
3. Falls nicht, das gesicherte JSON-Backup über **Backup wiederherstellen** importieren.
4. Unter Firebase **Mit Google anmelden** klicken und **Julias Google-Konto** wählen. Die App versucht, den lokalen Lernstand erstmals hochzuladen, sofern die Firebase-Datenbank für dieses Konto noch leer ist.
5. Unter **Jetzt synchronisieren** die Erfolgsmeldung prüfen. Falls unterschiedliche Lernstände gemeldet werden, **nicht unüberlegt LOKAL/DRIVE wählen**; vorher Backups sichern.
6. Auf dem zweiten Gerät dieselbe App-Version und **dasselbe Google-Konto** verwenden. Dort bei Konflikt den Firebase-Stand mit `DRIVE` übernehmen, **nicht LOKAL**.
7. App schließen und neu starten: Firebase Auth stellt die Sitzung normalerweise automatisch wieder her.

## Sicherheit und Grenzen
- Jede Firebase-UID erhält ihren **eigenen** Lernstand. Eltern- und Kinderkonto sind nicht automatisch gemeinsam synchronisiert.
- Die App bleibt offline lokal benutzbar; Synchronisierung erfordert Internet.
- Bei Änderungen auf beiden Geräten ohne vorherigen Abgleich wird bewusst ein **Konflikt** angezeigt statt Daten zu überschreiben. Es gibt noch keinen automatischen Wort-für-Wort-Merge.
- Bei einem Konflikt vor der Auswahl stets Backups beider Geräte sichern.
- Für beaufsichtigte Google-Konten kann der Google-Login eingeschränkt sein; bitte zunächst testen.
- Firebase SDK wird über Google-CDN geladen und benötigt für den ersten Start Internet.
- Spark-Tarif nutzen; keine kostenpflichtigen Dienste aktivieren.
