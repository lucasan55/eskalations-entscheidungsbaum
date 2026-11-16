/*
 * modell.js – Daten des Governance-Modells
 *
 * Diese Datei enthält ausschließlich Daten, keine Logik. Sie bildet das
 * Governance-Modell aus Kapitel 5 der Projektarbeit ab:
 *   - die Entscheidungsebenen mit Fristen und Eskalationswegen (Tabelle 5),
 *   - die Kriterien in fester Prüfreihenfolge (Kap. 5.3),
 *   - die Indikatoren je Kriterium und die Abstufung „gering“/„wesentlich“,
 *   - die Zuordnungsregel, die aus allen Befunden die zuständige Ebene bestimmt,
 *   - die einstellbaren Parameter (Schwellenwerte und Fristen).
 *
 * Wer das Modell ändern will (z. B. Indikatoren an die eigene Organisation
 * anpassen), passt nur diese Datei an. Logik und Oberfläche bleiben unverändert.
 *
 * Platzhalter in geschweiften Klammern, z. B. {fristEARB}, werden zur Laufzeit
 * durch die aktuellen Werte aus den Einstellungen ersetzt.
 */

const MODELL = {

  /*
   * Einstellbare Parameter. Die Arbeit legt keine konkreten Werte fest, weil
   * sie organisationsspezifisch sind (vgl. Kap. 5.3, 5.4 und 7.2). Die Werte hier
   * sind Platzhalter und in der App unter „Einstellungen“ änderbar.
   */
  standardEinstellungen: {
    investitionStrategisch: 100000, // Euro: ab hier „hohe strategische Bedeutung“
    befugnisgrenzeEARB: 500000,     // Euro: ab hier entscheidet die Leitungsebene
    einspruchsfristEA: 2,           // Arbeitstage für den Einspruch des Enterprise-Architekten
    fristEARB: 5,                   // Arbeitstage für eine EARB-Entscheidung
    fristCoPA: 3,                   // Arbeitstage für eine CoPA-Entscheidung im Umlaufverfahren
    sprintlaenge: 2                 // Wochen; die CoPA tagt in diesem Rhythmus
  },

  /* Beschreibung der Parameter für die Seite „Einstellungen“. */
  einstellungenBeschreibung: [
    { schluessel: "investitionStrategisch", bezeichnung: "Schwellenwert „Investition strategisch“", einheit: "€" },
    { schluessel: "befugnisgrenzeEARB", bezeichnung: "Schwellenwert „Befugnisgrenze EARB“", einheit: "€" },
    { schluessel: "einspruchsfristEA", bezeichnung: "Einspruchsfrist Enterprise-Architekt", einheit: "Arbeitstage" },
    { schluessel: "fristEARB", bezeichnung: "Entscheidungsfrist EARB", einheit: "Arbeitstage" },
    { schluessel: "fristCoPA", bezeichnung: "Frist CoPA im Umlaufverfahren", einheit: "Arbeitstage" },
    { schluessel: "sprintlaenge", bezeichnung: "Sprintlänge (= CoPA-Rhythmus)", einheit: "Wochen" }
  ],

  /*
   * Mögliche Ergebnisse eines Durchlaufs.
   * Ebenen 1 bis 4 entsprechen Tabelle 5 der Arbeit. „Ebene 1 mit Beratung“
   * ergibt sich aus dem Kriterium Umkehrbarkeit, „Triage“ aus der Antwort
   * „Unklar“ (Verantwortlichkeit des Enterprise-Architekten, Tabelle 3).
   * Beleg: Ahlemann et al. 2012, S. 159; Uludağ/Reiter/Matthes 2020, S. 358–359.
   */
  ergebnisse: {
    E1: {
      ebene: "Ebene 1",
      titel: "Das Scrum Team entscheidet",
      entscheider: "Scrum Team (Developer)",
      frist: "Entscheidung im Sprint. Eine Einspruchsfrist gibt es nicht; der Enterprise-Architekt sieht die ADR stichprobenartig durch.",
      eskalation: "Fällt bei der Durchsicht eine zu niedrige Einstufung auf, ordnet der Enterprise-Architekt die Entscheidung neu zu.",
      schritte: [
        "Entscheidung im Sprint Planning oder während des Sprints treffen.",
        "ADR anlegen und veröffentlichen.",
        "Product Owner informieren, falls ein Architektur-Enabler entsteht."
      ],
      farbe: "gruen"
    },
    E1B: {
      ebene: "Ebene 1 mit Beratung",
      titel: "Das Scrum Team entscheidet nach Beratung",
      entscheider: "Scrum Team (Developer), beraten durch den Enterprise-Architekten",
      frist: "Entscheidung im Sprint. Der Enterprise-Architekt kann innerhalb von {einspruchsfristEA} Arbeitstagen nach Veröffentlichung des ADR Einspruch erheben. Ohne Einspruch gilt die Entscheidung als bestätigt.",
      eskalation: "Bei Einspruch des Enterprise-Architekten geht die Entscheidung an Ebene 2 (CoPA).",
      schritte: [
        "Enterprise-Architekten vor der Umsetzung beratend hinzuziehen, weil die Entscheidung schwer umkehrbar ist.",
        "Entscheidung im Team treffen.",
        "ADR anlegen und veröffentlichen, Ergebnis der Beratung darin festhalten.",
        "Product Owner informieren, falls ein Architektur-Enabler entsteht."
      ],
      farbe: "gruen"
    },
    E2: {
      ebene: "Ebene 2",
      titel: "Die CoPA entscheidet",
      entscheider: "Community of Practice for Architecture (CoPA)",
      frist: "In der nächsten CoPA-Sitzung. Die CoPA tagt im Sprint-Rhythmus, also alle {sprintlaenge} Wochen. Liegt die Sitzung zu weit entfernt, entscheidet die CoPA im Umlaufverfahren innerhalb von {fristCoPA} Arbeitstagen.",
      eskalation: "Entscheidet die CoPA nicht fristgerecht oder erzielt keine Einigung, geht die Entscheidung an Ebene 3 (EARB).",
      schritte: [
        "ADR als Entscheidungsvorlage anlegen.",
        "ADR über den Architektur-Ansprechpartner in die nächste CoPA-Sitzung einbringen.",
        "Ergebnis im ADR festhalten."
      ],
      farbe: "gelb"
    },
    E3: {
      ebene: "Ebene 3",
      titel: "Das EARB entscheidet",
      entscheider: "Enterprise Architecture Review Board (EARB)",
      frist: "Innerhalb von {fristEARB} Arbeitstagen nach Eingang des ADR, bei Bedarf im Umlaufverfahren statt in einer Sitzung.",
      eskalation: "Entscheidet das EARB nicht fristgerecht oder überschreitet die Entscheidung seine Befugnisse, geht sie an Ebene 4 (EAC / IT-Leitung).",
      schritte: [
        "ADR als Entscheidungsvorlage anlegen.",
        "ADR beim EARB einreichen.",
        "Bei einer Ausnahme von Leitplanken: Befristung und Auflagen im ADR festhalten.",
        "Ergebnis im ADR festhalten."
      ],
      farbe: "orange"
    },
    E4: {
      ebene: "Ebene 4",
      titel: "Die Leitungsebene entscheidet",
      entscheider: "Enterprise Architecture Council (EAC) bzw. IT-Leitung",
      frist: "Nach dem Sitzungsturnus der Leitung. Bis dahin gilt eine vorläufige Entscheidung des EARB, die es innerhalb von {fristEARB} Arbeitstagen trifft; sie darf keine schwer umkehrbaren Verpflichtungen wie Vertragsabschlüsse auslösen.",
      eskalation: "Keine weitere Eskalationsstufe.",
      schritte: [
        "ADR als Entscheidungsvorlage anlegen.",
        "ADR über das EARB an die Leitungsebene weiterleiten.",
        "Ergebnis im ADR festhalten."
      ],
      farbe: "rot"
    },
    TRIAGE: {
      ebene: "Triage",
      titel: "Triage durch den Enterprise-Architekten",
      entscheider: "Enterprise-Architekt ordnet die Entscheidung einer Ebene zu",
      frist: "Im Modell nicht festgelegt.",
      eskalation: "Nach der Triage gelten Frist und Eskalationsweg der zugeordneten Ebene.",
      schritte: [
        "ADR mit den bisherigen Antworten anlegen.",
        "Enterprise-Architekten um Triage bitten und die unklare Frage benennen.",
        "Nach der Zuordnung den Weg der zugeordneten Ebene gehen."
      ],
      farbe: "grau"
    }
  },

  /*
   * Prüfreihenfolge (Kap. 5.3 und 5.4, geändert am 26.10.2026). Alle Kriterien werden
   * gefragt, auch wenn ein früheres schon zutrifft. So kennt die zuständige
   * Ebene alle Befunde, z. B. ein Datenschutzrisiko neben einer Abweichung von
   * einer Leitplanke. Die Befugnis des EARB (3a) wird nur gefragt, wenn
   * Kriterium 1, 2 oder 3 zutrifft oder unklar ist (nurWenn beim Kriterium).
   */
  reihenfolge: ["konformitaet", "risiko", "strategie", "befugnis", "reichweite", "umkehrbarkeit"],

  /*
   * Zuordnungsregel: Aus den Befunden aller Kriterien wird die zuständige
   * Ebene bestimmt. Die Regeln werden von oben nach unten geprüft, die erste
   * zutreffende gilt; damit entscheidet der schwerwiegendste Befund.
   *
   * Befund je Kriterium:
   *   "wesentlich"  Kriterium trifft zu (ohne Abstufung immer wesentlich)
   *   "gering"      Kriterium trifft zu, aber nur in geringem Umfang (siehe abstufung)
   *   "nein"        Kriterium trifft nicht zu
   *   "triage"      auch nach den Klärungsfragen unklar
   * In den Bedingungen steht befund "ja" für „wesentlich“ oder „gering“.
   *
   * Triage: Bleibt ein Kriterium unklar, wird es im ungünstigsten Fall
   * angenommen (wesentlich, bei Abstufung nach Kontext ggf. nur gering).
   * Der Enterprise-Architekt ordnet nur zu, wenn dieser ungünstigste Fall
   * mindestens die Ebene triageAb verlangt. Verlangt er eine niedrigere Ebene,
   * entscheidet diese Ebene und klärt die offene Frage mit (Hinweis im
   * Ergebnis); ändert die offene Frage nichts, gilt die ermittelte Ebene.
   */
  triageAb: "E3",

  zuordnung: [
    {
      ergebnis: "E4",
      frage: "Wesentlicher Befund bei 1, 2 oder 3 und Befugnis des EARB überschritten?",
      wenn: [
        { einesVon: ["konformitaet", "risiko", "strategie"], befund: "wesentlich" },
        { einesVon: ["befugnis"], befund: "ja" }
      ]
    },
    {
      ergebnis: "E3",
      frage: "Wesentlicher Befund bei 1, 2 oder 3?",
      wenn: [{ einesVon: ["konformitaet", "risiko", "strategie"], befund: "wesentlich" }]
    },
    {
      ergebnis: "E2",
      frage: "Geringe Abweichung, geringes Risiko oder andere Teams betroffen?",
      wenn: [{ einesVon: ["konformitaet", "risiko", "reichweite"], befund: "ja" }]
    },
    {
      ergebnis: "E1B",
      frage: "Schwer umkehrbar?",
      wenn: [{ einesVon: ["umkehrbarkeit"], befund: "ja" }]
    },
    {
      ergebnis: "E1",
      frage: "Kein Kriterium trifft zu",
      wenn: []
    }
  ],

  /*
   * Kriterien, vom schwerwiegendsten zum geringsten (Reihenfolge siehe oben).
   * beiJa nennt die Ebene, zu der ein „Ja“ mindestens führt (für Diagramm und
   * Erläuterung); verbindlich ist die Zuordnungsregel oben.
   *
   * Die Antwort „Unklar“ führt zu Klärungsfragen (klaerung): zu jedem
   * Indikator zwei Tatsachenfragen mit Hinweis, wo das Team nachsehen kann
   * (Fragenkatalog, Stand 22.10.2026). Ausgewertet wird je Indikator:
   *   ODER: trifft zu, wenn eine Frage „Ja“; trifft nicht zu, wenn beide „Nein“
   *   UND:  trifft zu, wenn beide „Ja“; trifft nicht zu, sobald eine „Nein“
   *   sonst ist der Indikator offen.
   * Danach für das Kriterium:
   *   - mindestens ein Indikator trifft zu  → das Kriterium gilt als „Ja“
   *   - kein Indikator trifft zu            → das Kriterium gilt als „Nein“
   *   - sonst (mindestens einer offen)      → beiRestunklarheit:
   *       "ja"     = im Zweifel als „Ja“ werten (Vorsichtsprinzip)
   *       "triage" = Triage durch den Enterprise-Architekten
   * Damit bleibt die Triage auf Fälle beschränkt, die das Team auch mit
   * Nachschlagen nicht klären kann.
   *
   * Abstufung (26.10.2026): Bei Konformität und Risiko führt nicht jedes „Ja“
   * zum EARB. Eine geringe Abweichung bzw. ein geringes Risiko geht an die
   * CoPA (Ebene 2). Zwei Arten:
   *   { art: "kontext", geringWennNein: [ids] }  gering, wenn diese Kriterien
   *                                              alle „Nein“ sind
   *   { art: "indikatoren", wesentlich: [i] }    wesentlich, wenn einer dieser
   *                                              Indikatoren zutrifft oder „Ja“
   *                                              ohne Indikator gewählt wurde
   * Jede Zuständigkeit des EARB wird zusätzlich gegen seine Befugnisse geprüft
   * (3a, Tabelle 3: EAC / IT-Leitung entscheidet bei Überschreitung).
   *
   * Die Indikatoren sind ein Vorschlag dieser Arbeit und an die jeweilige
   * Organisation anzupassen.
   */
  kriterien: {
    konformitaet: {
      nummer: "1",
      titel: "Konformität",
      frage: "Weicht die Entscheidung von einer Leitplanke ab?",
      indikatoren: [
        "Es wird eine Technologie, ein Produkt oder ein Dienst neu eingesetzt, der nicht im freigegebenen Technologiekatalog steht.",
        "Ein vorgegebenes Architektur- oder Integrationsmuster wird nicht eingehalten.",
        "Eine gemeinsame Plattform oder ein Standarddienst wird umgangen."
      ],
      beispiel: "Das Team möchte statt der Standard-Datenbank eine andere Datenbank einsetzen.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "UND", // neu eingesetzt UND nicht freigegeben (bis 22.10.2026: ODER)
            fragen: [
              { text: "Führt die Lösung eine Programmiersprache, ein Framework, eine Datenbank oder ein Produkt ein, das im eigenen Produkt bisher nicht eingesetzt wird?", hinweis: "Eigene Systemdokumentation, Abhängigkeitsliste im Code" },
              { text: "Ist dieses Element im Technologiekatalog nicht eingetragen oder als „auslaufend“ bzw. „eingeschränkt“ gekennzeichnet?", hinweis: "Technologiekatalog" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Tauscht die Lösung Daten mit anderen Systemen aus, ohne die vorgegebene Integrationsplattform (z. B. API-Gateway, Event-Bus) zu nutzen?", hinweis: "Architekturleitplanken, Architekturskizze der Lösung" },
              { text: "Weicht der technische Aufbau vom Referenzaufbau für diesen Lösungstyp ab, z. B. durch einen eigenen Anmeldemechanismus statt des zentralen Logins?", hinweis: "Referenzarchitekturen" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Wird die Lösung außerhalb der Standard-Betriebsplattform betrieben, z. B. auf einem eigenen Server, in einem nicht freigegebenen Cloud-Konto oder als Software-as-a-Service?", hinweis: "Betriebshandbuch, Plattformteam" },
              { text: "Baut das Team eine Funktion selbst, die ein zentraler Dienst bereits anbietet, z. B. Logging, Monitoring, Benachrichtigungen oder Dateiablage?", hinweis: "Servicekatalog der Plattform" }
            ]
          }
        ],
        beiRestunklarheit: "triage", // Leitplankenfragen klärt der Enterprise-Architekt als Pfleger der Leitplanken
      },
      abstufung: {
        art: "kontext",
        geringWennNein: ["reichweite", "umkehrbarkeit"],
        hinweisGering: "Geringe Abweichung: Sie betrifft nur das eigene Team und ist leicht umkehrbar. Die CoPA entscheidet; Befristung und Begründung der Abweichung im ADR festhalten.",
        hinweisWesentlich: "Wesentliche Abweichung: Sie betrifft andere Teams oder ist schwer umkehrbar."
      },
      beleg: "The Open Group 2025a, Kap. 3.2.1.2",
      beiJa: "E3"
    },
    risiko: {
      nummer: "2",
      titel: "Risiko",
      frage: "Birgt die Entscheidung ein Sicherheits-, Datenschutz- oder Compliance-Risiko?",
      indikatoren: [
        "Personenbezogene oder vertrauliche Daten werden an einem neuen Ort gespeichert oder an einen neuen Empfänger übermittelt.",
        "Ein System mit hohem Schutzbedarf oder ein geschäftskritisches System ist betroffen.",
        "Regulatorische Vorgaben sind berührt (z. B. DSGVO, branchenspezifische Aufsichtsvorgaben).",
        "Sicherheitsmechanismen werden verändert (z. B. Authentifizierung, Berechtigungen, Netzwerkzonen)."
      ],
      beispiel: "Kundendaten sollen an einen externen Dienst übertragen werden.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "UND",
            fragen: [
              { text: "Enthalten die Daten Angaben, mit denen sich eine Person bestimmen lässt (z. B. Name, E-Mail-Adresse, Kundennummer, IP-Adresse), oder als vertraulich eingestufte Unternehmensdaten?", hinweis: "Datenmodell, Datenklassifizierung" },
              { text: "Werden diese Daten an einem Ort gespeichert oder an einen Empfänger übermittelt, an dem sie bisher nicht vorlagen?", hinweis: "Architekturskizze, Verzeichnis der Verarbeitungstätigkeiten" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Ist das betroffene System in der Schutzbedarfsfeststellung mit „hoch“ oder „sehr hoch“ eingestuft?", hinweis: "Schutzbedarfsfeststellung, Informationssicherheit" },
              { text: "Würde ein Ausfall des Systems von mehr als einem Arbeitstag Kunden oder Umsatz unmittelbar beeinträchtigen?", hinweis: "Product Owner, Betriebsvereinbarungen (SLA)" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Verarbeitet die Lösung Zahlungsdaten, Gesundheitsdaten oder andere besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO?", hinweis: "Datenmodell, Datenschutz" },
              { text: "Unterliegt das betroffene Produkt einer Aufsicht oder Prüfpflicht, z. B. Vorgaben der Finanzaufsicht, Medizinprodukterecht oder kritische Infrastruktur?", hinweis: "Compliance, Product Owner" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Ändert sich, wie sich Nutzer oder Systeme anmelden oder welche Rechte sie erhalten?", hinweis: "Berechtigungskonzept" },
              { text: "Müssen Firewall-Regeln, Netzwerkfreigaben oder Zertifikate neu eingerichtet oder geändert werden?", hinweis: "Netzwerk- bzw. Plattformteam" }
            ]
          }
        ],
        beiRestunklarheit: "triage", // bei unklarem Risiko keine Entscheidung ohne fachliche Einschätzung
      },
      abstufung: {
        art: "indikatoren",
        wesentlich: [1, 2], // hoher Schutzbedarf / geschäftskritisch, regulatorische Vorgaben
        hinweisGering: "Geringes Risiko: Es sind weder ein System mit hohem Schutzbedarf noch regulatorische Vorgaben betroffen. Die CoPA entscheidet; Einschätzung zu Datenschutz und Informationssicherheit im ADR festhalten.",
        hinweisWesentlich: "Wesentliches Risiko: Ein System mit hohem Schutzbedarf, ein geschäftskritisches System oder regulatorische Vorgaben sind betroffen."
      },
      beleg: "The Open Group 2025c, Kap. 4.7.1",
      beiJa: "E3"
    },
    strategie: {
      nummer: "3",
      titel: "Strategische Bedeutung",
      frage: "Hat die Entscheidung hohe strategische Bedeutung?",
      indikatoren: [
        "Das Investitionsvolumen übersteigt {investitionStrategisch}.",
        "Es entsteht eine längerfristige Bindung an einen Anbieter.",
        "Rolle, Schnittstellen oder Lebenszyklus eines Systems bzw. einer Plattform aus der Zielarchitektur oder IT-Roadmap ändern sich."
      ],
      beispiel: "Wechsel zu einem neuen Cloud-Anbieter.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Liegen die geschätzten Kosten über drei Jahre (Lizenzen, Betrieb, externe Dienstleister) über {investitionStrategisch}?", hinweis: "Kostenschätzung, Angebote, Product Owner" },
              { text: "Bindet die Umsetzung mehr als ein Team für mehr als drei Sprints?", hinweis: "Releaseplanung, Product Owner" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Wird ein Vertrag mit einer Laufzeit oder Kündigungsfrist von mehr als einem Jahr geschlossen?", hinweis: "Vertrag, Angebot, Einkauf" },
              { text: "Nutzt die Lösung anbieterspezifische Funktionen, für die es kein Standardformat und keine vollständige Exportmöglichkeit gibt?", hinweis: "Produktdokumentation des Anbieters" }
            ]
          },
          {
            verknuepfung: "UND",
            fragen: [
              { text: "Ist das betroffene System oder die Plattform in der Zielarchitektur oder IT-Roadmap ausdrücklich genannt?", hinweis: "Zielarchitektur, IT-Roadmap" },
              { text: "Ändert die Lösung die Rolle dieses Systems bzw. dieser Plattform, ihre Schnittstellen nach außen oder ihren Lebenszyklusstatus (z. B. Einführung, Ablösung, Abschaltung)?", hinweis: "Architekturskizze der Lösung" }
            ]
          }
        ],
        beiRestunklarheit: "triage", // strategische Einordnung erfordert den Überblick der EA-Funktion
      },
      beleg: "Uludağ/Reiter/Matthes 2020, S. 358",
      beiJa: "E3"
    },
    befugnis: {
      nummer: "3a",
      titel: "Befugnis des EARB",
      frage: "Überschreitet die Entscheidung die Befugnisse des EARB?",
      indikatoren: [
        "Das Investitionsvolumen übersteigt {befugnisgrenzeEARB}.",
        "Die Entscheidung wirkt über die IT hinaus auf mehrere Geschäftsbereiche."
      ],
      beispiel: "Ablösung einer zentralen Unternehmensplattform mit Auswirkungen auf Vertrieb und Kundenservice.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Liegen die geschätzten Kosten über drei Jahre über {befugnisgrenzeEARB}?", hinweis: "Kostenschätzung" },
              { text: "Ist für die Finanzierung eine Freigabe außerhalb des Budgets des Produkts nötig, z. B. ein Investitionsantrag oder Sonderbudget?", hinweis: "Controlling, Product Owner" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Müssen Mitarbeitende aus mehr als einem Fachbereich ihre Arbeitsabläufe ändern?", hinweis: "Product Owner, Fachbereiche" },
              { text: "Ist die Zustimmung einer Stelle außerhalb der IT erforderlich, z. B. einer Fachbereichsleitung oder des Betriebsrats?", hinweis: "Product Owner, Personalabteilung" }
            ]
          }
        ],
        beiRestunklarheit: "triage", // Befugnisfragen klärt der Enterprise-Architekt mit dem EARB
      },
      // Nur gefragt, wenn Kriterium 1, 2 oder 3 zutrifft oder unklar ist.
      nurWenn: { einesVon: ["konformitaet", "risiko", "strategie"], antwort: ["ja", "triage"] },
      beleg: "Ahlemann et al. 2012, S. 159",
      beiJa: "E4"
    },
    reichweite: {
      nummer: "4",
      titel: "Reichweite",
      frage: "Müssen andere Teams wegen der Entscheidung ihre Schnittstellen, Daten oder Komponenten anpassen?",
      indikatoren: [
        "Eine Schnittstelle (API, Ereignis, Datei), die andere Teams nutzen, wird inkompatibel geändert, z. B. ein Feld entfernt oder umbenannt.",
        "Gemeinsam genutzte Daten werden in Aufbau oder Bedeutung verändert.",
        "Eine Komponente oder Bibliothek, die andere Teams einbinden, wird so verändert, dass diese ihren Code anpassen müssen."
      ],
      beispiel: "Ein Feld in einer von drei Teams genutzten REST-API wird umbenannt.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "UND",
            fragen: [
              { text: "Ist die betroffene Schnittstelle im API-Katalog oder API-Gateway als von anderen Teams genutzt eingetragen?", hinweis: "API-Katalog, Zugriffsprotokolle des API-Gateways" },
              { text: "Ist die Änderung inkompatibel, d. h. wird ein Feld, Endpunkt oder Ereignis entfernt, umbenannt oder in seiner Bedeutung geändert?", hinweis: "Schnittstellenbeschreibung (z. B. OpenAPI)" }
            ]
          },
          {
            verknuepfung: "UND",
            fragen: [
              { text: "Lesen oder schreiben andere Teams dieselbe Datenbank, Tabelle oder dasselbe Datenthema?", hinweis: "Datenkatalog, Datenbankberechtigungen" },
              { text: "Ändern sich Aufbau oder Bedeutung eines Datenfelds, das andere Teams verwenden?", hinweis: "Datenmodell, Änderungsbeschreibung" }
            ]
          },
          {
            verknuepfung: "UND",
            fragen: [
              { text: "Wird die Komponente oder Bibliothek in den Builds anderer Teams eingebunden?", hinweis: "Paketverwaltung, Abhängigkeitsanalyse" },
              { text: "Müssen andere Teams nach der Änderung ihren Code anpassen, um weiter zu funktionieren?", hinweis: "Änderungsbeschreibung, Versionshinweise" }
            ]
          }
        ],
        beiRestunklarheit: "ja", // im Zweifel teamübergreifend: Die CoPA klärt die Frage mit den betroffenen Teams
      },
      beleg: "Uludağ/Reiter/Matthes 2020, S. 358",
      beiJa: "E2"
    },
    umkehrbarkeit: {
      nummer: "5",
      titel: "Umkehrbarkeit",
      frage: "Ist die Entscheidung nur schwer umkehrbar?",
      indikatoren: [
        "Der Rückbau würde voraussichtlich mehr als einen Sprint dauern.",
        "Eine Datenmigration wäre nötig, um die Entscheidung rückgängig zu machen.",
        "Es entstehen vertragliche oder lizenzrechtliche Bindungen."
      ],
      beispiel: "Umstellung des Datenformats bestehender Bestandsdaten.",
      klaerung: {
        // je Indikator (gleiche Reihenfolge) zwei Klärungsfragen
        gruppen: [
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Schätzt das Team den Aufwand für einen Rückbau auf mehr als die Kapazität eines Sprints?", hinweis: "Schätzung im Team" },
              { text: "Müssten für einen Rückbau andere Teams oder Systeme mitwirken?", hinweis: "Architekturskizze, Abhängigkeiten" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Werden bestehende Daten in ein neues Format oder eine neue Struktur überführt?", hinweis: "Migrationskonzept, Datenmodell" },
              { text: "Entstehen nach der Umstellung Daten, die das bisherige System nicht mehr lesen kann?", hinweis: "Datenmodell" }
            ]
          },
          {
            verknuepfung: "ODER",
            fragen: [
              { text: "Wird ein Vertrag oder eine Lizenz abgeschlossen, die bei einem Rückbau weiterbezahlt werden müsste?", hinweis: "Vertrag, Einkauf" },
              { text: "Werden Daten an einen Anbieter übertragen, von dem sie nur gegen Entgelt oder nicht vollständig zurückgeholt werden können?", hinweis: "Vertrag, Produktdokumentation des Anbieters" }
            ]
          }
        ],
        beiRestunklarheit: "ja", // im Zweifel als schwer umkehrbar behandeln: Das Team holt sich Beratung
      },
      beleg: "The Open Group, TOGAF Series Guide „ADM using Agile Sprints“, Kap. 5.4",
      beiJa: "E1B"
    }
  }
};
