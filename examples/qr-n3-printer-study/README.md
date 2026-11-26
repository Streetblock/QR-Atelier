# N3-Druckversuch auf 50 × 25 mm

Vier reproduzierbare QR-Testvektoren vergleichen die dokumentierte ISO-Auslegung
des QR Ateliers mit dem ZPL-Bewerter des Toolkits. **Drei Symbole passen pro
Etikett**, einschließlich vier Modulen Ruhezone je Seite. Für alle vier Fälle
liegen [Firmware-Messungen am ZD421](#firmware-bitmap-ohne-ausdruck) vor.
Der Papiervergleich steht aus.

## Druckdateien

Den Ordner für die tatsächliche Druckkopfauflösung wählen:

| Ordner | Raster | Etikett in Punkten | Modulgröße | Größtes Symbol inkl. Ruhezone |
| --- | --- | --- | --- | --- |
| [203](203/01-primary.zpl) | 8 Punkte/mm | 400 × 200 | 3 Punkte = 0,375 mm | 13,875 mm |
| [300](300/01-primary.zpl) | 12 Punkte/mm | 600 × 300 | 5 Punkte ≈ 0,417 mm | 15,417 mm |
| [600](600/01-primary.zpl) | 24 Punkte/mm | 1200 × 600 | 9 Punkte = 0,375 mm | 13,875 mm |

Die dpi-Namen bezeichnen die üblichen Druckkopfklassen; maßgeblich ist das
angegebene Raster in Punkten/mm. ZPL unverändert als Rohdaten senden, ohne
Seitenskalierung durch einen Grafik-/PDF-Druckertreiber.

Jeder Ordner enthält vier getrennte Druckaufträge; jede enthaltene `^XA`/`^XZ`-
Sequenz erzeugt ein Etikett:

1. **`00-bq-mask-parameter.zpl` – 3 Etiketten:** D01 wird nativ mit `^BQ` und
   Maskenparameter 0–7 sowie einmal ohne diesen Parameter gedruckt. Damit zuerst
   prüfen, ob die Firmware den Parameter beachtet.
2. **`01-primary.zpl` – 4 Etiketten:** links ISO-Matrix, Mitte Toolkit-ZPL-Matrix,
   rechts nativer `^BQ` mit weggelassenem Maskenparameter.
3. **`02-other-scorers.zpl` – 4 Etiketten:** dieselben Kandidaten, ausgewählt mit
   Nayuki-, ZXing- und Segno-Bewertung. `SG/TG` bedeutet, dass Segno und der
   generische Toolkit-Bewerter denselben Kandidaten wählen.
4. **`03-all-masks.zpl` – 12 Etiketten:** je Vektor alle acht festen Masken auf
   drei Etiketten. Dient zum optischen Abgleichen mit dem nativen Druck.

Für einen ersten Durchlauf reichen die vier Etiketten aus `01-primary.zpl`.
Der Parameter-Test und der Maskenatlas helfen bei der eindeutigen Auswertung.

[Layoutvorschau](preview.svg): links Hauptvergleich, rechts weitere Bewerter.
Die grauen Kästen sind ausdrücklich Platzhalter für den noch unbekannten
nativen Druck, keine simulierten Druckerergebnisse.

## Exakte Eingaben und Masken

QR Model 2, ein manuelles Byte-Segment, nur ASCII, kein ECI. Versionen werden
durch Payload und Fehlerkorrektur natürlich erreicht; sie werden nicht künstlich
erzwungen, da `^BQ` keinen Versionsparameter anbietet. Zahlen sind Maskennummern
0–7. Alle Bewerter erhalten identische vollständige Kandidatenmatrizen.

| ID | Payload (exakt) | ECL / Version | ISO | Toolkit ZPL | Toolkit generisch | Nayuki | ZXing Java | Segno |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| D01 | `2nnnxj` | L / 1 | **1** | **6** | 7 | 6 | 1 | 7 |
| S02 | `uth36pnfozuqu8py` | Q / 2 | **0** | **6** | 0 | 0 | 6 | 0 |
| P03 | `caewsu3k1lhg9gqi585swmw2` | H / 3 | **0** | **4** | 4 | 5 | 7 | 4 |
| C04 | `x01uc6lrun` | M / 1 | **2** | **2** | 2 | 2 | 2 | 2 |

Die drei Unterscheidungsfälle haben auf beiden Seiten strikt bessere Scores
für die jeweils gewählte Maske; es handelt sich nicht um Gleichstandsentscheidungen.
C04 kontrolliert Kodierung, Layout und Druck, ohne eine Maskendifferenz zu erwarten.

Die Referenzspalten beschreiben **Bewerter auf denselben fertigen Matrizen**.
Insbesondere Segnos eigener Encoder kann durch sein Padding und den Zeitpunkt
der Format-/Versionsbits andere Ergebnisse liefern. Siehe den
[Referenzvergleich](../../docs/qr-reference-comparison.md).

## Warum diese Vektoren unterscheiden

Gesamtscores der entscheidenden Kandidaten:

| Fall | Kandidat | ISO gesamt | Toolkit ZPL gesamt | Ursache |
| --- | --- | ---: | ---: | --- |
| D01 | Maske 1 | 383 | 423 | Ein Kern mit hellem Bereich auf beiden Seiten wird im Toolkit zweimal gezählt. |
| D01 | Maske 6 | 404 | 404 | Kein Unterschied an diesem Kandidaten. |
| S02 | Maske 0 | 472 | 512 | Toolkit erkennt einen Teiltreffer innerhalb eines längeren äußeren Schwarzlaufs. |
| S02 | Maske 6 | 506 | 466 | Das skalierte Verhältnis 2:2:6:2:2 wird nur von unserer Auslegung gezählt. |
| P03 | Maske 0 | 571 | 611 | Teiltreffer an einem längeren äußeren Schwarzlauf. |
| P03 | Maske 4 | 598 | 598 | Kein Unterschied an diesem Kandidaten. |

Konkrete Fundstellen (alle Koordinaten **nullbasiert**, ohne Ruhezone):

* D01, Maske 1: Zeile 19, Kern ab Spalte 6. Vollständige Zeile:
  `100000101110100001000`. Vor dem Kern liegen fünf helle Module, danach vier.
* S02, Maske 6: Zeile 12, Kern ab Spalte 6 mit Einheit 2. Zeile:
  `0000001100111111001100001`. Vor dem Kern liegen sechs helle Module, danach vier.
* S02, Maske 0: Zeile 5, Legacy-Teiltreffer ab Spalte 12. Zeile:
  `1000001000011011101000001`.
* P03, Maske 0: Spalte 5, Legacy-Teiltreffer ab Zeile 16. Spalte:
  `10000010100000011011101000001`.

S02 unterscheidet durch **zwei gleichzeitig wirksame Unterschiede**. Der Versuch
behauptet nicht, dieser Payload isoliere ausschließlich skalierte Muster. P03
kombiniert über alle acht Kandidaten ebenfalls mehrere N3-Effekte. D01 zeigt den
Doppelzählungseffekt besonders direkt.

## Was tatsächlich gedruckt wird

Feste Referenzen werden über den **Toolkit-Generator als `^GFA`-Grafiken**
ausgegeben. Dadurch kann die Firmware deren Masken nicht neu auswählen. Die
weiße Ruhezone gehört zur erzeugten Grafik. Es gibt keine Grafikdownloads auf
Flash oder gespeicherte Druckerressourcen.

Die native Spalte verwendet denselben Toolkit-Generator, aber ein `^BQ`-Feld.
Beispiel D01 bei 203 dpi: `^BQN,2,3^FDLM,B00062nnnxj^FS`. Die manuelle
Byteangabe vermeidet Unterschiede durch automatische Segmentierung.

**Weggelassener Maskenparameter bedeutet hier nicht nachgewiesene Automatik.**
Der [Zebra-Guide zu `^BQ`](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-bq.html)
führt den fünften Parameter als Maske 0–7 mit Default 7 auf. Darum enthält das
Paket den separaten Parameter-Test. Falls die Firmware stets die explizit
angegebene Maske und ohne Parameter Maske 7 druckt, beweist dies keine interne
N3-Auswahlregel. Falls sie den Parameter ignoriert, müssen wir das als solches
protokollieren, bevor wir die native Auswahl mit dem Toolkit vergleichen.

Die eingefrorenen Toolkit-Referenzen stammen aus `31bf73e`. Die damalige
Vorschau ignorierte den optionalen Maskenparameter. Im neueren Toolkit
`73ce6e2` nutzt die Vorschau standardmäßig `qrMaskPolicy: 'zebra-auto'`.
Mit `qrMaskPolicy: 'explicit'` kann sie die angegebene Maske darstellen.
Welche Maske die Firmware tatsächlich verwendet, wird am Gerät gemessen.

Die folgenden Vorhersagen verwenden dieselben 32 gespeicherten Kandidaten.
Das Toolkit-Zebra-Profil verwendet den experimentellen P0-Bewerter.

| Fall | QR-Atelier | Toolkit-Standard | Toolkit-Zebra-Profil (P0) |
| --- | ---: | ---: | ---: |
| D01 | 1 | 6 | 7 |
| S02 | 0 | 6 | 0 |
| P03 | 0 | 4 | 4 |
| C04 | 2 | 2 | 2 |

Alle Formate setzen Punkte als Einheit, Home/Shift/Top, normale Orientierung,
Spiegelung aus und Label-Invertierung aus. Druckgeschwindigkeit, Heizleistung,
Medientyp und Kalibrierung werden nicht verändert.

## Firmware-Bitmap ohne Ausdruck

Für die Maskenmessung am ZD421 wird je Abruf ein einzelnes natives
`^BQ`-Feld in einem eigenen Format gerendert. `^IS` legt das Ergebnis
mit Druckoption `N` als temporäre RAM-Grafik ab. `^HY` liefert das
Firmware-Bitmap zur Auswertung. Die Druckzähler und relevanten
Druckereinstellungen werden davor und danach verglichen. Anschließend wird
die eindeutig benannte temporäre Grafik entfernt.

In der ursprünglichen Messreihe bleiben Payload, Byte-Modus,
Fehlerkorrekturstufe und Modulgröße je Vektor gleich. Zuerst wird der
Maskenparameter weggelassen. Danach werden die Werte
0–7 einzeln geprüft. Die Auswertung liest beide Kopien der QR-Formatbits,
bestätigt den Payload und vergleicht die Matrix mit den festen Kandidaten.
Modell, Firmware und Auflösung gehören zur Beobachtung.

Die vorbereiteten Mehrseiten-ZPL-Dateien sind für den separaten Papier-Test
bestimmt. Das Firmware-Bitmap belegt die Wahl der Maske und das Modulraster.
Papier- und Scanqualität werden mit realen Ausdrucken geprüft.
[Zebra `^IS`](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-is.html) ·
[Zebra `^HY`](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-hy.html)

### D01-Messung am ZD421

Am 25. November 2026 lieferte der ZD421 mit 300 dpi (12 Punkte/mm) und Firmware
`V93.21.17Z` für D01 in **allen neun Abrufen Maske 4**. Das galt für den
weggelassenen Parameter ebenso wie für jeden expliziten Wert von 0 bis 7.
Beide Formatkopien enthielten `0x662f` (ECC L, Maske 4). ZXing dekodierte
`2nnnxj`. Alle 441 Module stimmten mit der festen Referenz für Maske 4 überein.

Die Messung bestätigt für diese Eingabe, dass der fünfte `^BQ`-Parameter
die ausgegebene Maske auf diesem Gerät nicht veränderte. Der beobachtete
Wert 4 weicht von der dokumentierten Vorgabe 7 und von den Vorhersagen für
QR-Atelier (1), Toolkit-Standard (6) und Toolkit-P0 (7) ab. Die Auswahlregel
der Firmware bleibt offen.

Das 158 Punkte hohe Medium schnitt den ersten Abruf mit fünf Punkten je Modul
unten ab. Die vollständigen Abrufe nutzten drei Punkte je Modul an `^FO20,0`.
Das Symbol hatte 63 × 63 Punkte und mindestens vier freie Module auf jeder
Seite. Etikettenzähler und Drucklängenzähler blieben bei beiden Durchläufen
unverändert. Alle temporären RAM-Grafiken wurden entfernt. Die Messdaten und
die ausgelesene Matrix stehen in [zd421-d01-bitmap.json](zd421-d01-bitmap.json).

#### D01-Kontrollen bei zwei Druckpunkten pro Modul

Am 26. November 2026 wurde D01 mit derselben Firmware bei zwei Druckpunkten
pro Modul in vier Varianten erneut abgerufen.

| `^BQ` | `^FD` | Maske |
| --- | --- | ---: |
| `^BQN,2,2` | `^FDLM,B00062nnnxj` | 4 |
| `^BQN,2,2,L` | `^FDLM,B00062nnnxj` | 4 |
| `^BQN,2,2,L,7` | `^FDLM,B00062nnnxj` | 4 |
| `^BQN,2,2` | `^FDLA,2nnnxj` | 4 |

Die vollständige Matrix entspricht in allen vier Fällen der vorherigen
Messung mit drei Druckpunkten je Modul. Die Formatkopien bestätigen ECC L
und Maske 4. Die dekodierten Daten-Codewörter stimmen auch bei automatischer
Segmentwahl überein. Die Druckzähler blieben unverändert.
[Messdaten der vier Abrufe](zd421-d01-controls.json)

### S02, P03 und C04 am ZD421

Die 27 weiteren Bitmaps vom 25. November 2026 stammen vom selben ZD421 mit
Firmware `V93.21.17Z`. Für jeden Vektor ergaben der weggelassene Maskenparameter
und alle expliziten Werte 0–7 jeweils dieselbe Matrix. Beide Formatkopien
bestätigten die erwartete Fehlerkorrekturstufe und ZXing las den exakten Inhalt.

| Vektor | ZD421 bei allen neun Abrufen | QR-Atelier | Toolkit-Standard | Toolkit-Zebra-Profil (P0) |
| --- | ---: | ---: | ---: | ---: |
| S02 | **0** | 0 | 6 | 0 |
| P03 | **4** | 0 | 4 | 4 |
| C04 | **2** | 2 | 2 | 2 |

Die Vergleichsspalten wurden mit QR-Atelier `8dcccb1` und Toolkit `73ce6e2`
erneut berechnet. Beide Toolkit-Profile und QR-Atelier reproduzierten alle
32 fest vorgegebenen Kandidaten der Studie modulgenau.

Jeder Abruf stimmte modulgenau mit der gespeicherten Referenz seiner
beobachteten Maske überein. Bei S02 unterschieden sich 252 der 625 Module von
der Vorhersage des Toolkit-Standards. Bei P03 unterschieden sich 297 der 841
Module von der QR-Atelier-Vorhersage. C04 bestätigte alle drei Vorhersagen.
Das experimentelle Toolkit-Profil P0 traf hier alle drei Masken. Bei D01 lag
es daneben. Die Auswahlregel der Firmware bleibt offen.

Zwei Druckpunkte je Modul an `^FO20,0` ließen bei allen Vektoren mindestens
vier freie Module auf jeder Seite. Etiketten- und Drucklängenzähler blieben
unverändert. Alle temporären RAM-Grafiken wurden entfernt. Die Daten pro Abruf
und die vollständigen Matrizen stehen in
[zd421-s02-p03-c04-bitmaps.json](zd421-s02-p03-c04-bitmaps.json).

## Druckprotokoll

1. Druckermodell, Firmware, Punkte/mm, Material, Geschwindigkeit und Heizleistung
   notieren. Auflösung nicht aus der Dateivorschau ableiten.
2. Hauptvergleich drucken. Prüfen, ob alle Symbole vollständig sind und ihre
   Ruhezonen frei bleiben. Bei einer abweichenden nativen Symbolgröße oder
   einem Versatz zuerst diese Abweichung dokumentieren.
3. Inhalte scannen: Alle drei Symbole einer Zeile müssen exakt denselben Payload
   liefern. Der Payload allein verrät die Maske nicht.
4. Native Matrix mit den festen Referenzen bzw. dem vollständigen Maskenatlas
   vergleichen. Für eine spätere maschinelle Auswertung ein scharfes, gerades
   Foto des gesamten Etiketts oder die ausgelesenen Formatbits aufbewahren.
5. Beobachtete native Maske und Parameterverhalten in [observations.csv](observations.csv)
   eintragen. Die vorhandenen ZD421-Einträge stammen aus den Bitmap-Messungen.

Ein Match zur Toolkit-ZPL-Maske ist ein Befund für genau diese Eingabe und
Firmware, keine allgemeine Bestätigung aller N3-Fälle oder ISO-Konformität.

## Daten, Prüfung und Reproduktion

* [cases.json](cases.json): stabile Eingaben.
* [vectors.json](vectors.json): alle acht Matrizen, SHA-256, Scores, Fundstellen,
  gewählte Masken, Layout und Quellenstände.
* [scores.csv](scores.csv): N1/N2/N3/N4 und Summen für alle 32 Kandidaten.
* Toolkit-Stand: `31bf73e`; Nayuki 1.8.0, ZXing Java 3.5.3, Segno 1.6.6.

Nach Installation der Abhängigkeiten aus dem Referenzvergleich:

```sh
node scripts/generate-qr-printer-vectors.mjs --toolkit /path/to/zpl-toolkit
node --test tests/qr-printer-vectors.test.mjs
```

Die Tests prüfen jede gespeicherte Matrix gegen den aktuellen Atelier-Core,
dekodieren alle 32 Matrizen mit ZXing, kontrollieren jeden Pixel der ZPL-Grafiken
einschließlich Ruhezone und prüfen Formatgrenzen sowie die exakten nativen
Bytefelder. Das ersetzt den vorgesehenen Hardwareversuch nicht.
