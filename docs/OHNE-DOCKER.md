# Woeschplan ohne Docker — fuer PCs ohne Virtualisierung (BIOS VT-x)

Docker braucht Virtualisierung. Stattdessen: **Cloud-Datenbank (Neon)** — kostenlos, kein BIOS, kein Docker.

---

## Schritt 1 — Kostenlose Datenbank (5 Minuten)

1. Oeffne https://neon.tech und registriere dich (kostenlos)
2. **New Project** → Name: `woeschplan`
3. Auf der Projektseite: **Connection string** kopieren (PostgreSQL)
   - Format: `postgresql://user:pass@ep-....neon.tech/neondb?sslmode=require`

---

## Schritt 2 — DATABASE_URL eintragen

Datei oeffnen:

`C:\Users\moezkan\Woeschplan\apps\api\.env`

Zeile `DATABASE_URL=` ersetzen (deinen Neon-String einfuegen):

```
DATABASE_URL="postgresql://USER:PASS@ep-xxxx.neon.tech/neondb?sslmode=require"
JWT_SECRET="change-me-in-production"
PORT=3001
```

Speichern.

---

## Schritt 3 — Starten (ohne Docker)

PowerShell:

```powershell
cd "$env:USERPROFILE\Woeschplan"
git pull
npm.cmd run pc:start-no-docker
```

Es oeffnen sich **zwei Fenster**:
- **API** (Port 3001)
- **Expo** (QR-Code fuer Handy)

---

## Desktop-Verknuepfung (optional)

```powershell
cd "$env:USERPROFILE\Woeschplan"
npm.cmd run pc:desktop-no-docker
```

Doppelklick auf **「Woeschplan starten (ohne Docker)」** auf dem Desktop.

---

## Alternative: PostgreSQL lokal unter Windows

Falls du keine Cloud nutzen willst:

1. https://www.postgresql.org/download/windows/ — Installer
2. Passwort merken, Port 5432
3. Mit pgAdmin Datenbank `woeschplan` anlegen
4. In `.env`:

```
DATABASE_URL="postgresql://postgres:DEIN_PASSWORT@localhost:5432/woeschplan?schema=public"
```

Dann `npm.cmd run pc:start-no-docker`

---

## Handy testen

- PC und Handy im **gleichen WLAN**
- Expo Go installieren
- QR-Code aus dem Expo-Fenster scannen
