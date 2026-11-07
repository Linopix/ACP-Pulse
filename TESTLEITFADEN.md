# ACP Pulse — Testleitfaden

Zwei Prozesse: die Sendung und der Receiver. Der Receiver nimmt Play und Lautstärke an. Ohne Sonos-Gerät antwortet ein Testlautsprecher im Receiver und zeigt, welche SOAP-Befehle rausgegangen wären. Mit Gerät gehen dieselben Befehle an Port 1400.

Die Testversion startet den Dev-Server im Container. Dieselbe Aufteilung (Sendung + Receiver) steht in `deploy/k8s.yaml` für später. Ein entfernter Cluster erreicht Sonos im Büro nicht; der Receiver muss im selben Netz wie der Lautsprecher laufen.

## Stack starten

Im Projektordner:

```bash
docker compose up --build
```

- Sendung: http://localhost:8080
- Receiver: http://localhost:8090

Receiver allein, zum Beispiel gegen eine schon laufende Sendung:

```bash
docker compose up --build receiver
```

In der Regie unter Ausgabe «Test-Receiver übernehmen», Ziel **Sonos** oder **Receiver**, speichern, dann «Verbindung prüfen».

## Konto

1. Erstes Konto anlegen. Diese Person ist Regie.
2. Zweites Konto im anderen Browser oder Inkognito. Das ist Hörer.
3. Regie, Rollen: Hörer, DJ oder Regie. DJ sieht das Pult, nicht die Regie. Die letzte Regie kann sich nicht selbst entheben.

Erwartung: Hörer hat Wunsch und Stimmen. DJ hat zusätzlich Pult. Regie hat beides plus Programm.

## Hören

1. Anmelden. Oben «Führung» geht die Bedienung Schritt für Schritt durch. «Später» blendet sie aus, der Knopf holt sie wieder.
2. Läuft etwas, «Sendung hören» falls der Browser den Ton blockt. «Leise hier» gilt nur für dieses Gerät.
3. Leere Queue: es läuft die markierte Hausplaylist.

## Wünschen und Stimmen

1. Suche, «30s Vorschau» oder «Ganze Titel», «Dazu».
2. Höchstens 3 offene Wünsche pro Person. Der vierte wird abgelehnt.
3. Hoch und Runter. Die Anzeige `genutzt/Kontingent` wächst mit der Queue und reicht nie für jeden Titel. Eigene Wünsche stimmt man nicht selbst ab.
4. Ab der Zahl unter Programm «Downvotes bis ein Titel fliegt» (Standard 3), und nur wenn mehr Runter als Hoch, fliegt der Titel sofort.

## Volle Queue

Regie, Programm.

- «Schwache Wünsche automatisch raus»: sobald mindestens so viele Wünsche daliegen wie «Ab so vielen Wünschen» (Standard 8, mindestens 4), fliegen Titel ohne Upvote oder mit mehr Runter als Hoch (Beispiel 1 hoch, 2 runter). Unentschieden bleibt. Der laufende Titel bleibt. Ein Wunsch, der jünger als 90 Sekunden ist, bleibt automatisch liegen.
- «Nichts automatisch entfernen» schaltet nur den Automatismus aus.
- «Jetzt aufräumen» entfernt schwache Wünsche sofort, auch unter der Grenze und auch ganz neue.

So prüfst du es mit einem Konto: Grenze auf 4 stellen und speichern. Drei Wünsche suchen, dazu im Pult einen https-Link auf eine mp3/m4a/ogg/wav. Alle ohne Stimme. «Jetzt aufräumen» leert die schwachen. Für den Automatismus die vier liegen lassen, eine Stimme 1 hoch / 2 runter auf einen älteren Titel setzen (zweites und drittes Konto) und die Sendung neu laden, nachdem 90 Sekunden um sind. Titel mit mehr Hoch als Runter bleiben.

## Regie, der Rest

| Stelle | Tun | Erwartung |
| --- | --- | --- |
| Kalender | Zeitfenster mit Wünsche aus und Filter streng | In der Sendung steht der Name. Wünsche sind zu. Explicit und Sperrwörter bleiben draußen. Danach ist wieder der Normalwert. |
| Playlists | Zweite Liste, als Hausplaylist markieren, Titel suchen und dazu | Ohne Wünsche läuft diese Liste. |
| Sender | https-Stream anlegen, Zeitfenster jetzt bis in ein paar Minuten | Zur Startzeit übernimmt der Stream. YouTube bleibt im Browser. |
| Moderation | Slots, Themen, Firmennotizen, «Skript erzeugen» | Mit KI-Zugang ein kurzer Text, sonst der Hinweis, dass Durchsagen von Hand gehen. «Sofort auf Sendung» unterbricht. |
| Rollen | Zweites Konto auf DJ | Pult ja, Regie nein. |

Farben und Name stehen nur in `src/brand.ts`. Die Oberfläche liest diese Variablen.

## Pult

1. Mikrofon: aufnehmen, anhören, «Auf Sendung» oder nur speichern. Höchstens 45 Sekunden. Die Musik bricht ab, danach geht es weiter.
2. Gespeicherte Aufnahme noch einmal auf Sendung legen oder löschen.
3. «Sender jetzt», 10 / 30 / 60 Minuten. Überspringen in der Sendung beendet das Fenster.
4. Andere Quelle: YouTube-Link nur in den Browsern. Direkte Audiodatei geht an den Receiver mit.

Ohne Mikrofonfreigabe bleibt der Hinweis stehen, der Rest des Pults geht trotzdem.

## Web-Receiver

1. Regie, Ausgabe, **Receiver**.
2. Adresse `http://localhost:8090` (im Compose-Netz der Sendung ist es `http://receiver:8090`, das trägt die Umgebung ein). Mithören optional.
3. Speichern. Lautstärke schieben und noch einmal speichern.
4. «Verbindung prüfen».

Erwartung in der Regie: Play angenommen, Lautstärke angenommen, Sonos «Nicht beteiligt».

Auf http://localhost:8090 steht der letzte Titel. Das Journal mit den Befehlen:

```bash
curl -s http://localhost:8090/v1/journal
```

Ein echter Play, sobald die Sendung wechselt und die Adresse gespeichert ist:

```bash
curl -s -X POST http://localhost:8090/v1/play \
  -H 'content-type: application/json' \
  -d '{"output":"receiver","mode":"track","url":"https://example.com/song.mp3","title":"Song","artist":"Test","volume":40,"room":"","sonosHost":""}'
```

Antwort `ok: true`. YouTube oder eine Durchsage ohne Datei: der Receiver sagt, dass keine Audiodatei da ist. Die Box bleibt still, der Browser spielt YouTube weiter.

## Sonos ohne Gerät

1. Ausgabe **Sonos**, Raum zum Beispiel `Büro`, Sonos-Gerät leer lassen.
2. Receiver-Adresse wie oben, speichern, «Verbindung prüfen».

Erwartung: Testlautsprecher hat `SetAVTransportURI`, `Play` und `SetVolume` angenommen. Das sind dieselben SOAP-Aufrufe, die ein echtes Gerät auf Port 1400 bekommen würde.

Im Journal steht der XML-Umschlag je Befehl unter `sonos.results[].body`. Sonderzeichen im Titel sind im XML maskiert.

Gegenstelle, die niemand abnimmt, absichtlich falsch:

1. Sonos-Gerät `127.0.0.1:1` eintragen, speichern, prüfen.

Erwartung: nicht ok. Die Zeile Sonos sagt, dass das Gerät nicht antwortet und die Befehle gültig sind: `SetAVTransportURI`, `Play`, `SetVolume`. Damit ist der Weg geprüft, auch wenn kein Lautsprecher im Netz ist.

## Sonos mit Gerät

1. Sonos-Gerät: IP des Players, Raum wie in der Sonos-App.
2. Receiver muss diese IP auf Port 1400 erreichen. Derselbe Rechner wie `docker compose`, nicht ein Cluster ausserhalb des Büros.
3. Speichern, «Verbindung prüfen».

Erwartung bei erreichbarem Player: dieselben drei Befehle mit Status ok. Der Player versucht danach die Probe-URL `https://example.com/pulse-probe.mp3` zu laden. Die schlägt fehl, weil sie nur die Verbindung prüft. Ein echter Titel aus «Ganze Titel» oder eine Audiodatei aus dem Pult hat eine echte https-Adresse; die prüft der nächste Titelwechsel.

YouTube geht auch dann nicht an Sonos.

## Kubernetes

```bash
docker compose build
kubectl apply -f deploy/k8s.yaml
kubectl port-forward svc/pulse 8080:8080
kubectl port-forward svc/pulse-receiver 8090:8090
```

Images heissen `pulse:test` und `pulse-receiver:test`. In einem richtigen Cluster die Namen auf die Registry ziehen. `PULSE_RECEIVER_URL` zeigt auf den Service `pulse-receiver`. Sonos nur, wenn das Pod-Netz die Player-IP erreicht.

## Kurz, was nicht die Box ist

- Vorschau-Katalog: etwa 30 Sekunden, https, geht an den Receiver.
- Internet Archive: ganze Titel ohne Abo, https, geht an den Receiver.
- Spotify: Suche bleibt aus, bis eine Verbindung da ist.
- YouTube: nur Browser.
- Text-Durchsage: Stimme im Browser, keine Datei an der Box. Mikrofon-Aufnahme ist eine Datei und kann mit.
