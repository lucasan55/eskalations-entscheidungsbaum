/*
 * logik.js – Entscheidungslogik
 *
 * Reine Funktionen ohne Zugriff auf die Oberfläche (DOM). Sie werten die
 * Antworten eines Teams anhand der Daten aus modell.js aus.
 *
 * Die Logik selbst kennt keine einzelnen Kriterien: Sie fragt die Kriterien
 * in der Reihenfolge aus modell.js ab und wendet danach die Zuordnungsregel
 * aus modell.js an (Kap. 5.4). Der Ablauf entspricht damit dem Modell der Arbeit.
 */

/* Mögliche Antworten auf eine Frage. */
const ANTWORT = { JA: "ja", NEIN: "nein", UNKLAR: "unklar" };

/* Mögliche Antworten auf eine Klärungsfrage. */
const KLAERUNG = { JA: "ja", NEIN: "nein", WEISS_NICHT: "weissnicht" };

/* Zustand eines Indikators nach der Klärung. */
const INDIKATOR = { TRIFFT_ZU: "trifftzu", TRIFFT_NICHT_ZU: "trifftnichtzu", OFFEN: "offen" };

/*
 * Alle Klärungsfragen eines Kriteriums als flache Liste in Anzeigereihenfolge.
 * Die Antworten werden in derselben Reihenfolge gespeichert.
 * Jeder Eintrag: { gruppe (Index des Indikators), text, hinweis }
 */
function klaerungsFragen(kriterium) {
  const liste = [];
  kriterium.klaerung.gruppen.forEach(function (g, gruppe) {
    g.fragen.forEach(function (f) {
      liste.push({ gruppe: gruppe, text: f.text, hinweis: f.hinweis });
    });
  });
  return liste;
}

/*
 * Wertet die Klärungsfragen je Indikator aus (Regeln siehe modell.js).
 * antworten: flache Liste ["ja" | "nein" | "weissnicht", ...]
 * Rückgabe: je Indikator INDIKATOR.TRIFFT_ZU, TRIFFT_NICHT_ZU oder OFFEN
 */
function indikatorStatus(kriterium, antworten) {
  let position = 0;
  return kriterium.klaerung.gruppen.map(function (g) {
    const teil = antworten.slice(position, position + g.fragen.length);
    position += g.fragen.length;
    const ja = teil.filter(function (a) { return a === KLAERUNG.JA; }).length;
    const nein = teil.filter(function (a) { return a === KLAERUNG.NEIN; }).length;
    if (g.verknuepfung === "UND") {
      if (nein > 0) return INDIKATOR.TRIFFT_NICHT_ZU;
      if (ja === teil.length) return INDIKATOR.TRIFFT_ZU;
      return INDIKATOR.OFFEN;
    }
    // ODER
    if (ja > 0) return INDIKATOR.TRIFFT_ZU;
    if (nein === teil.length) return INDIKATOR.TRIFFT_NICHT_ZU;
    return INDIKATOR.OFFEN;
  });
}

/*
 * Bestimmt die wirksame Antwort eines Kriteriums.
 *
 * Bei „Ja“ und „Nein“ ist das die Antwort selbst. Bei „Unklar“ werden die
 * Klärungsfragen je Indikator ausgewertet:
 *   "ja" oder "nein"  das Kriterium ist geklärt
 *   "triage"          auch nach der Klärung unklar, der EA ordnet zu
 *   null              die Klärungsfragen sind noch nicht beantwortet
 */
function wirksameAntwort(kriterium, eintrag) {
  if (eintrag.antwort !== ANTWORT.UNKLAR) return eintrag.antwort;

  // Ohne Klärungsfragen im Modell bleibt es bei der Triage.
  if (!kriterium.klaerung) return "triage";

  const k = eintrag.klaerung;
  const anzahl = klaerungsFragen(kriterium).length;
  if (!k || k.filter(Boolean).length < anzahl) return null;

  const status = indikatorStatus(kriterium, k);
  if (status.indexOf(INDIKATOR.TRIFFT_ZU) >= 0) return ANTWORT.JA;
  if (status.every(function (x) { return x === INDIKATOR.TRIFFT_NICHT_ZU; })) return ANTWORT.NEIN;
  return kriterium.klaerung.beiRestunklarheit === "ja" ? ANTWORT.JA : "triage";
}

/*
 * Indizes der zutreffenden Indikatoren eines Kriteriums: angekreuzt oder
 * laut Klärung zutreffend.
 */
function zutreffendeIndikatoren(kriterium, eintrag) {
  const liste = eintrag.indikatoren.slice();
  if (eintrag.klaerung && kriterium.klaerung) {
    indikatorStatus(kriterium, eintrag.klaerung).forEach(function (s, i) {
      if (s === INDIKATOR.TRIFFT_ZU && liste.indexOf(i) < 0) liste.push(i);
    });
  }
  return liste.sort();
}

/*
 * Befunde aller gefragten Kriterien (Werte siehe modell.js, zuordnung):
 * "wesentlich", "gering", "nein" oder "triage". Ein „Ja“ ist wesentlich,
 * außer die Abstufung des Kriteriums stuft es als gering ein.
 */
function ermittleBefunde(modell, antworten, wirksam) {
  const befunde = {};
  // Zuerst alle Kriterien ohne Abstufung nach Kontext, weil diese als
  // Kontext für die anderen dienen.
  const ids = Object.keys(wirksam);
  ids.forEach(function (id) {
    const w = wirksam[id];
    if (w !== ANTWORT.JA) { befunde[id] = w; return; }
    const ab = modell.kriterien[id].abstufung;
    if (!ab || ab.art === "kontext") { befunde[id] = "wesentlich"; return; }
    // art "indikatoren": wesentlich, wenn ein wesentlicher Indikator zutrifft
    // oder „Ja“ ohne Indikator gewählt wurde (das Team sieht ein Risiko,
    // das die Indikatoren nicht erfassen).
    const z = zutreffendeIndikatoren(modell.kriterien[id], antworten[id]);
    const wesentlich = z.length === 0 || z.some(function (i) { return ab.wesentlich.indexOf(i) >= 0; });
    befunde[id] = wesentlich ? "wesentlich" : "gering";
  });
  ids.forEach(function (id) {
    const ab = modell.kriterien[id].abstufung;
    if (wirksam[id] !== ANTWORT.JA || !ab || ab.art !== "kontext") return;
    const gering = ab.geringWennNein.every(function (k) { return befunde[k] === ANTWORT.NEIN; });
    befunde[id] = gering ? "gering" : "wesentlich";
  });
  return befunde;
}

/*
 * Ungünstigster Befund eines unklaren Kriteriums: wesentlich, außer die
 * Abstufung nach Kontext stuft es auch im Fall „Ja“ als gering ein.
 */
function schlimmsterBefund(modell, id, befunde) {
  const ab = modell.kriterien[id].abstufung;
  if (ab && ab.art === "kontext" && ab.geringWennNein.every(function (k) { return befunde[k] === ANTWORT.NEIN; })) {
    return "gering";
  }
  return "wesentlich";
}

/* Passt ein Befund zu einer Bedingung der Zuordnungsregel? */
function befundPasst(befund, verlangt) {
  if (verlangt === "ja") return befund === "wesentlich" || befund === "gering";
  return befund === verlangt;
}

/*
 * Index der ersten zutreffenden Regel in modell.zuordnung. Eine Regel trifft
 * zu, wenn jede ihrer Bedingungen von mindestens einem Kriterium erfüllt wird.
 */
function zuordnen(modell, befunde) {
  return modell.zuordnung.findIndex(function (regel) {
    return regel.wenn.every(function (b) {
      return b.einesVon.some(function (id) { return befundPasst(befunde[id], b.befund); });
    });
  });
}

/* Ist die Bedingung nurWenn eines Kriteriums erfüllt? */
function wirdGefragt(kriterium, wirksam) {
  const n = kriterium.nurWenn;
  if (!n) return true;
  return n.einesVon.some(function (id) { return n.antwort.indexOf(wirksam[id]) >= 0; });
}

/*
 * Bestimmt aus den bisherigen Antworten den nächsten Schritt.
 *
 * modell:    das Objekt MODELL aus modell.js
 * antworten: Objekt { kriteriumId: { antwort, indikatoren: [Index, ...],
 *                                     klaerung: ["ja" | "nein" | "weissnicht", ...] } }
 *
 * Alle Kriterien werden in der Reihenfolge aus modell.reihenfolge gefragt
 * (Kriterien mit nurWenn nur, wenn die Bedingung erfüllt ist). Erst danach
 * bestimmt die Zuordnungsregel die zuständige Ebene.
 *
 * Rückgabe:
 *   { typ: "frage", kriteriumId, pfad }       nächste offene Frage
 *   { typ: "klaerung", kriteriumId, pfad }    Klärungsfragen nach „Unklar“
 *   { typ: "ergebnis", ergebnisId, regel, ausloeser, offen, befunde,
 *     pfad, wirksam, uebersprungen }          Ende des Durchlaufs
 *
 * pfad:          gefragte Kriterien in Prüfreihenfolge
 * wirksam:       je Kriterium die wirksame Antwort (nach der Klärung)
 * befunde:       je Kriterium der Befund (siehe ermittleBefunde)
 * regel:         Index der angewandten Regel in modell.zuordnung (bei Triage null)
 * ausloeser:     Kriterien, die die angewandte Regel erfüllen, bei Triage das
 *                unklare Kriterium, das zu einer höheren Ebene führen könnte
 * angenommen:    unklare Kriterien, die im ungünstigsten Fall angenommen
 *                wurden, weil sie eine höhere Ebene unterhalb von triageAb
 *                verlangen (keine Triage nötig)
 * offen:         alle unklaren Kriterien ohne Triage; die zuständige Ebene
 *                prüft sie mit
 * uebersprungen: Kriterien, deren Bedingung nurWenn nicht erfüllt war
 */
function naechsterSchritt(modell, antworten) {
  const pfad = [];
  const wirksam = {};
  const uebersprungen = [];

  for (let i = 0; i < modell.reihenfolge.length; i++) {
    const kriteriumId = modell.reihenfolge[i];
    const kriterium = modell.kriterien[kriteriumId];
    if (!kriterium) {
      throw new Error("Unbekanntes Kriterium im Modell: " + kriteriumId);
    }
    if (!wirdGefragt(kriterium, wirksam)) {
      uebersprungen.push(kriteriumId);
      continue;
    }

    const eintrag = antworten[kriteriumId];

    // Noch nicht beantwortet: Diese Frage ist als Nächstes zu stellen.
    if (!eintrag) {
      return { typ: "frage", kriteriumId, pfad };
    }

    const antwort = wirksameAntwort(kriterium, eintrag);

    // „Unklar“ ohne beantwortete Klärungsfragen: zuerst die Klärung.
    if (antwort === null) {
      return { typ: "klaerung", kriteriumId, pfad };
    }

    pfad.push(kriteriumId);
    wirksam[kriteriumId] = antwort;
  }

  const befunde = ermittleBefunde(modell, antworten, wirksam);
  let regel = zuordnen(modell, befunde);
  if (regel < 0) throw new Error("Die Zuordnungsregel enthält keine Regel für diesen Fall.");

  // Unklare Kriterien im ungünstigsten Fall prüfen. Triage nur, wenn dieser
  // Fall mindestens die Ebene triageAb verlangt (Verantwortlichkeit des EA
  // nach Tabelle 3). Verlangt er eine niedrigere, aber höhere Ebene als die
  // übrigen Befunde, gilt diese Ebene und sie klärt die offene Frage mit.
  const schwelle = modell.zuordnung.findIndex(function (r) { return r.ergebnis === modell.triageAb; });
  const unklar = pfad.filter(function (id) { return befunde[id] === "triage"; });
  const annahme = Object.assign({}, befunde);
  const angenommen = [];
  for (let i = 0; i < unklar.length; i++) {
    const probe = Object.assign({}, befunde);
    probe[unklar[i]] = schlimmsterBefund(modell, unklar[i], befunde);
    const r = zuordnen(modell, probe);
    if (r >= regel) continue;
    if (r <= schwelle) {
      return { typ: "ergebnis", ergebnisId: "TRIAGE", regel: null, ausloeser: [unklar[i]], angenommen: [],
        offen: unklar.filter(function (id) { return id !== unklar[i]; }), befunde, pfad, wirksam, uebersprungen };
    }
    annahme[unklar[i]] = probe[unklar[i]];
    angenommen.push(unklar[i]);
  }
  if (angenommen.length) {
    regel = zuordnen(modell, annahme);
    if (regel <= schwelle) {
      return { typ: "ergebnis", ergebnisId: "TRIAGE", regel: null, ausloeser: [angenommen[0]], angenommen: [],
        offen: unklar.filter(function (id) { return id !== angenommen[0]; }), befunde, pfad, wirksam, uebersprungen };
    }
  }

  const ausloeser = [];
  modell.zuordnung[regel].wenn.forEach(function (b) {
    b.einesVon.forEach(function (id) {
      if (befundPasst(annahme[id], b.befund) && ausloeser.indexOf(id) < 0) ausloeser.push(id);
    });
  });

  return { typ: "ergebnis", ergebnisId: modell.zuordnung[regel].ergebnis, regel, ausloeser, angenommen,
    offen: unklar, befunde, pfad, wirksam, uebersprungen };
}

/*
 * Antwortvorschlag aus den angekreuzten Indikatoren: Trifft mindestens ein
 * Indikator zu, lautet die Antwort „Ja“ (Kap. 5.4). Ob das „Ja“ gering oder
 * wesentlich ist, entscheidet danach die Abstufung (ermittleBefunde).
 */
function vorschlagAusIndikatoren(angekreuzt) {
  return angekreuzt.length > 0 ? ANTWORT.JA : null;
}

/*
 * Ersetzt Platzhalter wie {fristEARB} durch die Werte aus den Einstellungen.
 * Geldbeträge werden als Euro-Betrag formatiert.
 */
function setzeWerteEin(text, einstellungen) {
  return text.replace(/\{(\w+)\}/g, function (ganzerTreffer, schluessel) {
    if (!(schluessel in einstellungen)) {
      return ganzerTreffer;
    }
    const wert = einstellungen[schluessel];
    if (schluessel === "investitionStrategisch" || schluessel === "befugnisgrenzeEARB") {
      return wert.toLocaleString("de-DE") + " €";
    }
    return String(wert);
  });
}

/* ---------- Diagramm (Phase 2) ---------- */

/*
 * Bricht einen Text für die Diagrammknoten in Zeilen von höchstens
 * „breite“ Zeichen um. Mermaid bricht Beschriftungen nicht selbst um,
 * wenn sie als reiner SVG-Text gezeichnet werden (nötig für den PNG-Export).
 */
function umbrechen(text, breite) {
  const zeilen = [];
  let zeile = "";
  text.split(" ").forEach(function (wort) {
    if (zeile && (zeile + " " + wort).length > breite) {
      zeilen.push(zeile);
      zeile = wort;
    } else {
      zeile = zeile ? zeile + " " + wort : wort;
    }
  });
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/* Bereitet einen Text als Mermaid-Beschriftung auf (Anführungszeichen maskieren). */
function diagrammText(text) {
  return text.replace(/"/g, "#quot;");
}

/*
 * Erzeugt das Ablaufdiagramm als Mermaid-Flussdiagramm.
 *
 * Das Diagramm wird vollständig aus modell.js abgeleitet und hat zwei Teile:
 *   1. die Kriterien in Prüfreihenfolge (alle werden gefragt),
 *   2. die Zuordnungsregel: Die Regeln werden von oben nach unten geprüft,
 *      die erste zutreffende bestimmt die Ebene.
 * Ändert sich das Modell, ändert sich das Diagramm.
 *
 * optionen.durchlauf: optional { pfad, regel, ergebnisId } – dann werden die
 *                     gefragten Kriterien und der Weg durch die Zuordnung
 *                     hervorgehoben.
 * optionen.mitUnklar: true, um die Triage-Prüfung zu zeigen (bei einem
 *                     Durchlauf mit Triage wird sie immer gezeigt).
 *
 * Rückgabe: Mermaid-Quelltext als Zeichenkette.
 */
function erzeugeDiagramm(modell, einstellungen, optionen) {
  const durchlauf = optionen.durchlauf || null;
  const mitTriage = optionen.mitUnklar || (durchlauf && durchlauf.ergebnisId === "TRIAGE");
  const zeilen = ["flowchart TD"];
  const kanten = [];          // in Reihenfolge des Quelltexts, für linkStyle
  const hervorgehoben = [];   // Indizes der hervorzuhebenden Kanten
  const regeln = modell.zuordnung;

  function kante(von, nach, beschriftung, gestrichelt, markieren) {
    if (markieren) hervorgehoben.push(kanten.length);
    kanten.push({ von: von, nach: nach });
    const pfeil = gestrichelt ? " -.->" : " -->";
    zeilen.push("  " + von + pfeil + (beschriftung ? "|" + beschriftung + "|" : "") + " " + nach);
  }

  // Teil 1: Kriterien
  zeilen.push("  subgraph T1[\"1. Alle Kriterien prüfen\"]");
  modell.reihenfolge.forEach(function (id) {
    const k = modell.kriterien[id];
    let text = [k.nummer + " " + k.titel].concat(umbrechen(setzeWerteEin(k.frage, einstellungen), 34));
    if (k.nurWenn) text.push("(nur wenn 1, 2 oder 3 zutrifft", "oder unklar ist)");
    zeilen.push("    K_" + id + "[\"" + diagrammText(text.join("<br/>")) + "\"]");
  });
  zeilen.push("  end");

  // Teil 2: Zuordnungsregel (die letzte Regel ohne Bedingung ist der Rest)
  const pruefregeln = regeln.filter(function (r) { return r.wenn.length > 0; });
  zeilen.push("  subgraph T2[\"2. Zuständigkeit bestimmen\"]");
  if (mitTriage) {
    zeilen.push("    Z_triage{{\"" + diagrammText(umbrechen("Verlangt eine unklar gebliebene Frage im ungünstigsten Fall " + modell.ergebnisse[modell.triageAb].ebene + " oder höher?", 34).join("<br/>")) + "\"}}");
  }
  pruefregeln.forEach(function (r, i) {
    zeilen.push("    R_" + i + "{{\"" + diagrammText(umbrechen(r.frage, 34).join("<br/>")) + "\"}}");
  });
  zeilen.push("  end");

  // Ergebnisknoten
  const ergebnisIds = regeln.map(function (r) { return r.ergebnis; });
  if (mitTriage) ergebnisIds.push("TRIAGE");
  ergebnisIds.forEach(function (id) {
    const e = modell.ergebnisse[id];
    const text = [e.ebene].concat(umbrechen(e.titel, 28));
    zeilen.push("  E_" + id + "([\"" + diagrammText(text.join("<br/>")) + "\"])");
  });

  // Kanten Teil 1: Kette der Kriterien
  const gefragt = durchlauf ? durchlauf.pfad : [];
  modell.reihenfolge.forEach(function (id, i) {
    const naechstes = modell.reihenfolge[i + 1];
    const ziel = naechstes ? "K_" + naechstes : (mitTriage ? "Z_triage" : "R_0");
    kante("K_" + id, ziel, "", false, !!durchlauf);
  });

  // Kanten Teil 2: Triage-Prüfung und Regeln
  const angewandt = durchlauf && durchlauf.ergebnisId !== "TRIAGE" ? durchlauf.regel : -1;
  if (mitTriage) {
    const istTriage = durchlauf && durchlauf.ergebnisId === "TRIAGE";
    kante("Z_triage", "E_TRIAGE", "Ja", true, istTriage);
    kante("Z_triage", "R_0", "Nein", false, !!durchlauf && !istTriage);
  }
  pruefregeln.forEach(function (r, i) {
    kante("R_" + i, "E_" + r.ergebnis, "Ja", false, angewandt === i);
    const weiter = i + 1 < pruefregeln.length ? "R_" + (i + 1) : "E_" + regeln[regeln.length - 1].ergebnis;
    kante("R_" + i, weiter, "Nein", false, angewandt > i);
  });

  // Farben der Ergebnisse (wie in der Oberfläche) und Hervorhebung
  zeilen.push("  classDef frage fill:#ffffff,stroke:#5b6576,color:#1d2430");
  zeilen.push("  classDef regel fill:#f4f6f9,stroke:#5b6576,color:#1d2430");
  zeilen.push("  classDef gruen fill:#e3f1e8,stroke:#2e7d4f,color:#1d2430");
  zeilen.push("  classDef gelb fill:#f8efd9,stroke:#b7861a,color:#1d2430");
  zeilen.push("  classDef orange fill:#f8e4d8,stroke:#c2591d,color:#1d2430");
  zeilen.push("  classDef rot fill:#f6dcda,stroke:#b3261e,color:#1d2430");
  zeilen.push("  classDef grau fill:#eceef1,stroke:#6b7280,color:#1d2430");
  zeilen.push("  classDef pfad fill:#dce8f6,stroke:#1f5fa8,stroke-width:3px,color:#1d2430");
  zeilen.push("  classDef ziel stroke:#1f5fa8,stroke-width:4px");

  zeilen.push("  class " + modell.reihenfolge.map(function (id) { return "K_" + id; }).join(",") + " frage");
  const regelknoten = pruefregeln.map(function (r, i) { return "R_" + i; });
  if (mitTriage) regelknoten.unshift("Z_triage");
  zeilen.push("  class " + regelknoten.join(",") + " regel");
  ergebnisIds.forEach(function (id) {
    zeilen.push("  class E_" + id + " " + modell.ergebnisse[id].farbe);
  });

  if (durchlauf) {
    const markiert = gefragt.map(function (id) { return "K_" + id; });
    if (mitTriage) markiert.push("Z_triage");
    if (durchlauf.ergebnisId !== "TRIAGE") {
      for (let i = 0; i <= Math.min(angewandt, pruefregeln.length - 1); i++) markiert.push("R_" + i);
    }
    if (markiert.length) zeilen.push("  class " + markiert.join(",") + " pfad");
    if (durchlauf.ergebnisId) zeilen.push("  class E_" + durchlauf.ergebnisId + " ziel");
    hervorgehoben.forEach(function (index) {
      zeilen.push("  linkStyle " + index + " stroke:#1f5fa8,stroke-width:4px");
    });
  }

  return zeilen.join("\n");
}

/*
 * Prüft die Einstellungen auf Widersprüche und gibt Hinweise zurück.
 * Die Befugnisgrenze des EARB muss über dem strategischen Schwellenwert
 * liegen, sonst wäre jede strategische Entscheidung sofort Ebene 4.
 */
function pruefeEinstellungen(einstellungen) {
  const hinweise = [];
  for (const schluessel in einstellungen) {
    const wert = einstellungen[schluessel];
    if (typeof wert !== "number" || isNaN(wert) || wert <= 0) {
      hinweise.push("Alle Werte müssen positive Zahlen sein.");
      break;
    }
  }
  if (einstellungen.befugnisgrenzeEARB <= einstellungen.investitionStrategisch) {
    hinweise.push("Die Befugnisgrenze des EARB sollte über dem Schwellenwert für strategische Investitionen liegen.");
  }
  return hinweise;
}
