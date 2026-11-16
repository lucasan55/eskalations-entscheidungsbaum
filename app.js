/*
 * app.js – Oberfläche
 *
 * Baut die vier Ansichten auf (Start, Frage, Ergebnis, Einstellungen) und
 * reagiert auf Klicks. Fachliche Entscheidungen trifft diese Datei nicht:
 * Welche Frage als Nächstes kommt und welches Ergebnis gilt, bestimmt
 * ausschließlich naechsterSchritt() aus logik.js.
 */

const SPEICHER_SCHLUESSEL = "pa2-eskalation-einstellungen";

/* Zustand der App. */
const zustand = {
  ansicht: "start",
  antworten: {},        // { kriteriumId: { antwort, indikatoren: [Index, ...] } }
  entwurf: [],          // angekreuzte Indikatoren der aktuell angezeigten Frage
  klaerungEntwurf: [],  // Antworten auf die Klärungsfragen der aktuellen Klärung
  letzterDurchlauf: null, // { pfad, regel, ergebnisId } des zuletzt abgeschlossenen Durchlaufs
  mitUnklar: false,     // Diagramm: Triage-Prüfung anzeigen
  einstellungen: ladeEinstellungen()
};

const inhalt = document.getElementById("inhalt");

/* ---------- Einstellungen laden und speichern ---------- */

/*
 * Gespeicherte Einstellungen sind nur eine Bequemlichkeit. Ist der Speicher
 * nicht verfügbar (z. B. im privaten Modus), gelten die Standardwerte.
 */
function ladeEinstellungen() {
  const standard = Object.assign({}, MODELL.standardEinstellungen);
  try {
    const gespeichert = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL));
    if (gespeichert) {
      for (const schluessel in standard) {
        if (typeof gespeichert[schluessel] === "number") {
          standard[schluessel] = gespeichert[schluessel];
        }
      }
    }
  } catch (fehler) {
    // Standardwerte verwenden
  }
  return standard;
}

function speichereEinstellungen() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(zustand.einstellungen));
  } catch (fehler) {
    // Ohne Speicher gelten die Werte nur bis zum Neuladen der Seite.
  }
}

/* ---------- Hilfsfunktionen ---------- */

/* Schützt Texte vor der Interpretation als HTML. */
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Text aus dem Modell mit eingesetzten Einstellungswerten. */
function t(text) {
  return esc(setzeWerteEin(text, zustand.einstellungen));
}

function antwortText(antwort) {
  return { ja: "Ja", nein: "Nein", unklar: "Unklar" }[antwort];
}

/* ---------- Ansichten ---------- */

function zeige() {
  if (zustand.ansicht === "start") zeigeStart();
  else if (zustand.ansicht === "einstellungen") zeigeEinstellungen();
  else if (zustand.ansicht === "diagramm") zeigeDiagramm();
  else zeigeDurchlauf();
  window.scrollTo(0, 0);
}

function zeigeStart() {
  const ebenen = ["E1", "E2", "E3", "E4"].map(function (id) {
    const e = MODELL.ergebnisse[id];
    return '<li><span class="marker ' + e.farbe + '"></span><strong>' + esc(e.ebene) + ":</strong> " + esc(e.entscheider) + "</li>";
  }).join("");

  inhalt.innerHTML =
    '<section class="karte">' +
      "<h1>Wer entscheidet über diese Architekturentscheidung?</h1>" +
      "<p>Die App ordnet eine Architekturentscheidung eines agilen Teams genau einer Entscheidungsebene zu. " +
      "Dazu werden alle Kriterien in fester Reihenfolge abgefragt, vom schwerwiegendsten zum geringsten. " +
      "Zuständig ist die höchste Ebene, die ein Befund verlangt; die übrigen Befunde werden für den ADR festgehalten.</p>" +
      "<p>Abweichungen von Leitplanken und Risiken werden abgestuft: Geringe Fälle entscheidet die CoPA, wesentliche das EARB.</p>" +
      "<p>Genutzt wird die App vom Architektur-Ansprechpartner des Teams im Product Backlog Refinement.</p>" +
      '<ul class="ebenenliste">' + ebenen + "</ul>" +
      '<p class="hinweis">Ist eine Frage nicht eindeutig zu beantworten, führt „Unklar“ zu Klärungsfragen, die das Team selbst beantworten kann. ' +
      "Nur wenn auch danach Wesentliches offen bleibt, ordnet der Enterprise-Architekt die Entscheidung zu (Triage).</p>" +
      '<button type="button" class="primaer" data-aktion="beginnen">Durchlauf starten</button>' +
    "</section>";
}

function zeigeDurchlauf() {
  const schritt = naechsterSchritt(MODELL, zustand.antworten);
  if (schritt.typ === "frage") zeigeFrage(schritt);
  else if (schritt.typ === "klaerung") zeigeKlaerung(schritt);
  else zeigeErgebnis(schritt);
}

/* Fortschrittsanzeige über alle Kriterien; übersprungene bleiben unmarkiert. */
function fortschritt(aktuelleId, pfad) {
  const haupt = MODELL.reihenfolge;
  return '<ol class="fortschritt">' + haupt.map(function (id) {
    const k = MODELL.kriterien[id];
    let klasse = "";
    if (pfad.indexOf(id) >= 0) klasse = "erledigt";
    if (id === aktuelleId) klasse = "aktuell";
    return '<li class="' + klasse + '">' + esc(k.nummer) + " " + esc(k.titel) + "</li>";
  }).join("") + "</ol>";
}

function zeigeFrage(schritt) {
  const k = MODELL.kriterien[schritt.kriteriumId];
  const angekreuzt = zustand.entwurf;
  const vorschlag = vorschlagAusIndikatoren(angekreuzt);

  const indikatoren = k.indikatoren.map(function (text, index) {
    const an = angekreuzt.indexOf(index) >= 0 ? " checked" : "";
    return '<label class="indikator"><input type="checkbox" data-indikator="' + index + '"' + an + "> <span>" + t(text) + "</span></label>";
  }).join("");

  // Trifft ein Indikator zu, lautet die Antwort „Ja“; „Nein“ wäre dann ein
  // Widerspruch zum Modell und ist deshalb gesperrt.
  const neinGesperrt = vorschlag === ANTWORT.JA;

  inhalt.innerHTML =
    fortschritt(schritt.kriteriumId, schritt.pfad) +
    '<section class="karte">' +
      '<p class="kriterium">Kriterium ' + esc(k.nummer) + ": " + esc(k.titel) + "</p>" +
      "<h1>" + t(k.frage) + "</h1>" +
      '<fieldset class="indikatoren"><legend>Trifft einer dieser Punkte zu?</legend>' + indikatoren + "</fieldset>" +
      '<p class="beispiel"><strong>Beispiel:</strong> ' + t(k.beispiel) + "</p>" +
      '<div class="antworten">' +
        '<button type="button" class="antwort ja' + (vorschlag === ANTWORT.JA ? " vorgeschlagen" : "") + '" data-antwort="ja">Ja</button>' +
        '<button type="button" class="antwort nein" data-antwort="nein"' + (neinGesperrt ? " disabled" : "") + ">Nein</button>" +
        '<button type="button" class="antwort unklar" data-antwort="unklar">Unklar</button>' +
      "</div>" +
      (neinGesperrt ? '<p class="hinweis">Mindestens ein Punkt trifft zu, deshalb lautet die Antwort „Ja“.</p>' : "") +
      '<div class="navigation">' +
        (schritt.pfad.length > 0 ? '<button type="button" class="link" data-aktion="zurueck">Eine Frage zurück</button>' : "") +
        '<button type="button" class="link" data-aktion="neu">Neu starten</button>' +
      "</div>" +
    "</section>";
}

/* Bezeichnungen der Antworten auf Klärungsfragen. */
const KLAERUNG_TEXT = { ja: "Ja", nein: "Nein", weissnicht: "Weiß nicht" };

/* Bezeichnungen des Zustands eines Indikators nach der Klärung. */
const INDIKATOR_TEXT = { trifftzu: "trifft zu", trifftnichtzu: "trifft nicht zu", offen: "noch offen" };

/*
 * Klärungsschritt nach „Unklar“: Zu jedem Indikator werden zwei
 * Tatsachenfragen gestellt, jeweils mit Hinweis, wo das Team nachsehen kann.
 * Die Auswertung übernehmen indikatorStatus() und wirksameAntwort() aus logik.js.
 */
function zeigeKlaerung(schritt) {
  const k = MODELL.kriterien[schritt.kriteriumId];
  const entwurf = zustand.klaerungEntwurf;
  const status = indikatorStatus(k, entwurf);
  let position = 0;

  const gruppen = k.klaerung.gruppen.map(function (g, gi) {
    const fragen = g.fragen.map(function (f, fi) {
      const i = position++;
      const knoepfe = [KLAERUNG.JA, KLAERUNG.NEIN, KLAERUNG.WEISS_NICHT].map(function (wert) {
        const an = entwurf[i] === wert ? " gewaehlt" : "";
        return '<button type="button" class="klein' + an + '" data-klaerung="' + i + '" data-wert="' + wert + '">' + KLAERUNG_TEXT[wert] + "</button>";
      }).join("");
      return '<div class="klaerungsfrage"><p class="klaerungstext">' + esc(k.nummer) + "." + (gi + 1) + "abc"[fi] + " " + t(f.text) + "</p>" +
        '<p class="nachsehen">Nachsehen in: ' + t(f.hinweis) + "</p>" +
        '<div class="knoepfe">' + knoepfe + "</div></div>";
    }).join("");
    const regel = g.verknuepfung === "UND"
      ? "Trifft zu, wenn beide Fragen mit „Ja“ beantwortet werden."
      : "Trifft zu, wenn mindestens eine Frage mit „Ja“ beantwortet wird.";
    return '<div class="klaerungsgruppe">' +
      '<div class="gruppenkopf"><p class="gruppentitel">Indikator ' + esc(k.nummer) + "." + (gi + 1) + ": " + t(k.indikatoren[gi]) + "</p>" +
      '<span class="status ' + status[gi] + '">' + INDIKATOR_TEXT[status[gi]] + "</span></div>" +
      '<p class="nachsehen">' + regel + "</p>" + fragen + "</div>";
  }).join("");

  // Vorschau, wie die Klärung ausgewertet würde, sobald alles beantwortet ist.
  const anzahl = klaerungsFragen(k).length;
  const vollstaendig = entwurf.filter(Boolean).length === anzahl;
  let vorschau = "";
  if (vollstaendig) {
    const ergebnis = wirksameAntwort(k, { antwort: ANTWORT.UNKLAR, klaerung: entwurf });
    const imZweifel = ergebnis === ANTWORT.JA && status.indexOf(INDIKATOR.TRIFFT_ZU) < 0;
    if (ergebnis === "triage") vorschau = "Mindestens ein Indikator bleibt offen. Der Enterprise-Architekt ordnet die Entscheidung zu (Triage).";
    else if (imZweifel) vorschau = "Mindestens ein Indikator bleibt offen. Nach dem Vorsichtsprinzip gilt das Kriterium als „Ja“.";
    else vorschau = "Das Kriterium gilt als „" + antwortText(ergebnis) + "“.";
  }

  inhalt.innerHTML =
    fortschritt(schritt.kriteriumId, schritt.pfad) +
    '<section class="karte">' +
      '<p class="kriterium">Klärung zu Kriterium ' + esc(k.nummer) + ": " + esc(k.titel) + "</p>" +
      "<h1>" + t(k.frage) + "</h1>" +
      "<p>Zu jedem Punkt der Hauptfrage folgen zwei Tatsachenfragen (" + anzahl + " insgesamt). " +
      "Trifft ein Punkt zu, gilt das Kriterium als „Ja“. Trifft keiner zu, gilt es als „Nein“.</p>" +
      gruppen +
      (vorschau ? '<p class="vorschau">' + esc(vorschau) + "</p>" : "") +
      '<div class="navigation">' +
        '<button type="button" class="link" data-aktion="zurueck">Zurück zur Frage</button>' +
        '<button type="button" class="primaer" data-aktion="klaerungAuswerten"' + (vollstaendig ? "" : " disabled") + ">Weiter</button>" +
      "</div>" +
    "</section>";
}

/* Antwort eines Kriteriums für Begründung und Antwortpfad als Text. */
function antwortMitKlaerung(id) {
  const a = zustand.antworten[id];
  if (a.antwort !== ANTWORT.UNKLAR) return antwortText(a.antwort);
  const k = MODELL.kriterien[id];
  const w = wirksameAntwort(k, a);
  if (w === "triage") return "Unklar → nach Klärung: weiterhin unklar";
  // „Ja“ ohne zutreffenden Indikator stammt aus dem Vorsichtsprinzip.
  const imZweifel = w === ANTWORT.JA && indikatorStatus(k, a.klaerung).indexOf(INDIKATOR.TRIFFT_ZU) < 0;
  return "Unklar → nach Klärung: " + antwortText(w) + (imZweifel ? " (im Zweifel)" : "");
}

/* Klärungsergebnis je Indikator als Liste (für Begründung und Antwortpfad). */
function klaerungAlsListe(k, antworten, nurFilter) {
  const fragen = klaerungsFragen(k);
  const status = indikatorStatus(k, antworten);
  return "<ul>" + k.klaerung.gruppen.map(function (g, gi) {
    if (nurFilter && status[gi] !== nurFilter) return "";
    const unter = fragen.map(function (f, i) {
      return f.gruppe === gi ? "<li>" + t(f.text) + " <strong>" + KLAERUNG_TEXT[antworten[i]] + "</strong></li>" : "";
    }).join("");
    return "<li>" + t(k.indikatoren[gi]) + " <em>(" + INDIKATOR_TEXT[status[gi]] + ")</em><ul>" + unter + "</ul></li>";
  }).join("") + "</ul>";
}

/* Bezeichnungen der Befunde (siehe ermittleBefunde in logik.js). */
const BEFUND_TEXT = { wesentlich: "trifft zu", gering: "trifft zu (gering)", nein: "trifft nicht zu", triage: "unklar" };

/* Zutreffende Punkte eines Kriteriums als Listeneinträge, mit Herkunft. */
function zutreffendePunkte(id) {
  const k = MODELL.kriterien[id];
  const a = zustand.antworten[id];
  return zutreffendeIndikatoren(k, a).map(function (i) {
    const ausKlaerung = a.indikatoren.indexOf(i) < 0;
    return "<li>" + t(k.indikatoren[i]) + (ausKlaerung ? " (laut Klärung)" : "") + "</li>";
  }).join("");
}

/* Ein Kriterium mit seinem Befund als Satz, inkl. Hinweis der Abstufung. */
function befundSatz(id, befund) {
  const k = MODELL.kriterien[id];
  let satz = "Kriterium " + esc(k.nummer) + " (" + esc(k.titel) + "): " + BEFUND_TEXT[befund] + ".";
  const ab = k.abstufung;
  if (ab && befund === "gering") satz += " " + t(ab.hinweisGering);
  if (ab && befund === "wesentlich" && ab.hinweisWesentlich) satz += " " + t(ab.hinweisWesentlich);
  const punkte = zustand.antworten[id] ? zutreffendePunkte(id) : "";
  return "<li>" + satz + (punkte ? "<ul>" + punkte + "</ul>" : "") + "</li>";
}

function zeigeErgebnis(schritt) {
  const e = MODELL.ergebnisse[schritt.ergebnisId];
  const befunde = schritt.befunde;

  // Begründung: welche Befunde haben die Ebene bestimmt?
  let begruendung;
  if (schritt.ergebnisId === "TRIAGE") {
    const id = schritt.ausloeser[0];
    const k = MODELL.kriterien[id];
    const a = zustand.antworten[id];
    begruendung = "<p>Bei Kriterium " + esc(k.nummer) + " (" + esc(k.titel) + ") ist die Antwort auch nach den Klärungsfragen unklar. " +
      "Würde es zutreffen, wäre eine höhere Ebene zuständig als nach den übrigen Antworten. Deshalb ordnet der Enterprise-Architekt zu.</p>";
    if (a.klaerung) {
      begruendung += "<p>Offen geblieben, für die Triage mitbringen:</p>" + klaerungAlsListe(k, a.klaerung, INDIKATOR.OFFEN);
    }
  } else if (schritt.ergebnisId === "E1") {
    begruendung = "<p>Keines der Kriterien trifft zu: Die Entscheidung liegt innerhalb der Leitplanken, betrifft nur das eigene Team und ist umkehrbar.</p>";
  } else {
    const regel = MODELL.zuordnung[schritt.regel];
    begruendung = "<p>Angewandte Regel: " + esc(regel.frage) + " Ja.</p><p>Ausschlaggebend:</p><ul>" +
      schritt.ausloeser.map(function (id) {
        if (schritt.angenommen && schritt.angenommen.indexOf(id) >= 0) {
          const k = MODELL.kriterien[id];
          return "<li>Kriterium " + esc(k.nummer) + " (" + esc(k.titel) + "): unklar, im ungünstigsten Fall " + BEFUND_TEXT[schlimmsterBefund(MODELL, id, befunde)] + ".</li>";
        }
        return befundSatz(id, befunde[id]);
      }).join("") + "</ul>";
    if (schritt.angenommen && schritt.angenommen.length) {
      begruendung += "<p>Unklar gebliebene Kriterien wurden im ungünstigsten Fall als zutreffend angenommen. Auch dann ist höchstens diese Ebene zuständig, " +
        "deshalb ist keine Triage durch den Enterprise-Architekten nötig. Die zuständige Ebene klärt die offenen Punkte mit:</p>" +
        schritt.angenommen.map(function (id) {
          const k = MODELL.kriterien[id];
          const a = zustand.antworten[id];
          return "<p>Kriterium " + esc(k.nummer) + " (" + esc(k.titel) + ")</p>" + (a.klaerung ? klaerungAlsListe(k, a.klaerung, INDIKATOR.OFFEN) : "");
        }).join("");
    }
    if (schritt.ergebnisId === "E3" && befunde.befugnis === ANTWORT.NEIN) {
      begruendung += "<p>Die Entscheidung liegt innerhalb der Befugnisse des EARB (Kriterium 3a).</p>";
    }
  }

  // Weitere Befunde: zutreffende oder unklare Kriterien, die die Ebene nicht
  // bestimmt haben. Sie gehören ins ADR, damit die zuständige Ebene sie kennt.
  const weitere = schritt.pfad.filter(function (id) {
    return schritt.ausloeser.indexOf(id) < 0 && befunde[id] !== ANTWORT.NEIN;
  });
  const weitereHtml = weitere.length
    ? "<h2>Weitere Befunde für den ADR</h2><p>Diese Punkte bestimmen die Ebene nicht, die zuständige Ebene soll sie aber kennen" +
      (schritt.offen.length ? " und die unklaren mitprüfen" : "") + ":</p><ul>" +
      weitere.map(function (id) { return befundSatz(id, befunde[id]); }).join("") + "</ul>"
    : "";

  const pfadZeilen = schritt.pfad.map(function (id) {
    const k = MODELL.kriterien[id];
    const a = zustand.antworten[id];
    let punkte = a.indikatoren.length
      ? "<ul>" + a.indikatoren.map(function (i) { return "<li>" + t(k.indikatoren[i]) + "</li>"; }).join("") + "</ul>"
      : '<span class="leise">kein Punkt angekreuzt</span>';
    if (a.klaerung) {
      punkte += '<p class="leise">Klärung:</p>' + klaerungAlsListe(k, a.klaerung);
    }
    const wirksam = schritt.wirksam[id];
    const befund = befunde[id] === "gering" ? ' <span class="leise">(gering)</span>' : "";
    return "<tr><td>" + esc(k.nummer) + " " + esc(k.titel) + "</td><td>" + t(k.frage) + "</td>" +
      '<td class="antwortzelle ' + (wirksam === "triage" ? "unklar" : wirksam) + '">' + antwortMitKlaerung(id) + befund + "</td><td>" + punkte + "</td></tr>";
  }).join("");
  const uebersprungen = schritt.uebersprungen.map(function (id) {
    const k = MODELL.kriterien[id];
    return "<tr><td>" + esc(k.nummer) + " " + esc(k.titel) + "</td><td>" + t(k.frage) + '</td><td class="leise">nicht gefragt</td>' +
      '<td class="leise">Nur nötig, wenn Kriterium 1, 2 oder 3 zutrifft oder unklar ist.</td></tr>';
  }).join("");

  const schritte = e.schritte.map(function (s) { return "<li>" + t(s) + "</li>"; }).join("");

  // Für die Diagrammansicht merken, welcher Weg zuletzt gegangen wurde.
  zustand.letzterDurchlauf = {
    pfad: schritt.pfad.slice(),
    regel: schritt.regel,
    ergebnisId: schritt.ergebnisId
  };

  inhalt.innerHTML =
    '<section class="karte ergebnis ' + e.farbe + '">' +
      '<p class="kriterium">' + esc(e.ebene) + "</p>" +
      "<h1>" + esc(e.titel) + "</h1>" +
      '<p class="entscheider">' + esc(e.entscheider) + "</p>" +
    "</section>" +
    '<section class="karte">' +
      "<h2>Begründung</h2>" + begruendung +
      weitereHtml +
      '<div class="raster">' +
        "<div><h2>Frist</h2><p>" + t(e.frist) + "</p></div>" +
        "<div><h2>Eskalation</h2><p>" + t(e.eskalation) + "</p></div>" +
      "</div>" +
      "<h2>Nächste Schritte</h2><ol>" + schritte + "</ol>" +
    "</section>" +
    '<section class="karte">' +
      "<h2>Antwortpfad</h2>" +
      '<div class="tabelle-rahmen"><table><thead><tr><th>Kriterium</th><th>Frage</th><th>Antwort</th><th>Angekreuzte Punkte</th></tr></thead>' +
      "<tbody>" + pfadZeilen + uebersprungen + "</tbody></table></div>" +
      '<div class="navigation">' +
        '<button type="button" class="link" data-aktion="zurueck">Eine Frage zurück</button>' +
        '<span class="gruppe"><button type="button" class="link" data-aktion="diagramm">Weg im Diagramm anzeigen</button>' +
        '<button type="button" class="primaer" data-aktion="neu">Neu starten</button></span>' +
      "</div>" +
    "</section>";
}

function zeigeEinstellungen(meldung) {
  const felder = MODELL.einstellungenBeschreibung.map(function (f) {
    return '<label class="feld"><span>' + esc(f.bezeichnung) + "</span>" +
      '<span class="eingabe"><input type="number" min="1" step="any" data-einstellung="' + f.schluessel + '" value="' + zustand.einstellungen[f.schluessel] + '"> ' +
      esc(f.einheit) + "</span></label>";
  }).join("");

  const hinweise = pruefeEinstellungen(zustand.einstellungen)
    .map(function (h) { return '<p class="warnung">' + esc(h) + "</p>"; }).join("");

  inhalt.innerHTML =
    '<section class="karte">' +
      "<h1>Einstellungen</h1>" +
      "<p>Die Schwellenwerte und Fristen sind organisationsspezifisch und werden im Modell nicht fest vorgegeben. " +
      "Die voreingestellten Werte sind Platzhalter.</p>" +
      '<form id="einstellungen">' + felder + "</form>" +
      hinweise +
      (meldung ? '<p class="erfolg">' + esc(meldung) + "</p>" : "") +
      '<div class="navigation">' +
        '<button type="button" class="link" data-aktion="zuruecksetzen">Standardwerte wiederherstellen</button>' +
        '<button type="button" class="primaer" data-aktion="speichern">Speichern</button>' +
      "</div>" +
    "</section>";
}

/*
 * Diagrammansicht (Phase 2): Das Ablaufdiagramm wird mit erzeugeDiagramm()
 * aus dem Modell erzeugt und von Mermaid gezeichnet. Nach einem Durchlauf ist
 * der gegangene Weg hervorgehoben.
 */
let diagrammZaehler = 0;

function zeigeDiagramm() {
  const d = zustand.letzterDurchlauf;
  inhalt.innerHTML =
    '<section class="karte">' +
      "<h1>Ablaufdiagramm</h1>" +
      "<p>" + (d
        ? "Hervorgehoben ist der Weg des letzten Durchlaufs (Ergebnis: " + esc(MODELL.ergebnisse[d.ergebnisId].ebene) + ")."
        : "Oben stehen die Kriterien in Prüfreihenfolge; alle werden gefragt. Darunter bestimmt die Zuordnungsregel die Ebene: Die erste zutreffende Regel gilt.") + "</p>" +
      '<div class="werkzeuge">' +
        '<label class="schalter"><input type="checkbox" data-schalter="unklar"' + (zustand.mitUnklar ? " checked" : "") + "> Triage-Prüfung anzeigen</label>" +
        '<span class="gruppe">' +
          (d ? '<button type="button" class="link" data-aktion="pfadLoeschen">Hervorhebung entfernen</button>' : "") +
          '<button type="button" class="link" data-aktion="svg">Als SVG speichern</button>' +
          '<button type="button" class="link" data-aktion="png">Als PNG speichern</button>' +
        "</span>" +
      "</div>" +
      '<div id="diagramm" class="diagramm"><p class="hinweis">Diagramm wird gezeichnet …</p></div>' +
      '<p class="hinweis">Gering heißt: Eine Abweichung von einer Leitplanke betrifft nur das eigene Team und ist leicht umkehrbar; ein Risiko betrifft weder ein System mit hohem Schutzbedarf noch regulatorische Vorgaben. ' +
      "Bleibt eine Frage auch nach den Klärungsfragen offen, wird bei Reichweite und Umkehrbarkeit vorsichtshalber „Ja“ angenommen. Bei den übrigen Kriterien folgt die Triage, " +
      "aber nur, wenn die offene Frage im ungünstigsten Fall das EARB oder eine höhere Ebene verlangen würde. Sonst entscheidet die Ebene, die der ungünstigste Fall verlangt, und klärt die Frage mit.</p>" +
    "</section>";

  const quelltext = erzeugeDiagramm(MODELL, zustand.einstellungen, { durchlauf: d, mitUnklar: zustand.mitUnklar });
  const ziel = document.getElementById("diagramm");

  if (typeof mermaid === "undefined") {
    ziel.innerHTML = '<p class="warnung">Die Bibliothek Mermaid wurde nicht gefunden (vendor/mermaid.min.js).</p>';
    return;
  }
  diagrammZaehler++;
  mermaid.render("baum" + diagrammZaehler, quelltext).then(function (ergebnis) {
    ziel.innerHTML = ergebnis.svg;
  }).catch(function (fehler) {
    ziel.innerHTML = '<p class="warnung">Das Diagramm konnte nicht gezeichnet werden: ' + esc(fehler.message || fehler) + "</p>";
  });
}

/* Löst einen Download im Browser aus. */
function herunterladen(dateiname, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function diagrammAlsSvgText() {
  const svg = document.querySelector("#diagramm svg");
  if (!svg) return null;
  const kopie = svg.cloneNode(true);
  kopie.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(kopie);
}

function speichereSvg() {
  const text = diagrammAlsSvgText();
  if (text) herunterladen("entscheidungsbaum.svg", new Blob([text], { type: "image/svg+xml" }));
}

/* PNG in doppelter Auflösung, damit das Bild in der Arbeit scharf bleibt. */
function speicherePng() {
  const svg = document.querySelector("#diagramm svg");
  const text = diagrammAlsSvgText();
  if (!svg || !text) return;
  const box = svg.viewBox.baseVal;
  const faktor = 2;
  const bild = new Image();
  bild.onload = function () {
    const leinwand = document.createElement("canvas");
    leinwand.width = box.width * faktor;
    leinwand.height = box.height * faktor;
    const ctx = leinwand.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, leinwand.width, leinwand.height);
    ctx.drawImage(bild, 0, 0, leinwand.width, leinwand.height);
    leinwand.toBlob(function (blob) { herunterladen("entscheidungsbaum.png", blob); }, "image/png");
  };
  bild.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
}

/* ---------- Aktionen ---------- */

function beantworte(antwort) {
  const schritt = naechsterSchritt(MODELL, zustand.antworten);
  zustand.antworten[schritt.kriteriumId] = { antwort: antwort, indikatoren: zustand.entwurf.slice() };
  zustand.entwurf = [];
  zustand.klaerungEntwurf = [];
  zeige();
}

/* Übernimmt die Antworten auf die Klärungsfragen in den Durchlauf. */
function klaerungAuswerten() {
  const schritt = naechsterSchritt(MODELL, zustand.antworten);
  if (schritt.typ !== "klaerung") return;
  zustand.antworten[schritt.kriteriumId].klaerung = zustand.klaerungEntwurf.slice();
  zustand.klaerungEntwurf = [];
  zeige();
}

/* Entfernt die letzte Antwort; ihre angekreuzten Punkte bleiben zur Korrektur erhalten. */
function zurueck() {
  const schritt = naechsterSchritt(MODELL, zustand.antworten);
  // Im Klärungsschritt geht es zurück zur Frage, zu der „Unklar“ gewählt wurde.
  const letzte = schritt.typ === "klaerung" ? schritt.kriteriumId : schritt.pfad[schritt.pfad.length - 1];
  if (!letzte) return;
  const eintrag = zustand.antworten[letzte];
  // Wurde die Frage über Klärungsfragen entschieden, geht es zuerst zur Klärung zurück.
  if (schritt.typ !== "klaerung" && eintrag.klaerung) {
    zustand.klaerungEntwurf = eintrag.klaerung.slice();
    delete eintrag.klaerung;
    return zeige();
  }
  zustand.entwurf = eintrag.indikatoren.slice();
  zustand.klaerungEntwurf = [];
  delete zustand.antworten[letzte];
  zeige();
}

function neuStarten() {
  zustand.antworten = {};
  zustand.entwurf = [];
  zustand.klaerungEntwurf = [];
  zustand.ansicht = "frage";
  zeige();
}

function speichern() {
  const neu = Object.assign({}, zustand.einstellungen);
  inhalt.querySelectorAll("[data-einstellung]").forEach(function (feld) {
    neu[feld.dataset.einstellung] = parseFloat(feld.value);
  });
  const hinweise = pruefeEinstellungen(neu);
  if (hinweise.some(function (h) { return h.indexOf("positive") >= 0; })) {
    zeigeEinstellungen();
    inhalt.querySelector(".karte").insertAdjacentHTML("beforeend", '<p class="warnung">Nicht gespeichert: Alle Werte müssen positive Zahlen sein.</p>');
    return;
  }
  zustand.einstellungen = neu;
  speichereEinstellungen();
  zeigeEinstellungen("Gespeichert.");
}

function zuruecksetzen() {
  zustand.einstellungen = Object.assign({}, MODELL.standardEinstellungen);
  speichereEinstellungen();
  zeigeEinstellungen("Standardwerte wiederhergestellt.");
}

/* Ein zentraler Klick-Handler für alle Schaltflächen. */
document.addEventListener("click", function (ereignis) {
  const ziel = ereignis.target.closest("[data-aktion], [data-antwort], [data-klaerung]");
  if (!ziel) return;
  ereignis.preventDefault();

  if (ziel.dataset.antwort) return beantworte(ziel.dataset.antwort);
  if (ziel.dataset.klaerung !== undefined) {
    zustand.klaerungEntwurf[Number(ziel.dataset.klaerung)] = ziel.dataset.wert;
    return zeigeDurchlauf();
  }

  switch (ziel.dataset.aktion) {
    case "start": zustand.ansicht = "start"; return zeige();
    case "einstellungen": zustand.ansicht = "einstellungen"; return zeige();
    case "diagramm": zustand.ansicht = "diagramm"; return zeige();
    case "pfadLoeschen": zustand.letzterDurchlauf = null; return zeige();
    case "svg": return speichereSvg();
    case "png": return speicherePng();
    case "beginnen":
    case "neu": return neuStarten();
    case "zurueck": return zurueck();
    case "klaerungAuswerten": return klaerungAuswerten();
    case "speichern": return speichern();
    case "zuruecksetzen": return zuruecksetzen();
  }
});

/* Checkboxen der Indikatoren: Auswahl merken und Ansicht aktualisieren. */
document.addEventListener("change", function (ereignis) {
  const box = ereignis.target;
  if (box.dataset && box.dataset.schalter === "unklar") {
    zustand.mitUnklar = box.checked;
    return zeigeDiagramm();
  }
  if (!box.dataset || box.dataset.indikator === undefined) return;
  const index = Number(box.dataset.indikator);
  if (box.checked) zustand.entwurf.push(index);
  else zustand.entwurf = zustand.entwurf.filter(function (i) { return i !== index; });
  zustand.entwurf.sort();
  zeigeDurchlauf();
});

/*
 * Mermaid zeichnet Beschriftungen als reinen SVG-Text (htmlLabels: false),
 * damit sich das Diagramm auch als PNG speichern lässt.
 */
if (typeof mermaid !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: { fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "15px", lineColor: "#5b6576", edgeLabelBackground: "#ffffff" },
    flowchart: { htmlLabels: false, curve: "basis", nodeSpacing: 40, rankSpacing: 50 }
  });
}

zeige();
