/* Open lessen KdG: widget voor kdg.be.
   Geen eigen CSS: schrijft alleen HTML met klassen die kdg.be al kent (zie inhoud.json).
   Embed:  <div id="kdg-open-lessen-root"></div>
           <script src="https://kdg-marcom.github.io/open-lessen-webapp/widget.js" defer></script>
   De widget herkent de pagina aan het adres: de overzichtspagina toont alle lessen met zoek en filters,
   een opleidingspagina toont alleen de lessen van die opleiding.
   Testen: data-pagina="/chemie" overschrijft het adres, data-bron="demo-data.json" een ander databestand. */
(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var basis = script && script.src ? script.src.replace(/[^\/]*$/, "") : "";
  var root = document.getElementById("kdg-open-lessen-root");
  if (!root) return;

  var TZ = "Europe/Brussels";
  var data = { opleidingen: [], lessen: [] };
  var T = {
    overzichtPad: "/opleidingen/infomomenten/volg-een-les",
    wachtlijstWebhook: "", wachtlijstFormulier: "",
    klassen: { knop: "btn btn-primary", tabel: "table", tabelWrap: "table-responsive", veld: "form-control", groep: "form-group",
      rij: "row", kolomBreed: "col-sm-8", kolomSmal: "col-sm-4", kolomHelft: "col-sm-6", vink: "checkbox", kader: "well",
      fout: "alert alert-danger", ok: "alert alert-success", link: "chevron-after", linkIcoon: "icon icon-chevron" },
    tekst: {
      zoek: "Zoek", zoekPlaceholder: "Opleiding of les", campus: "Campus", alleCampussen: "Alle campussen",
      opleiding: "Opleiding:", alleOpleidingen: "alle opleidingen", gekozen: "opleidingen gekozen", wis: "Wis filters",
      les: "les", lessen: "lessen", wanneer: "Wanneer", lesKolom: "Les", waar: "Waar", inschrijven: "Schrijf je in",
      geenLessen: "Er zijn nu geen lessen gepland", geenResultaat: "Geen les gevonden die bij je past",
      wachtlijstTitel: "Zet je op de wachtlijst", wachtlijstOpen: "Past geen enkel moment? Zet je op de wachtlijst",
      wachtlijstIntro: "Laat je gegevens achter. We mailen je zodra er een les gepland is.",
      voornaam: "Voornaam", email: "E-mailadres", ikWil: "Ik wil een les volgen in", welke: "Voor welke opleiding(en) wil je een les volgen?",
      ookAndere: "Ook andere opleidingen aanduiden", kies: "Kies een of meer opleidingen",
      gdpr: "Ik ga akkoord dat KdG mijn gegevens gebruikt om me te verwittigen over open lessen.",
      marketing: "Hou me ook op de hoogte van infodagen en ander studiekeuzenieuws van KdG.",
      verstuur: "Zet me op de wachtlijst",
      foutVoornaam: "Vul je voornaam in.", foutEmail: "Vul een geldig e-mailadres in.", foutOpleiding: "Duid minstens één opleiding aan.",
      foutGdpr: "Ga akkoord met het gebruik van je gegevens om je op de wachtlijst te zetten.",
      bedankt: "Je staat op de wachtlijst, {voornaam}.", bedanktVervolg: "We mailen je op {email} zodra er een les gepland is voor {opleidingen}.",
      nietGekoppeld: "Testversie: het formulier is nog niet met Airtable gekoppeld, er is niets verzonden."
    }
  };
  var state = { q: "", opls: [], campus: "" };

  function $(s, r) { return (r || root).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function fmt(o) { o.timeZone = TZ; return new Intl.DateTimeFormat("nl-BE", o); }
  var fDag = fmt({ weekday: "short", day: "numeric", month: "short" }), fTijd = fmt({ hour: "2-digit", minute: "2-digit" }), fMaand = fmt({ month: "long", year: "numeric" });
  function pad(p) { return String(p || "").split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase() || "/"; }
  function veilig(u) { return /^https:\/\//.test(u || "") ? u : ""; }
  function samen(doel, bron) { for (var k in bron) { if (bron[k] && typeof bron[k] === "object" && !Array.isArray(bron[k])) samen(doel[k] = doel[k] || {}, bron[k]); else doel[k] = bron[k]; } }
  function oplNaam(id) { var o = data.opleidingen.filter(function (x) { return x.id === id; })[0]; return o ? o.naam : ""; }
  function meet(naam, params) { try { if (window.gtag) window.gtag("event", naam, params); else if (window.dataLayer) window.dataLayer.push(Object.assign({ event: naam }, params)); } catch (e) {} }

  // data.json bevat al alleen geplande lessen met vrije plaatsen; hier vallen lessen weg die intussen voorbij zijn.
  function lessen() {
    var nu = Date.now();
    return data.lessen.filter(function (l) { return new Date(l.einde).getTime() > nu && veilig(l.url); })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  }
  function moment(l) { var s = new Date(l.start), e = new Date(l.einde); return esc(fDag.format(s)) + ", " + esc(fTijd.format(s)) + "&nbsp;–&nbsp;" + esc(fTijd.format(e)); }
  function oplNamen(l) { return l.opl.map(oplNaam).filter(Boolean).join(", "); }

  function tabel(ls) {
    var k = T.klassen, t = T.tekst;
    return '<div class="' + k.tabelWrap + '"><table class="' + k.tabel + '"><thead><tr><th>' + esc(t.wanneer) + "</th><th>" + esc(t.lesKolom) + "</th><th>" + esc(t.waar) + '</th><th><span class="sr-only">' + esc(t.inschrijven) + "</span></th></tr></thead><tbody>" +
      ls.map(function (l) {
        return "<tr><td>" + moment(l) + "</td><td><strong>" + esc(l.vak) + "</strong><br>" + esc(oplNamen(l)) + "</td><td>" + esc(l.locatie) + '</td><td class="text-right">' +
          '<a class="' + k.knop + '" href="' + esc(l.url) + '" target="_blank" rel="noopener" data-ol-les="' + esc(l.vak) + '">' + esc(t.inschrijven).replace(/ /g, "&nbsp;") + '<span class="sr-only"> ' + esc(l.vak) + "</span></a></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function perMaand(ls) {
    var html = "", vorige = "", groep = [];
    function sluit() { if (groep.length) html += "<h2>" + esc(vorige.charAt(0).toUpperCase() + vorige.slice(1)) + "</h2>" + tabel(groep); groep = []; }
    ls.forEach(function (l) { var m = fMaand.format(new Date(l.start)); if (m !== vorige) { sluit(); vorige = m; } groep.push(l); });
    sluit();
    return html;
  }
  // Opleidingspagina: geen tabel, per les één alinea met een tekstlink.
  function eenvoudig(ls) {
    var k = T.klassen;
    return ls.map(function (l) {
      return "<p><strong>" + moment(l) + "</strong><br>" + esc(l.vak) + " · " + esc(l.locatie) + '<br><a class="' + k.link + '" href="' + esc(l.url) + '" target="_blank" rel="noopener" data-ol-les="' + esc(l.vak) + '">' + esc(T.tekst.inschrijven) +
        (k.linkIcoon ? '<i class="' + k.linkIcoon + '"></i>' : "") + "</a></p>";
    }).join("");
  }

  function vinkjes(items, naam, kolom) {
    var k = T.klassen;
    return items.map(function (n) {
      return (kolom ? '<div class="' + k.kolomSmal + '">' : "") + '<div class="' + k.vink + '"><label><input type="checkbox" name="' + naam + '" value="' + esc(n.value) + '"' + (n.aan ? " checked" : "") + "> " + esc(n.label) + "</label></div>" + (kolom ? "</div>" : "");
    }).join("");
  }

  function wachtlijst(titel, gekozen) {
    var k = T.klassen, t = T.tekst;
    var alle = data.opleidingen.map(function (o) { return o.naam; }).sort(function (a, b) { return a.localeCompare(b, "nl"); });
    var rest = alle.filter(function (n) { return gekozen.indexOf(n) < 0; });
    return '<div class="' + k.kader + '" id="ol-wachtlijst"><h3>' + esc(titel) + "</h3><p>" + esc(t.wachtlijstIntro) + "</p>" +
      '<form id="ol-wl-form" novalidate><div class="' + k.rij + '">' +
      '<div class="' + k.groep + " " + k.kolomHelft + '"><label for="ol-wl-voornaam">' + esc(t.voornaam) + '</label><input type="text" class="' + k.veld + '" id="ol-wl-voornaam" autocomplete="given-name" required></div>' +
      '<div class="' + k.groep + " " + k.kolomHelft + '"><label for="ol-wl-email">' + esc(t.email) + '</label><input type="email" class="' + k.veld + '" id="ol-wl-email" autocomplete="email" required></div></div>' +
      '<div class="' + k.groep + '"><label>' + esc(gekozen.length ? t.ikWil : t.welke) + "</label>" +
      vinkjes(gekozen.map(function (n) { return { value: n, label: n, aan: true }; }), "ol-wl-opl", false) +
      (rest.length ? "<details" + (gekozen.length ? "" : " open") + "><summary>" + esc(gekozen.length ? t.ookAndere : t.kies) + ' ▾</summary><div class="' + k.rij + '">' +
        vinkjes(rest.map(function (n) { return { value: n, label: n }; }), "ol-wl-opl", true) + "</div></details>" : "") + "</div>" +
      '<div class="' + k.vink + '"><label><input type="checkbox" id="ol-wl-gdpr" required> ' + esc(t.gdpr) + "</label></div>" +
      '<div class="' + k.vink + '"><label><input type="checkbox" id="ol-wl-marketing"> ' + esc(t.marketing) + "</label></div>" +
      '<div class="' + k.fout + '" id="ol-wl-fout" role="alert" hidden></div>' +
      '<button type="submit" class="' + k.knop + '">' + esc(t.verstuur) + "</button></form></div>";
  }

  function verstuurWachtlijst(rij, klaar) {
    if (veilig(T.wachtlijstWebhook)) {
      // Airtable-automatisering "When webhook received". no-cors: de browser mag het antwoord niet lezen.
      fetch(T.wachtlijstWebhook, { method: "POST", mode: "no-cors", body: JSON.stringify(rij) }).then(function () { klaar(true); }, function () { klaar(false); });
    } else if (veilig(T.wachtlijstFormulier)) {
      var q = Object.keys(rij).filter(function (k) { return typeof rij[k] === "string"; }).map(function (k) { return "prefill_" + encodeURIComponent(k) + "=" + encodeURIComponent(rij[k]); }).join("&");
      window.open(T.wachtlijstFormulier + (T.wachtlijstFormulier.indexOf("?") < 0 ? "?" : "&") + q, "_blank", "noopener");
      klaar(null);
    } else klaar(false);
  }

  root.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-ol-les]") : null;
    if (a) meet("open_les_click", { les: a.getAttribute("data-ol-les"), link_url: a.href });
  });
  root.addEventListener("submit", function (e) {
    e.preventDefault();
    if (e.target.id !== "ol-wl-form") return;
    var f = e.target, t = T.tekst, fout = $("#ol-wl-fout", f);
    var voornaam = $("#ol-wl-voornaam", f).value.trim(), email = $("#ol-wl-email", f).value.trim();
    var opls = [].map.call(f.querySelectorAll('input[name="ol-wl-opl"]:checked'), function (i) { return i.value; });
    var msg = !voornaam ? t.foutVoornaam : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t.foutEmail : !opls.length ? t.foutOpleiding : !$("#ol-wl-gdpr", f).checked ? t.foutGdpr : "";
    if (msg) { fout.textContent = msg; fout.hidden = false; return; }
    var knop = f.querySelector("button[type=submit]"); knop.disabled = true;
    verstuurWachtlijst({ "Voornaam": voornaam, "E-mail": email, "Interesse-opleiding": opls.join(", "), "GDPR-akkoord": true, "Marketing-toestemming": $("#ol-wl-marketing", f).checked }, function (verzonden) {
      if (verzonden === null) { knop.disabled = false; return; }
      meet("open_les_wachtlijst", { opleiding: opls.join(", ") });
      $("#ol-wachtlijst").innerHTML = '<div class="' + T.klassen.ok + '" role="status"><strong>' + esc(t.bedankt.replace("{voornaam}", voornaam)) + "</strong> " +
        esc(t.bedanktVervolg.replace("{email}", email).replace("{opleidingen}", opls.join(", "))) + "</div>" + (verzonden ? "" : "<p><small>" + esc(t.nietGekoppeld) + "</small></p>");
    });
  });

  function renderOverzicht() {
    var k = T.klassen, t = T.tekst, alle = lessen();
    if (!alle.length) { root.innerHTML = wachtlijst(t.geenLessen, []); return; }
    var opls = data.opleidingen.filter(function (o) { return alle.some(function (l) { return l.opl.indexOf(o.id) >= 0; }); }).sort(function (a, b) { return a.naam.localeCompare(b.naam, "nl"); });
    var campussen = []; alle.forEach(function (l) { if (l.campus && campussen.indexOf(l.campus) < 0) campussen.push(l.campus); }); campussen.sort();
    root.innerHTML = '<form id="ol-filters" role="search"><div class="' + k.rij + '">' +
      '<div class="' + k.groep + " " + k.kolomBreed + '"><label for="ol-q">' + esc(t.zoek) + '</label><input type="search" class="' + k.veld + '" id="ol-q" placeholder="' + esc(t.zoekPlaceholder) + '" autocomplete="off"></div>' +
      '<div class="' + k.groep + " " + k.kolomSmal + '"><label for="ol-campus">' + esc(t.campus) + '</label><select class="' + k.veld + '" id="ol-campus"><option value="">' + esc(t.alleCampussen) + "</option>" + campussen.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="' + k.groep + '"><details id="ol-opl"><summary><strong>' + esc(t.opleiding) + '</strong> <span id="ol-opl-tekst"></span> ▾</summary><div class="' + k.kader + '"><div class="' + k.rij + '">' +
      vinkjes(opls.map(function (o) { return { value: o.id, label: o.naam }; }), "ol-opl", true) + "</div></div></details></div></form>" +
      '<div id="ol-resultaat" aria-live="polite"></div>';
    $("#ol-q").addEventListener("input", function (e) { state.q = e.target.value; renderResultaat(); });
    $("#ol-campus").addEventListener("change", function (e) { state.campus = e.target.value; renderResultaat(); });
    $("#ol-opl").addEventListener("change", function () { state.opls = [].map.call(root.querySelectorAll('input[name="ol-opl"]:checked'), function (i) { return i.value; }); renderResultaat(); });
    renderResultaat();
  }
  function renderResultaat() {
    var t = T.tekst;
    $("#ol-opl-tekst").textContent = !state.opls.length ? t.alleOpleidingen : state.opls.length === 1 ? oplNaam(state.opls[0]) : state.opls.length + " " + t.gekozen;
    var q = norm(state.q).trim().split(/\s+/).filter(Boolean);
    var ls = lessen().filter(function (l) {
      var tekst = norm(l.vak + " " + oplNamen(l) + " " + l.locatie);
      return (!state.opls.length || l.opl.some(function (o) { return state.opls.indexOf(o) >= 0; })) && (!state.campus || l.campus === state.campus) && q.every(function (w) { return tekst.indexOf(w) >= 0; });
    });
    var gefilterd = state.q || state.opls.length || state.campus;
    var wisLink = '<a href="#" id="ol-wis">' + esc(t.wis) + "</a>";
    $("#ol-resultaat").innerHTML = ls.length
      ? "<p><strong>" + ls.length + " " + esc(ls.length === 1 ? t.les : t.lessen) + "</strong>" + (gefilterd ? " · " + wisLink : "") + "</p>" + perMaand(ls)
      : "<p>" + wisLink + "</p>" + wachtlijst(t.geenResultaat, state.opls.map(oplNaam));
    var wis = $("#ol-wis");
    if (wis) wis.addEventListener("click", function (e) { e.preventDefault(); state = { q: "", opls: [], campus: "" }; renderOverzicht(); });
  }
  function renderOpleiding(o) {
    var t = T.tekst, ls = lessen().filter(function (l) { return l.opl.indexOf(o.id) >= 0; });
    root.innerHTML = ls.length
      ? eenvoudig(ls) + "<details><summary>" + esc(t.wachtlijstOpen) + " ▾</summary>" + wachtlijst(t.wachtlijstTitel, [o.naam]) + "</details>"
      : wachtlijst(t.geenLessen, [o.naam]);
  }

  function render() {
    state = { q: "", opls: [], campus: "" };
    var p = pad(root.getAttribute("data-pagina") || location.pathname);
    var o = data.opleidingen.filter(function (x) { return pad(x.pad) === p; })[0];
    if (o && p !== pad(T.overzichtPad)) renderOpleiding(o); else renderOverzicht();
  }
  function laad(naam) { return fetch(basis + naam, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(naam); return r.json(); }); }
  function start() {
    var bron = root.getAttribute("data-bron") || "data.json";
    laad("inhoud.json").then(function (i) { samen(T, i); }, function () {})
      .then(function () { return laad(bron); })
      .then(function (d) { data = d; }, function () {})
      .then(render);
  }
  window.kdgOpenLessen = start;
  start();
})();
