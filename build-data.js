// Bouwt data.json uit de Airtable-base "Open lessen". Draait in de GitHub Action (Node 20+).
// Nodig: omgevingsvariabele AIRTABLE_TOKEN (alleen-lezen, scope data.records:read op deze base).
// In data.json komen alleen geplande, inschrijfbare lessen met vrije plaatsen die nog niet voorbij zijn.
// Lesgevers, aantallen en inschrijvingen komen er niet in.
const fs = require("fs");

const BASE = "appkHYyDh9Vf5EatW";
const OPLEIDINGEN = "tblz6NgeU6q1VwL18";
const LESSEN = "tbl5ZE3FklTl39znL";
const F = {
  oplTitel: "fldhfPlHZZX1mS0xl", oplId: "fldFAXAar6CBApnz7", oplUrl: "fldTEr2KvtzPY3eGx",
  vak: "fldlqfvNHfzl95xL8", opleiding: "fldYrfU6aSkMzfRZt", start: "fldgdMXWET1jpc2nn", einde: "fldYGMevmQ3YHMEh2",
  locatie: "fldSugtOKIJdTEBTM", status: "fldJefOtDGXN7kjNW", vrij: "fldjM8nahBFKQelRE", inschrijfbaar: "fldaPZZ9YfD3AqGS6", inschrijven: "fldrZdvG3DgPAwe54",
};
const CAMPUSSEN = [["hoboken", "Campus Hoboken"], ["groenplaats", "Campus Groenplaats"], ["sint lucas", "Campus Sint Lucas"], ["zuid", "Campus Zuid"]];

async function alles(tabel) {
  const rijen = [];
  let offset = "";
  do {
    const url = `https://api.airtable.com/v0/${BASE}/${tabel}?pageSize=100&returnFieldsByFieldId=true` + (offset ? `&offset=${encodeURIComponent(offset)}` : "");
    const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` } });
    if (!r.ok) throw new Error(`Airtable ${tabel}: ${r.status} ${await r.text()}`);
    const j = await r.json();
    rijen.push(...j.records);
    offset = j.offset || "";
  } while (offset);
  return rijen;
}

(async () => {
  if (!process.env.AIRTABLE_TOKEN) throw new Error("AIRTABLE_TOKEN ontbreekt");
  const [opl, les] = await Promise.all([alles(OPLEIDINGEN), alles(LESSEN)]);
  const idVan = {};
  const opleidingen = [];
  for (const r of opl) {
    const f = r.fields;
    if (!f[F.oplTitel] || !f[F.oplId]) continue;
    const id = String(f[F.oplId]).trim();
    let pad = "";
    try { pad = new URL(f[F.oplUrl]).pathname.replace(/\/+$/, ""); } catch (e) {}
    idVan[r.id] = id;
    opleidingen.push({ id, naam: f[F.oplTitel], pad });
  }
  opleidingen.sort((a, b) => a.naam.localeCompare(b.naam, "nl"));

  const nu = Date.now();
  const lessen = [];
  for (const r of les) {
    const f = r.fields;
    const ids = (f[F.opleiding] || []).map((x) => idVan[x]).filter(Boolean);
    const url = String(f[F.inschrijven] || "");
    if (f[F.status] !== "Gepland" || !f[F.inschrijfbaar] || !(f[F.vrij] > 0)) continue;
    if (!f[F.start] || !f[F.einde] || new Date(f[F.einde]).getTime() <= nu) continue;
    if (!ids.length || !f[F.vak] || !url.startsWith("https://")) continue;
    const locatie = String(f[F.locatie] || "").trim().replace(/^campus/, "Campus");
    const campus = (CAMPUSSEN.find(([k]) => locatie.toLowerCase().includes(k)) || [])[1] || "";
    lessen.push({ opl: ids, vak: f[F.vak], start: f[F.start], einde: f[F.einde], locatie, campus, url });
  }
  lessen.sort((a, b) => (a.start < b.start ? -1 : 1));

  const nieuw = { opleidingen, lessen };
  let oud = "";
  try { oud = JSON.stringify({ ...JSON.parse(fs.readFileSync("data.json", "utf8")), bijgewerkt: undefined }); } catch (e) {}
  if (oud === JSON.stringify(nieuw)) { console.log("Geen wijzigingen."); return; }
  fs.writeFileSync("data.json", JSON.stringify({ bijgewerkt: new Date().toISOString(), ...nieuw }, null, 1) + "\n");
  console.log(`data.json: ${lessen.length} lessen, ${opleidingen.length} opleidingen.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
