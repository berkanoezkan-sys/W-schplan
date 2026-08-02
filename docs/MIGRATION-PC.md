# Migration Mac → PC (Wöschplan)

Diese Anleitung sichert **Code, Cursor-Kontext, Dev-Umgebung und Chats**, bevor der Mac gelöscht wird.

## Wichtig: Was synchronisiert sich automatisch?

| Inhalt | Automatisch mit Cursor-Account? | Was du tun musst |
|--------|----------------------------------|------------------|
| **Code / Git** | Nein | Push zu GitHub, auf PC klonen |
| **Cursor Chats / Agent-Verläufe** | **Nein** (lokal gespeichert) | Export-Skript oder Extension (siehe unten) |
| **User Rules / globale Skills** | Teilweise (Cursor Skills) | Projekt-`.cursor/` liegt im Repo |
| **`.env` Secrets** | Nein | Manuell übertragen (Backup-Ordner) |
| **Postgres-Daten** | Nein | Docker-Volume exportieren oder `db:seed` auf PC |
| **Desktop-Shortcuts (.app)** | Nein | PC-Skripte nutzen (siehe unten) |

---

## Schritt 1 — Auf dem Mac (VOR dem Löschen)

### 1a. Alles committen und zu GitHub pushen

**Aktuell ist der Großteil der Arbeit nur lokal** — ohne Push geht sie verloren.

```bash
cd /Users/berkanprivat/Woeschplan
git add -A
git status   # prüfen: keine .env-Dateien!
git commit -m "Save all Wöschplan work before Mac migration"
git push origin main
```

Repo: `https://github.com/berkanoezkan-sys/W-schplan.git`

### 1b. Cursor-Daten exportieren

```bash
cd /Users/berkanprivat/Woeschplan
./scripts/export-for-pc-migration.sh
```

Erzeugt `~/Woeschplan-Migration-Backup/` mit:

- Agent-Transcripts (JSONL)
- `.env`-Kopien (nur lokal, nicht ins Git!)
- Hinweise für Chat-Import

**Kopiere diesen Ordner** auf USB, OneDrive, Google Drive o.ä.

### 1c. Chats in Cursor-UI (empfohlen)

Cursor synchronisiert Chats **nicht** über den Account. Zusätzlich:

1. Extension **「Cursor Chat Transfer」** installieren
2. Alle wichtigen Chats exportieren → `.cursor-chat.json`
3. Datei in den Backup-Ordner legen
4. Auf dem PC: Extension → Import → **Cursor komplett neu starten**

Alternativ (fortgeschritten): [cursaves](https://github.com/Callum-Ward/cursaves) für Git-basierten Chat-Sync.

---

## Schritt 2 — Auf dem PC einrichten

### Option A: WSL2 (empfohlen — gleiche Bash-Skripte wie auf dem Mac)

1. **WSL2 + Ubuntu** installieren (Windows Terminal → `wsl --install`)
2. **Docker Desktop** installieren, WSL-Integration aktivieren
3. **Node.js 20+** in WSL: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
4. **Git** + GitHub-Login

```bash
# In WSL
git clone https://github.com/berkanoezkan-sys/W-schplan.git Woeschplan
cd Woeschplan
npm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
# .env aus Backup-Ordner wiederherstellen (siehe Schritt 3)
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev:up
```

### Option B: Native Windows (PowerShell)

```powershell
cd C:\dev
git clone https://github.com/berkanoezkan-sys/W-schplan.git Woeschplan
cd Woeschplan
.\scripts\pc-setup.ps1
```

Danach `.env`-Dateien aus dem Backup wiederherstellen und:

```powershell
npm run dev:up
```

*(Unter Windows am einfachsten mit **Git Bash** oder **WSL** die Bash-Skripte nutzen.)*

---

## Schritt 3 — Backup auf dem PC wiederherstellen

Aus `~/Woeschplan-Migration-Backup/` (Pfad auf PC anpassen):

```bash
cp backup/env/apps-api.env   apps/api/.env
cp backup/env/apps-mobile.env apps/mobile/.env
# LAN-IP auf PC anpassen:
# Windows: ipconfig → IPv4-Adresse
# Dann in apps/mobile/.env: EXPO_PUBLIC_API_URL=http://DEINE-PC-IP:3001
```

### Agent-Transcripts (Referenz, nicht automatisch in Cursor-UI)

Liegen unter `backup/agent-transcripts/` — zum Nachlesen. Für die Cursor-Sidebar brauchst du **Cursor Chat Transfer** (Import).

### Postgres-Daten

- **Einfach:** Auf PC `npm run db:seed` (Demo-Daten neu)
- **Vollständig:** Docker-Volume vom Mac exportieren (nur nötig bei echten Produktionsdaten)

---

## Schritt 4 — Cursor auf dem PC

1. Mit **demselben Cursor-Account** anmelden
2. Projekt öffnen: geklontes `Woeschplan`-Verzeichnis
3. Chats importieren (Extension) → Cursor **komplett beenden und neu starten**
4. Projekt-Rules/Skills sind in `.cursor/rules/` und `.cursor/skills/` im Repo enthalten

---

## Dev-Befehle auf dem PC

| Befehl | Zweck |
|--------|--------|
| `npm run dev:up` | Postgres + API + Expo starten |
| `npm run dev:down` | API + Expo stoppen |
| `npm run dev:status` | Status prüfen |
| `npm run dev:up -- --localhost` | Expo nur auf diesem Rechner |

---

## Checkliste vor Mac-Löschung

- [ ] `git push` erfolgreich
- [ ] `export-for-pc-migration.sh` ausgeführt
- [ ] Backup-Ordner auf Cloud/USB
- [ ] Chats per Extension exportiert (optional aber empfohlen)
- [ ] GitHub-Zugang auf PC getestet
- [ ] `.env`-Werte notiert oder im Backup
