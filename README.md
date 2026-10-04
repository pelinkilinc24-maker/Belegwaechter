# Belegwächter

Offline-App für Garantien und Rechnungen. Alle Daten bleiben auf dem Gerät.

## Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | Die App |
| `manifest.json`, `icons/` | Installierbarkeit (PWA) |
| `sw.js` | Offline-Betrieb und Benachrichtigungen (Service Worker) |
| `ocr/` | Texterkennung für Fotos (Tesseract.js), wird per Skript geladen |
| `ocr-dateien-laden.sh` | Lädt die Texterkennung herunter |
| `datenschutz.html` | Datenschutzerklärung für den Play Store |
| `.nojekyll` | Damit GitHub Pages den Ordner `.well-known` veröffentlicht |

## 1. Texterkennung laden (einmalig, ca. 7 MB)

Im Terminal im Projektordner:

```sh
sh ocr-dateien-laden.sh
```

Nicht im Browser herunterladen: Safari entpackt `.gz`-Dateien sonst automatisch, und die Erkennung startet nicht.

## 2. Auf GitHub Pages veröffentlichen

1. Neues **öffentliches** Repository mit dem Namen **`DEINNAME.github.io`** anlegen (genau so, mit deinem GitHub-Namen).
   Nur so liegt die App im Stammverzeichnis, das Android für die Verknüpfung mit der App braucht.
2. Alle Dateien hochladen, auch `.nojekyll` und den Ordner `ocr/` (am Mac: `Cmd + Shift + .` zeigt versteckte Dateien).
3. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)**.
4. Nach 1–2 Minuten läuft die App unter `https://DEINNAME.github.io/`.
5. Testen: am Handy in Chrome öffnen, eine Rechnung fotografieren. Beim ersten Scan wird die Texterkennung geladen, danach geht alles offline.

Die URL `https://DEINNAME.github.io/datenschutz.html` trägst du später in der Play Console ein.

## 3. Android-Paket mit PWA Builder

1. <https://www.pwabuilder.com> → `https://DEINNAME.github.io/` eingeben → **Package for stores → Android**.
2. Einstellungen:
   - Package ID: z. B. `io.github.deinname.belegwaechter` (später nicht mehr änderbar)
   - App name: `Belegwächter`, Launcher name: `Belegwächter`
   - Display mode: `standalone`
   - Notifications: **an** (Benachrichtigungen laufen dann über die App statt über Chrome)
   - Signing key: **Create new** – Passwörter notieren!
3. Heruntergeladenes ZIP enthält u. a. die `.aab` (für Google Play), die `.apk` (zum Testen), die **Signing-Key-Datei** und `assetlinks.json`.
   **Key-Datei und Passwörter sicher aufbewahren** – ohne sie kannst du nie wieder ein Update hochladen.
4. Prüfen, dass das Paket **targetSdkVersion 36** hat (Pflicht für Google Play seit 31.08.2026). Lehnt die Play Console das Paket wegen der API-Stufe ab, ist die PWA-Builder-Vorlage noch nicht aktuell: Dann das Paket lokal mit `@bubblewrap/cli` ab Version 1.25.0 bauen.

## 4. App und Website verknüpfen (sonst erscheint eine Adressleiste)

1. Im Repository einen Ordner `.well-known` anlegen und die `assetlinks.json` aus dem PWA-Builder-ZIP hineinlegen.
2. Prüfen: `https://DEINNAME.github.io/.well-known/assetlinks.json` muss im Browser die Datei zeigen.
3. **Wichtig bei Google Play:** Google signiert die App mit einem eigenen Schlüssel (Play App Signing). Den SHA-256-Fingerabdruck findest du in der Play Console unter *Test und veröffentlichen → App-Integrität → App-Signatur*. Diesen Fingerabdruck **zusätzlich** in `assetlinks.json` bei `sha256_cert_fingerprints` eintragen:

```json
"sha256_cert_fingerprints": ["FINGERABDRUCK_AUS_PWABUILDER", "FINGERABDRUCK_AUS_PLAY_CONSOLE"]
```

## 5. Google Play Console

- App anlegen, `.aab` in einen **geschlossenen Test** hochladen.
- Neues privates Entwicklerkonto: mind. **12 Tester**, **14 Tage am Stück** – lieber 15–20 einladen.
- Datenschutz-URL eintragen, Formular **Datensicherheit**: keine Daten erfasst, keine Daten geteilt.
- Store-Eintrag: Icon `icons/play-store-icon-512.png`, Screenshots vom Handy.

## Benachrichtigungen testen

1. App über `https://DEINNAME.github.io/` in Chrome öffnen und **installieren** (Chrome-Menü → „App installieren“) bzw. die Play-Store-Version nutzen. Die Hintergrundprüfung läuft nur bei installierter App.
2. Ein Produkt speichern → Frage „Rechtzeitig erinnert werden?“ → Ja → Android fragt nach der Erlaubnis.
3. Einstellungen → Benachrichtigungen → „Test-Benachrichtigung senden“.
4. Echte Erinnerung: Produkt anlegen, dessen Garantie in weniger als 30 Tagen endet (z. B. Kaufdatum vor 23 Monaten, 2 Jahre). Android prüft etwa einmal am Tag im Hintergrund – den Zeitpunkt bestimmt Android.

## Updates

`index.html` ändern und hochladen, in `sw.js` die `VERSION` erhöhen (z. B. `bw-1.0.1`). Die Android-App zeigt beim nächsten Start mit Internet automatisch die neue Version – ein neues Paket im Play Store ist dafür nicht nötig.

## Lizenzen

Tesseract.js / tesseract.js-core: Apache-2.0. Sprachdaten (tessdata): Apache-2.0.

## Play-Store-Titel

`Belegwächter – Garantie-App` (26 von 30 Zeichen)
