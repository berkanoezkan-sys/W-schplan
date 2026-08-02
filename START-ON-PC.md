# Erster Start auf dem PC

Nach dem Klonen des Repos sag im Cursor-Chat einfach:

> **PC starten — Backup synchronisieren**

Der Agent liest `.cursor/rules/pc-first-start.mdc` und führt automatisch aus:

1. iCloud-Backup finden (`Berkans Dokumente/Woeschplan-Migration-Backup/latest`)
2. `.env` wiederherstellen
3. `npm install`, Docker, Migration, Seed
4. Dev-Stack starten
5. Chat-Import anleiten

## Ein Klick auf dem PC

Doppelklick auf **`pc-start.bat`** im Repo-Root — oder in PowerShell:

```powershell
cd C:\dev\Woeschplan
npm run pc:start
```

Das Skript stellt das iCloud-Backup wieder her, setzt die LAN-IP und startet den Dev-Stack.

Warte vorher, bis iCloud Drive synchronisiert ist.
