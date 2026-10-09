# Julia’s English Quest V7 – Google Drive

## Vor dem Update
1. In V6 ein manuelles JSON-Backup herunterladen und sicher aufbewahren.
2. In der Google Cloud Console ein Projekt erstellen, die Google Drive API aktivieren und den OAuth-Zustimmungsbildschirm konfigurieren.
3. OAuth-Client-ID vom Typ **Webanwendung** erstellen. Unter „Autorisierte JavaScript-Quellen“ **https://redstergs.github.io** (ohne Pfad) eintragen.
4. Falls die OAuth-App im Testmodus läuft: Julias Google-Konto als Testnutzer hinzufügen, soweit für den Kontotyp möglich. Bei Family-Link-Konten kann die Google-Anmeldung für Drittanbieter-Apps eingeschränkt sein.
5. Die Client-ID in `google-config.js` zwischen die Anführungszeichen eintragen. **Kein Client-Secret** in GitHub veröffentlichen.
6. Alle Dateien aus dem ZIP in das bestehende GitHub-Pages-Repository hochladen/ersetzen. Danach App neu laden.
7. Auf dem ersten Gerät in „Units und Backup“ → „Mit Google verbinden“ gehen und den Zugriff auf den App-Datenbereich genehmigen. Falls schon ein Drive-Stand existiert, bewusst die richtige Richtung wählen.
8. Auf dem zweiten Gerät genauso verbinden und den Drive-Stand übernehmen.

## Grenzen / Sicherheit
- Der App-Datenbereich von Drive ist privat für diese App und das Google-Konto (`drive.appdata`).
- Kein Google-Passwort und kein OAuth-Client-Secret werden in der App gespeichert. Zugriffstokens werden nur im Arbeitsspeicher gehalten; nach Reload kann eine erneute Anmeldung nötig sein.
- Bei konkurrierenden Änderungen auf mehreren Geräten erfolgt **keine automatische Zusammenführung**. Es erscheint eine Konfliktmeldung, und die Nutzerin wählt bewusst DRIVE oder LOKAL. Ein Überschreiben kann die andere Version ersetzen. Vor einer Konfliktentscheidung möglichst beide Versionen als JSON sichern.
- Für die erste Übernahme auf einem neuen Gerät wird bei unterschiedlichen Daten eine Entscheidung verlangt.
- Die Synchronisierung funktioniert nur bei geöffneter App und aktiver Google-Anmeldung. Offline wird lokal gelernt; nach erneuter Verbindung wird synchronisiert.
- OAuth-Einwilligungsbildschirm, Kontoeinschränkungen und eventuell erforderliche Google-Verifizierung können die Anmeldung verhindern.
- Ein Google-Konto mit Elternaufsicht kann Drittanbieter-Zugriff beschränken; vor der Migration testen.
- Google Drive App Data Folder wird nicht als gewöhnliche Datei im Drive-UI angezeigt. Manuelle Backups bleiben sinnvoll.
