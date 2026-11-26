# Open lessen KdG: webapp

Toont de geplande open lessen uit de Airtable-base "Open lessen" op kdg.be. Zelfde opzet als `unibuddy-webapp` en `late-start-webapp`.

## Opzet

Airtable → GitHub Action (elk uur en bij elke push, token als secret `AIRTABLE_TOKEN`) → `data.json` op GitHub Pages → `widget.js` op kdg.be.

Embed-code (HTML-paragraaf in Drupal), dezelfde code op elke pagina:

```html
<div id="kdg-open-lessen-root"></div>
<script src="https://kdg-marcom.github.io/open-lessen-webapp/widget.js" defer></script>
```

De widget herkent de pagina aan het adres:

- `/opleidingen/infomomenten/volg-een-les`: overzicht van alle lessen met zoekveld, opleidingen (meerdere) en campus.
- adres van een opleiding (veld `webaddress` in tabel Opleidingen): alleen de lessen van die opleiding, zonder tabel.
- geen lessen: wachtlijstformulier, met de opleiding van de pagina al aangeduid.

## Bestanden

| Bestand | Wat |
|---|---|
| `widget.js` | Logica en HTML. Geen eigen CSS, alleen klassen van kdg.be (Bootstrap 3 + thema). |
| `inhoud.json` | Teksten, CSS-klassen, adres van de overzichtspagina, koppeling van de wachtlijst. |
| `build-data.js` | Haalt Opleidingen en Lessen uit Airtable en schrijft `data.json`. |
| `data.json` | Alleen geplande, inschrijfbare lessen met vrije plaatsen die nog niet voorbij zijn. Geen lesgevers, geen aantallen. |
| `demo-data.json` | Alleen voor de testpagina. |
| `index.html` | Testpagina met keuzelijst per pagina. |

## Nog te doen

1. Repository aanmaken, Pages aanzetten (branch `main`), secret `AIRTABLE_TOKEN` toevoegen (alleen-lezen, `data.records:read` op base `appkHYyDh9Vf5EatW`).
2. Wachtlijst koppelen in `inhoud.json`: `wachtlijstWebhook` (Airtable-automatisering "When webhook received" die een rij in tabel Wachtlijst maakt) of `wachtlijstFormulier` (deellink van het Airtable-formulier Wachtlijst, de widget vult dan voornaam, e-mail en opleiding vooraf in). Zolang beide leeg zijn, verstuurt het formulier niets.
3. `build-data.js` is nog niet tegen de echte Airtable-API gedraaid.

## Privacy

`data.json` is openbaar. Er staan geen lesgevers, e-mailadressen of inschrijvingen in.
