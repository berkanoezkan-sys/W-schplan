# Lokalen Agent starten (macht alles auf DEINEM PC)

Der **Cloud-Agent** (dieser Chat im Browser) kann **nicht** auf deinen PC zugreifen.
Ein **lokaler Agent** in **Cursor Desktop** kann das — wenn du das Projekt dort oeffnest.

---

## In 3 Minuten

### 1. Cursor Desktop installieren (falls noch nicht)

https://cursor.com/download → Windows → installieren → anmelden

### 2. Projekt oeffnen

**File → Open Folder** → `C:\Users\moezkan\Woeschplan`

(Falls Ordner fehlt: PowerShell → `git clone https://github.com/berkanoezkan-sys/W-schplan.git C:\Users\moezkan\Woeschplan`)

### 3. Neuen Agent-Chat starten

- Modus: **Agent** (nicht Ask, nicht Cloud Agent)
- Diesen Text **copy & paste**:

```
Starte Woeschplan ohne Docker auf meinem PC.
Virtualisierung geht nicht — kein Docker.
Hilf mir Neon einzurichten falls DATABASE_URL noch fehlt.
Dann npm.cmd run pc:start-no-docker ausfuehren.
```

Der lokale Agent liest `.cursor/rules/pc-no-docker-start.mdc` und arbeitet auf deinem Rechner.

Terminal-Befehle einmal mit **Allow/Run** bestaetigen.

---

## Was der lokale Agent kann (du nicht manuell)

- `apps/api/.env` bearbeiten
- `npm install`, migrate, seed
- API + Expo in zwei Fenstern starten
- Desktop-Verknuepfung anlegen (`npm.cmd run pc:desktop-no-docker`)

## Was du einmal selbst machen musst

| Schritt | Warum |
|---------|--------|
| Neon-Account + Connection String | Braucht dein Login (kostenlos) |
| Cursor Desktop oeffnen | Agent laeuft nur lokal auf dem PC |
| Terminal erlauben | Sicherheitsabfrage von Cursor |

---

## Ohne Agent — fast automatisch

1. Neon: https://neon.tech → Connection String kopieren
2. In `apps\api\.env` bei `DATABASE_URL=` einfuegen
3. PowerShell:

```powershell
cd C:\Users\moezkan\Woeschplan
git pull
npm.cmd run pc:desktop-no-docker
```

4. Desktop → **Woeschplan starten (ohne Docker)** doppelklicken

---

**Fazit:** Ich kann keinen Agent *auf* deinem PC *von hier aus* anlegen. Du oeffnest **Cursor Desktop + Woeschplan-Ordner** — dann ist der Agent da und kann alles starten.
