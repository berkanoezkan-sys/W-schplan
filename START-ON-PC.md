# Erster Start auf dem PC

Nach dem Klonen des Repos sag im Cursor-Chat einfach:

> **PC starten — Backup synchronisieren**

Der Agent liest `.cursor/rules/pc-first-start.mdc` und führt automatisch aus:

1. iCloud-Backup finden (`Berkans Dokumente/Woeschplan-Migration-Backup/latest`)
2. `.env` wiederherstellen
3. `npm install`, Docker, Migration, Seed
4. Dev-Stack starten
5. Chat-Import anleiten

Manuell:

```powershell
git clone https://github.com/berkanoezkan-sys/W-schplan.git Woeschplan
cd Woeschplan
npm run pc:restore
npm run dev:up
```

Warte vorher, bis iCloud Drive synchronisiert ist.
