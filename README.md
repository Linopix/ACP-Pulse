# ACP Pulse

Mitarbeiter-Radio. Wer angemeldet ist, hört dieselbe Sendung, legt Wünsche in die Queue und stimmt ab. Die Regie legt fest, was laufen darf, wie laut es ist und wohin der Ton geht. Ein DJ macht Durchsagen und schaltet echte Sender dazu.

Der Name und die Farben stehen in [`src/brand.ts`](src/brand.ts). Die Regie kann Firma, Produkt, Satz und Signalfarbe unter Marke überschreiben. Leere Felder fallen auf diese Datei zurück. Schriften bleiben dort. Die Oberfläche liest die Werte, sie sind nicht noch einmal im CSS verdoppelt.

Bedienung prüfen: [`TESTLEITFADEN.md`](TESTLEITFADEN.md).

## Oberflächen

| Pfad | Rolle | Inhalt |
| --- | --- | --- |
| `/` | angemeldet | Sendung, Suche, Queue, Stimmen |
| `/login` | alle | Konto anlegen oder anmelden |
| `/dj` | DJ, Regie | Mikrofon, Aufnahmen, Sender jetzt, fremde Audiodatei |
| `/admin` | Regie | Ausgabe, Bereiche, Programm, Musikplan, Kalender, Dienste, Sender, Playlists, Moderation, Nutzer, Debug, Marke |

Das erste Konto wird Regie. Die letzte Regie kann sich nicht selbst auf Hörer oder DJ setzen. Ein DJ sieht das Pult, nicht die Regie.

Die Führung (Knopf oben) erklärt die Bedienung einmal pro Browser. Längere Hintergründe gehören hierher, nicht in die Oberfläche.

## Wie die Sendung entscheidet

Eine Zeile in `playback` ist die gemeinsame Uhr. `advancePlayback` in [`src/lib/pulse/api.ts`](src/lib/pulse/api.ts) wählt den nächsten Beitrag. Reihenfolge:

1. **Durchsage.** Unterbricht. Ein laufender Wunsch geht zurück auf `queued`, die Hausplaylist setzt den Zeiger einen Schritt zurück.
2. **Relais.** Ein Radiosender, dessen Zeitfenster jetzt gilt, oder ein Fenster, das das Pult gerade aufgemacht hat.
3. **Wunsch.** Höchster Score, bei Gleichstand der ältere. Gesperrte Titel werden übersprungen.
4. **Hausplaylist.** Die Playlist mit `is_fallback`. Läuft im Kreis, wenn die Queue leer ist.
5. **Leerlauf.** Kein spielbarer Titel.

YouTube spielt im Browser und auf der Receiver-Seite (nocookie-iframe). Eine direkte `http(s)`-Audiodatei geht auch an Sonos. Sonos bekommt kein YouTube.

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

Die eingebaute Wortliste ist `DEFAULT_BLOCKLIST`. Die Regie ergänzt sie komma- oder zeilenweise. Ein Kalendereintrag fürs ganze Haus überschreibt für sein Zeitfenster Lautstärke, Wunscherlaubnis und Filter. Danach gelten wieder die Normalwerte. Ein Eintrag für einen Bereich ändert nur Lautstärke und Wünsche an den Geräten dort, nicht die gemeinsame Queue.

## Audiobereiche

Regie → Bereiche benennt Geräte und legt sie in höchstens zwölf Bereiche. Jeder Bereich hat eine eigene Lautstärke. Geräte ohne Bereich nehmen die Lautstärke der Sendung.

Musikplan und Kalender kennen «Ganzes Haus» oder einen Bereich. Ganzes Haus steuert die Sendung. Ein Bereich steuert nur Lautstärke und Wunscherlaubnis der Geräte darin. Der laufende Titel und die Queue bleiben eine Sendung.

Ein Gerät gilt als verbunden, wenn es sich in den letzten 12 Sekunden gemeldet hat. Älter als 14 Tage verschwindet es aus der Liste.

## Gleichlauf

`stationSeconds` ist die gemeinsame Uhr ab `startedAt`. `syncNudge` in [`src/lib/pulse/logic.ts`](src/lib/pulse/logic.ts) entscheidet Tempo oder Sprung. Eng wird nur nachgezogen, wenn mindestens ein weiteres Gerät desselben Bereichs online ist. Allein hört niemand den Versatz, ein Sprung würde nur auffallen.

| Lage | Verhalten |
| --- | --- |
| Allein, oder einziges Gerät im Bereich | Unter 80 ms nichts. Bis 1,5 s Tempo 0,988–1,012. Darüber ein Sprung. YouTube springt erst ab 1,2 s. |
| Gruppe im selben Bereich | Unter 40 ms nichts. Bis 0,22 s Tempo 0,96–1,04. Darüber ein Sprung, damit 0,8 s Versatz im Raum nicht stehen bleibt. YouTube springt ab 0,18 s, weil es kein Feintempo kann. |

Livestreams werden nicht geschoben. Debug in der Regie zeigt Drift, Tempo und ob das Gerät «Gruppe» oder «allein» ist.

## Marke

Regie → Marke setzt Firmenname, Produktname, Satz und Signalfarbe. Leer lassen stellt den Wert aus `brand.ts` wieder her. Die Anmeldung liest `GET /api/brand`.

## Musikquellen

| Quelle | Wo | Was ankommt |
| --- | --- | --- |
| `preview` | Suche «30s Vorschau» | iTunes-Vorschau, etwa 30 Sekunden |
| `archive` | Suche «Ganze Titel» | Internet Archive, ganze MP3, ohne Abo |
| `youtube` | Dienst «YouTube», Suche, Link oder hinterlegte Playlist | oEmbed, Innertube oder API-Schlüssel. Browser und Receiver-Seite |
| `link` | Pult, direkte Audiodatei | mp3, m4a, ogg, wav über https |
| `spotify` | Dienst «Spotify», Suche und Playlist-Link | Metadaten, wenn ein Token da ist. Der Ton der gemeinsamen Sendung ist nie der Spotify-Player: Suche und Import spielen über YouTube, sonst eine 30-Sekunden-Vorschau. |

YouTube und Spotify sind Dienste unter Regie → Dienste, nicht nur ein Schalter. Ohne Schlüssel sucht YouTube öffentlich. Spotify sucht auch ohne verbundenes Konto über denselben gemeinsamen Katalog (YouTube oder 30-Sekunden-Vorschau), sobald der Dienst an ist. Ein persönliches Spotify-Konto ist optional und kein Player der Sendung. `TrackInput` kennt weiter `source` und `externalId`.

Unter Playlists hängt ein öffentlicher Spotify-Link dieselbe Liste an und wandelt die Titel nach YouTube. Was YouTube nicht hergibt, bleibt eine 30-Sekunden-Vorschau. «Testen» prüft die ersten Titel einer Playlist und den Stream eines Senders, ohne etwas zu starten und ohne Zugangsdaten anzuzeigen.

Microsoft 365 liest einen Kalender (App mit Calendars.Read oder ein ICS aus Outlook) in den Musikplan. Dieselbe App meldet das Team an, siehe unten. Piper spricht Durchsagen mit Kerstin oder Eva, beides weiblich. Ohne Piper-Adresse spricht der Browser, mit Adresse geht dieselbe Ansage als Datei an die Boxen.

## Piper einrichten

Auf dem Rechner, der die Stimme sprechen soll (nicht im Pulse-Container):

```bash
sh scripts/install-piper.sh
```

Das Skript legt Piper und die Stimmen `de_DE-kerstin-low` und `de_DE-eva_k-x_low` nach `~/.local/share/acp-piper` und startet `scripts/piper-server.mjs` auf `0.0.0.0:5000`. `--no-start` installiert nur. Gesundheit: `GET /health`. Ansage: `POST /` mit JSON `{ "text", "voice" }`, Antwort `audio/wav`.

In der Regie unter Dienste → Piper die Adresse eintragen. Läuft Pulse in Docker, ist `127.0.0.1` der Container, nicht der Rechner. Compose kennt `host.docker.internal`, die Adresse ist dann `http://host.docker.internal:5000`. Ohne Docker reicht `http://127.0.0.1:5000`.

## Microsoft-Anmeldung

Dieselbe App-Registrierung wie der Kalender. In Entra ID:

1. App-Registrierung, ein Mandant. Plattform **Web**.
2. Umleitungs-URI exakt `https://<öffentliche-adresse>/api/microsoft/callback`, zum Beispiel `https://acpulse.mycloud.ag/api/microsoft/callback`.
3. Geheimer Clientschlüssel. Den Wert nur einmal anzeigen lassen und in der Regie eintragen. Leer lassen behält den alten.
4. API-Berechtigungen: delegiert `openid`, `profile`, `email`. Als Anwendung `Calendars.Read`, dann Administratorzustimmung.
5. In der Regie unter Dienste → Microsoft 365 einschalten: Mandant (`firma.onmicrosoft.com` oder die Mandanten-ID), Client-ID, Geheimnis, Postfach für den Kalender.

`BETTER_AUTH_URL` muss genau diese öffentliche HTTPS-Adresse sein. Die Umleitung und das Sitzungs-Cookie hängen daran. Ohne HTTPS legt der Browser das Cookie nicht ab, außer auf localhost.

«Mit Microsoft anmelden» legt das Konto nach der E-Mail an oder verknüpft ein bestehendes. Die erste Person ohne Regie wird Regie. Ein gesperrtes Konto kommt nicht hinein. Schlägt es fehl, steht der Grund auf der Anmeldeseite.

Der Musikplan setzt pro Block Lautstärke, Wünsche, Filter und Energie. Das Pult zeigt denselben Tag als Konsole: oben was läuft, die Uhr und die Lautstärke, darunter das Mikrofon und der aktuelle Block, rechts Sender, Aufnahmen und die nächsten Wünsche.

## Ausgabe

| Ziel | Verhalten |
| --- | --- |
| `browser` | nur die offenen Clients |
| `sonos` | SOAP an Host:1400, Raumname ist Anzeige |
| `receiver` | die Receiver-Seite spielt YouTube und Audiodateien, Sonos nicht |

`tryDispatch` schickt Play nur, wenn Ziel und Receiver-URL gesetzt sind, und nur einmal pro Beitrag. Schlägt der Ruf fehl, läuft die Sendung im Browser weiter und der nächste Takt versucht es erneut.

Der Test-Receiver ([`receiver/server.mjs`](receiver/server.mjs)) ist der Lautsprecher unter `/`. «Ton an» startet die Wiedergabe, `/v1/now` ist der aktuelle Beitrag. Ohne erreichbares Sonos-Gerät antwortet ein Testlautsprecher und legt die SOAP-Umschläge ins Journal. Mit Gerät gehen `SetAVTransportURI`, `Play` und `SetVolume` an Port 1400.

Die Standardmusik sind die YouTube-Playlists Chill, Pop Charts, Fokus und Jazz. Ein Spotify- oder YouTube-Playlist-Link hängt unter Regie → Playlists dieselbe Liste an. Spotify-Titel werden über YouTube gespielt, sonst über eine 30-Sekunden-Vorschau. Das ist kein verbundenes Spotify-Konto.

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
| `0005_services.sql` | Dienste, Nutzerstatus, Piper-Stimme, Musikplan |
| `0006_areas.sql` | Audiobereiche und Geräte |
| `0007_zones_brand.sql` | Bereich an Musikplan und Kalender, Firmenmarke |

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

Sendung unter <http://localhost:8080>, Receiver unter <http://localhost:8090>. Der Container startet den Dev-Server. Das ist die Testversion, kein Produktionsimage. Konten, Wünsche und die Sendung liegen im Volume `pulse-data` und bleiben nach einem Neustart des Containers. `docker compose down -v` löscht das Volume und damit die Konten.

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
| `src/lib/pulse/logic.ts` | Stimmen, Filter, Aufräumen, Gleichlauf, YouTube-Link, Rollen |
| `src/lib/pulse/api.ts` | Serverfunktionen, Playback, Dispatch, Bereiche |
| `src/lib/pulse/services.ts` | YouTube, Spotify-Suche und Playlist-Import, Kalender, Piper |
| `src/lib/pulse/brand-public.ts` | Marke ohne Anmeldung, für die Startseite |
| `src/lib/pulse/microsoft.ts` | Anmeldung über Entra, ohne die Auth-Konfiguration anzufassen |
| `src/lib/pulse/cues.ts` | Kennungen nur im Browser, nicht auf Sendung |
| `src/lib/pulse/types.ts` | Snapshots, die die Oberfläche bekommt |
| `src/components/pulse-station.tsx` | Sendung, Queue, Gleichlauf |
| `src/components/pulse-listen.tsx` | Ton an und Leise hier auf Pult und Regie |
| `src/components/pulse-dj.tsx` | Pult |
| `src/components/pulse-admin.tsx` | Regie, Playlists, Sender, Marke |
| `src/components/pulse-areas.tsx` | Bereiche und Debug |
| `src/components/pulse-area.tsx` | Herzschlag des Geräts, Lautstärke des Bereichs |
| `src/components/pulse-plan.tsx` | Musikplan, Tagesstreifen |
| `src/components/pulse-brand.tsx` | Marke live in der Oberfläche |
| `src/components/pulse-nav.tsx` | Leiste und Kanäle |
| `src/components/pulse-guide.tsx` | Führung |
| `src/components/pulse-ui.tsx` | Leiste, Flächen, Knöpfe |
| `scripts/install-piper.sh` | Piper und die Stimmen Kerstin, Eva |
| `scripts/piper-server.mjs` | Sprachdienst, JSON rein, WAV raus |
| `receiver/server.mjs` | Test-Receiver und Sonos-SOAP |

## KI, noch nicht angeschlossen

OpenWebUI bleibt intern. Die Sendung ruft es nicht auf. Sinnvoll wäre es nur als Redaktion, nie als eigene Stimme auf Sendung:

- Durchsage-Skript aus Text, den die Regie selbst eingibt: Firmennotizen oder ein eingefügter Nachrichtenausschnitt. Keine eigenen Schlagzeilen.
- Kurzer Hinweis am Pult, was als Nächstes im Zeitplan steht. Nur für die Person am Pult.
- Erklärung, warum ein Titel am Filter hängen bleibt.

Nicht sinnvoll: Titel selbst aussuchen, ungeprüft sprechen, Personen nennen, die nicht in den Notizen stehen.

Ein realistischer Moderator braucht später vier Dinge, die heute fehlen:

1. OpenWebUI als OpenAI-kompatible Chat-Schnittstelle: Basis-URL, API-Schlüssel, Modellname. Der Server der Sendung muss diese Adresse erreichen.
2. Eine getrennte Sprachausgabe, zum Beispiel Piper auf dem Pi. OpenWebUI liefert Text, keinen sendefähigen Ton.
3. Die erzeugte Audiodatei läuft über denselben Weg wie eine Mikrofonaufnahme, damit Browser, Sonos und Receiver dasselbe spielen.
4. Freigabe: Entwurf lesen, dann auf Sendung, oder nur in den schon vorhandenen Slots und nur aus freigegebenem Text. Jedes Skript bleibt nachlesbar. Ohne Schlüssel oder ohne Modell bleibt es bei Durchsagen von Hand.

`XAI_API_KEY` ist der bisherige Platzhalter für «Skript erzeugen» und kein Ersatz für diese Kette.

