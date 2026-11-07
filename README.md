# ACP Pulse

Mitarbeiter-Radio. Wer angemeldet ist, hört dieselbe Sendung, legt Wünsche in die Queue und stimmt ab. Die Regie legt fest, was laufen darf, wie laut es ist und wohin der Ton geht. Ein DJ macht Durchsagen und schaltet echte Sender dazu.

Der Name und die Farben stehen nur in [`src/brand.ts`](src/brand.ts). Die Oberfläche liest diese Werte, sie sind nicht noch einmal im CSS verdoppelt.

Bedienung prüfen: [`TESTLEITFADEN.md`](TESTLEITFADEN.md).

## Oberflächen

| Pfad | Rolle | Inhalt |
| --- | --- | --- |
| `/` | angemeldet | Sendung, Suche, Queue, Stimmen |
| `/login` | alle | Konto anlegen oder anmelden |
| `/dj` | DJ, Regie | Mikrofon, Aufnahmen, Sender jetzt, fremde Audiodatei |
| `/admin` | Regie | Ausgabe, Programm, Kalender, Sender, Playlists, Moderation, Rollen |

Das erste Konto wird Regie. Die letzte Regie kann sich nicht selbst auf Hörer oder DJ setzen. Ein DJ sieht das Pult, nicht die Regie.

Die Führung (Knopf oben) erklärt die Bedienung einmal pro Browser. Längere Hintergründe gehören hierher, nicht in die Oberfläche.

## Wie die Sendung entscheidet

Eine Zeile in `playback` ist die gemeinsame Uhr. `advancePlayback` in [`src/lib/pulse/api.ts`](src/lib/pulse/api.ts) wählt den nächsten Beitrag. Reihenfolge:

1. **Durchsage.** Unterbricht. Ein laufender Wunsch geht zurück auf `queued`, die Hausplaylist setzt den Zeiger einen Schritt zurück.
2. **Relais.** Ein Radiosender, dessen Zeitfenster jetzt gilt, oder ein Fenster, das das Pult gerade aufgemacht hat.
3. **Wunsch.** Höchster Score, bei Gleichstand der ältere. Gesperrte Titel werden übersprungen.
4. **Hausplaylist.** Die Playlist mit `is_fallback`. Läuft im Kreis, wenn die Queue leer ist.
5. **Leerlauf.** Kein spielbarer Titel.

YouTube bleibt im Browser (nocookie-iframe). Eine direkte `http(s)`-Audiodatei geht auch an Sonos oder den Receiver.

Schreibende Wege laufen durch eine Sperre (`withRadioLock`), damit zwei Wünsche die Queue nicht gleichzeitig umsortieren.

## Stimmen und Aufräumen

Regeln ohne Datenbank: [`src/lib/pulse/logic.ts`](src/lib/pulse/logic.ts). Tests: [`src/lib/pulse/logic.test.ts`](src/lib/pulse/logic.test.ts).

- Höchstens drei offene Wünsche pro Person. Eigene Wünsche stimmt man nicht ab.
- Das Kontingent wächst mit der Queue und reicht nie für jeden Titel. Hoch ist höchstens ein Drittel, mindestens eine Stimme, bei einem einzelnen Titel nur Runter.
- Die Queue sortiert nach `upvotes - downvotes`, dann nach Alter.
- Ab `downvoteKick` Runter-Stimmen (Standard 3), und nur wenn mehr Runter als Hoch, fliegt der Titel sofort (`kicked`), auch wenn er gerade läuft.
- Schwache Wünsche sind ohne Upvote oder mit mehr Runter als Hoch (1 hoch, 2 runter). Unentschieden bleibt.
- Steht Aufräumen auf `auto` und liegen mindestens `wishPruneAt` Wünsche (Standard 8, Spanne 4–40), gehen schwache Wünsche auf `pruned`. Jünger als 90 Sekunden bleiben liegen. Der laufende Titel bleibt.
- «Jetzt aufräumen» ignoriert Grenze und Schonfrist.

Status eines Wunsches: `queued`, `playing`, `played`, `kicked`, `pruned`.

## Filter und Kalender

| Modus | Wirkung |
| --- | --- |
| `allow` | nichts gesperrt |
| `clean` | nur das Explicit-Flag der Quelle |
| `strict` | Explicit plus Sperrwörter in Titel oder Artist |

Die eingebaute Wortliste ist `DEFAULT_BLOCKLIST`. Die Regie ergänzt sie komma- oder zeilenweise. Ein Kalendereintrag überschreibt für sein Zeitfenster Lautstärke, Wunscherlaubnis und Filter. Danach gelten wieder die Normalwerte.

## Musikquellen

| Quelle | Wo | Was ankommt |
| --- | --- | --- |
| `preview` | Suche «30s Vorschau» | iTunes-Vorschau, etwa 30 Sekunden |
| `archive` | Suche «Ganze Titel» | Internet Archive, ganze MP3, ohne Abo |
| `youtube` | Pult, YouTube-Link | oEmbed plus iframe, nur Browser |
| `link` | Pult, direkte Audiodatei | mp3, m4a, ogg, wav über https |
| `spotify` | Programm, Schalter | noch nicht verbunden; die Suche verweist auf «Ganze Titel» |

Spotify ist bewusst nur ein Schalter. Sobald ein Client angebunden ist, bleibt der Rest der Queue gleich: `TrackInput` kennt `source` und `externalId`.

## Ausgabe

| Ziel | Verhalten |
| --- | --- |
| `browser` | nur die offenen Clients |
| `sonos` | SOAP an Host:1400, Raumname ist Anzeige |
| `receiver` | derselbe JSON-Befehl, der Receiver spielt lokal |

`tryDispatch` schickt Play nur, wenn Ziel und Receiver-URL gesetzt sind, und nur einmal pro Beitrag. Schlägt der Ruf fehl, läuft die Sendung im Browser weiter und der nächste Takt versucht es erneut.

Der Test-Receiver ([`receiver/server.mjs`](receiver/server.mjs)) nimmt dieselben Befehle an. Ohne erreichbares Sonos-Gerät antwortet ein Lautsprecher im Prozess und legt die SOAP-Umschläge ins Journal. Mit Gerät gehen `SetAVTransportURI`, `Play` und `SetVolume` an Port 1400.

| Pfad | Bedeutung |
| --- | --- |
| `GET /v1/health` | lebt |
| `GET /v1/journal` | letzte Befehle, Mock-Zustand |
| `POST /v1/probe` | prüfen, nichts starten |
| `POST /v1/play` | annehmen und, bei Sonos, abschicken |
| `POST /v1/volume` | nur Lautstärke |

`PULSE_RECEIVER_URL` setzt die Adresse, die die Regie übernehmen kann. In Compose ist das `http://receiver:8090`.

## Moderation

Text-Durchsagen spricht der Browser. Eine Aufnahme (höchstens 45 Sekunden, webm/opus) unterbricht wie eine Durchsage und geht danach an die Boxen, weil sie eine Audiodatei ist.

«Skript erzeugen» ruft xAI nur auf, wenn `XAI_API_KEY` gesetzt ist. Ohne Schlüssel bleibt der Hinweis, dass Durchsagen von Hand gehen. Das Skript erfindet keine Schlagzeilen: Themen und Firmennotizen aus der Regie, sonst ein allgemeiner Satz. Sofort auf Sendung oder in den nächsten Slot (`HH:MM`, kommagetrennt).

## Daten

Migrationen in [`migrations/`](migrations/):

| Datei | Inhalt |
| --- | --- |
| `0001_auth.sql` | Konten |
| `0002_pulse.sql` | Mitglieder, Einstellungen, Playlists, Queue, Stimmen, Playback, Durchsagen |
| `0003_desk.sql` | Aufnahmen, Sender, Zeitfenster |
| `0004_prune.sql` | `wish_prune`, `wish_prune_at` |

Ohne `DATABASE_URL` läuft Postgres im Prozess (PGLite). Mit gesetzter URL ist es Neon, ohne Codeänderung. Typen der Antworten: [`src/lib/pulse/types.ts`](src/lib/pulse/types.ts).

## Starten

Lokal, mit Receiver auf 8090 und Sendung auf 8080:

```bash
npm run dev
node receiver/server.mjs
```

Docker, gleiche Aufteilung:

```bash
docker compose up --build
```

Sendung unter <http://localhost:8080>, Receiver unter <http://localhost:8090>. Der Container startet den Dev-Server. Das ist die Testversion, kein Produktionsimage.

`localhost` ist nur der direkte Weg ohne Zertifikat. Die Anmeldung vertraut von Haus aus nur dieser Adresse, und das Sitzungs-Cookie ist `Secure`: ein Browser legt es auf einer normalen HTTP-Adresse außer localhost nicht ab. Eine eigene Adresse braucht deshalb HTTPS.

## Eigene Adresse

Pi-hole, A-Einträge auf die IP des Docker-Rechners:

- `acpulse.mycloud.ag` — Hörerseite, Pult, Regie, und der Receiver unter `/receiver/`
- `rec.acpulse.mycloud.ag` — dieselbe Receiver-Seite, nur mit eigenem Namen

Ein Eintrag für `acpulse.mycloud.ag` gilt nicht automatisch für `rec.acpulse.mycloud.ag`. Fehlt der zweite Eintrag, findet der Browser die Subdomain nicht. Dann die Seite unter `https://acpulse.mycloud.ag/receiver/` öffnen.

Die Hörer rufen den Receiver nicht auf. Die Sendung spricht ihn intern unter `http://receiver:8090` an.

Neben `docker-compose.yml` eine Datei `.env`, die nicht ins Repo gehört:

```bash
PULSE_PUBLIC_HOST=acpulse.mycloud.ag
BETTER_AUTH_URL=https://acpulse.mycloud.ag
BETTER_AUTH_SECRET=eine-lange-zufaellige-zeichenkette
```

Dann:

```bash
docker compose --profile proxy up --build
```

[`deploy/Caddyfile`](deploy/Caddyfile) macht TLS und leitet weiter. `tls internal` ist das Zertifikat fürs eigene Netz. Let's Encrypt steht als Alternative in derselben Datei, geht aber nur, wenn der Name öffentlich auflöst und Port 80 aus dem Internet ankommt. Pi-hole darf den Namen im LAN danach trotzdem auf die interne IP zeigen.

Ohne die drei Variablen lehnt die Anmeldung die fremde Adresse ab. Die Oberfläche sagt dann, dass die Anmeldung von dieser Adresse nicht erlaubt ist.

[`deploy/k8s.yaml`](deploy/k8s.yaml) ist dieselbe Form für später: ein Pod Sendung, ein Pod Receiver, Service-Name `pulse-receiver`. Sonos im Büro erreicht ein entfernter Cluster nicht. Der Receiver muss im selben Netz stehen wie der Lautsprecher.

```bash
npm test
npm run typecheck
```

## Codekarte

| Datei | Aufgabe |
| --- | --- |
| `src/brand.ts` | Name, Farben, Schriften, Radien |
| `src/lib/pulse/logic.ts` | Stimmen, Filter, Aufräumen, YouTube-Link, Rollen |
| `src/lib/pulse/api.ts` | Serverfunktionen, Playback, Dispatch |
| `src/lib/pulse/types.ts` | Snapshots, die die Oberfläche bekommt |
| `src/components/pulse-station.tsx` | Sendung |
| `src/components/pulse-dj.tsx` | Pult |
| `src/components/pulse-admin.tsx` | Regie |
| `src/components/pulse-guide.tsx` | Führung |
| `src/components/pulse-ui.tsx` | Leiste, Flächen, Knöpfe |
| `receiver/server.mjs` | Test-Receiver und Sonos-SOAP |
