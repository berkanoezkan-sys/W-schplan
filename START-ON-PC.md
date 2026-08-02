# Erster Start auf dem PC

Nach dem Klonen des Repos sag im Cursor-Chat einfach:

> **PC starten — Backup synchronisieren**

Der Agent liest `.cursor/rules/pc-first-start.mdc` und führt automatisch aus:

1. iCloud-Backup finden (`Berkans Dokumente/Woeschplan-Migration-Backup/latest`)
2. `.env` wiederherstellen
3. `npm install`, Docker, Migration, Seed
4. Dev-Stack starten
5. Chat-Import anleiten

Manuell (dein Backup-Pfad):

```powershell
cd C:\dev\Woeschplan
$env:WOESCHPLAN_BACKUP_DIR = "C:\Users\moezkan\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup"
.\scripts\pc-restore-from-backup.ps1
npm run dev:up
```

Das Skript findet automatisch den neuesten Snapshot-Ordner, auch wenn `latest` fehlt.

Warte vorher, bis iCloud Drive synchronisiert ist.
