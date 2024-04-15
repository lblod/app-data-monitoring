import { generateReportFromData, batchedQuery } from "../helpers.js";

export default {
  cronPattern: "0 00 23 * * Sunday",
  name: "governing-body-report",
  execute: async () => {
    console.log("Start generating governing body report...");
    const reportData = {
      title: "Bestuursorganen",
      description: "Bestuursorganen nummeren",
      filePrefix: "export/governing-body",
    };

    // Get all governing bodies and their location
    const queryGoverningBodyListResponse = await batchedQuery(
      queryGoverningBodyList
    );
    console.log(
      `Found ${queryGoverningBodyListResponse.results.bindings.length} governing bodies`
    );

    const data = [];
    // Get the stats for each governing body
    for (const {
      governingBodyAbstract,
      governingBodyAbstractClassificationName,
      locationLabel,
    } of queryGoverningBodyListResponse.results.bindings) {
      // Load the stats
      const queryResponse = await batchedQuery(
        queryGoverningBodyStats(governingBodyAbstract.value)
      );

      const {
        firstSessionPlannedStart,
        lastSessionPlannedStart,
        firstSessionStartedAt,
        lastSessionStartedAt,
        sessionCount,
        sessionPlannedStartCount,
        sessionStartedAtCount,
        sessionEndedAtCount,
        agendaItemCount,
        agendaItemTitleCount,
        agendaItemDescriptionCount,
        agendaItemHandlingCount,
        resolutionCount,
        resolutionDescriptionCount,
        resolutionMotivationCount,
        articleCount,
        voteCount,
      } = queryResponse.results.bindings[0] || {};

      // Add the stats to the data
      data.push({
        Locatie: cleanValue(locationLabel?.value),
        "Bestuursorgaan type": cleanValue(
          governingBodyAbstractClassificationName?.value
        ),
        "Eerste zitting geplande start": firstSessionPlannedStart?.value,
        "Laatste zitting geplande start": lastSessionPlannedStart?.value,
        "Eerste zitting gestart": firstSessionStartedAt?.value,
        "Laatste zitting gestart": lastSessionStartedAt?.value,
        "Zittingen aantal": cleanValue(sessionCount?.value || 0),
        "Zittingen geplande start aantal": cleanValue(
          sessionPlannedStartCount?.value || 0
        ),
        "Zittingen gestart aantal": cleanValue(
          sessionStartedAtCount?.value || 0
        ),
        "Zittingen beëindigd aantal": cleanValue(
          sessionEndedAtCount?.value || 0
        ),
        "Agendapunten aantal": cleanValue(agendaItemCount?.value || 0),
        "Agendapunten titel aantal": cleanValue(
          agendaItemTitleCount?.value || 0
        ),
        "Agendapunten beschrijving aantal": cleanValue(
          agendaItemDescriptionCount?.value || 0
        ),
        "Agendapunten behandeling aantal": cleanValue(
          agendaItemHandlingCount?.value || 0
        ),
        "Besluiten aantal": cleanValue(resolutionCount?.value || 0),
        "Besluiten beschrijving aantal": cleanValue(
          resolutionDescriptionCount?.value || 0
        ),
        "Besluiten motivering aantal": cleanValue(
          resolutionMotivationCount?.value || 0
        ),
        "Besluiten artikel aantal": cleanValue(articleCount?.value || 0),
        "Stemmingen aantal": cleanValue(voteCount?.value || 0),
      });
    }
    console.log("Governing body data loaded.");

    // Generate the report
    await generateReportFromData(
      data,
      [
        "Locatie",
        "Bestuursorgaan type",
        "Eerste zitting geplande start",
        "Laatste zitting geplande start",
        "Eerste zitting gestart",
        "Laatste zitting gestart",
        "Zittingen aantal",
        "Zittingen geplande start aantal",
        "Zittingen gestart aantal",
        "Zittingen beëindigd aantal",
        "Agendapunten aantal",
        "Agendapunten titel aantal",
        "Agendapunten beschrijving aantal",
        "Agendapunten behandeling aantal",
        "Besluiten aantal",
        "Besluiten beschrijving aantal",
        "Besluiten motivering aantal",
        "Besluiten artikel aantal",
        "Stemmingen aantal",
      ],
      reportData
    );

    console.log("Governing body report generated.");
  },
};

const cleanValue = (inputString) => {
  if (typeof inputString === "string") {
    inputString = inputString
      ?.trim()
      // Basic protection against CSV injection
      .replace(/["';=<>]/g, "");
  }

  return `"${inputString}"`;
};

/**
 * Query to get all governing bodies and their location
 */
const queryGoverningBodyList = `
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

SELECT DISTINCT ?governingBodyAbstract ?governingBodyAbstractClassificationName ?locationLabel
WHERE {

    ?governingBodyAbstract a besluit:Bestuursorgaan ;
        besluit:classificatie ?governingBodyAbstractClassification ;
        besluit:bestuurt ?administrativeUnit .

    ?administrativeUnit a besluit:Bestuurseenheid ;
        besluit:werkingsgebied ?location .

    ?location a prov:Location ;
        rdfs:label ?locationLabel .

    ?governingBodyAbstractClassification 
        skos:prefLabel ?governingBodyAbstractClassificationName .
}`;

const queryGoverningBodyStats = (governingBodyURI) => `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX eli: <http://data.europa.eu/eli/ontology#>
PREFIX code: <http://lblod.data.gift/vocabularies/organisatie/>

SELECT DISTINCT 
    ?governingBodyAbstract 
    (MIN(?sessionPlannedStart) as ?firstSessionPlannedStart)
    (MAX(?sessionPlannedStart) as ?lastSessionPlannedStart)
    (MIN(?sessionStartedAt) as ?firstSessionStartedAt)
    (MAX(?sessionStartedAt) as ?lastSessionStartedAt)
    (COUNT(DISTINCT ?session) AS ?sessionCount)
    (COUNT(DISTINCT ?sessionPlannedStart) AS ?sessionPlannedStartCount)
    (COUNT(DISTINCT ?sessionStartedAt) AS ?sessionStartedAtCount)
    (COUNT(DISTINCT ?sessionEndedAt) AS ?sessionEndedAtCount)
    (COUNT(DISTINCT ?agendaItem) AS ?agendaItemCount)
    (COUNT(DISTINCT ?agendaItemTitle) AS ?agendaItemTitleCount)
    (COUNT(DISTINCT ?agendaItemDescription) AS ?agendaItemDescriptionCount)
    (COUNT(DISTINCT ?agendaItemHandling) AS ?agendaItemHandlingCount)
    (COUNT(DISTINCT ?resolution) AS ?resolutionCount)
    (COUNT(DISTINCT ?resolutionDescription) AS ?resolutionDescriptionCount)
    (COUNT(DISTINCT ?resolutionMotivation) AS ?resolutionMotivationCount)
    (COUNT(DISTINCT ?article) AS ?articleCount)
    (COUNT(DISTINCT ?vote) AS ?voteCount)
WHERE {
    GRAPH ?g {
        VALUES ?governingBodyAbstract {
            <${governingBodyURI}>
        }
        
        OPTIONAL {
            ?agendaItemHandling a besluit:BehandelingVanAgendapunt ;
                dct:subject ?agendaItem .
            
            OPTIONAL { 
                ?agendaItemHandling prov:generated ?resolution . 

                OPTIONAL { ?resolution eli:description ?resolutionDescription . }
                OPTIONAL { ?resolution besluit:motivering ?resolutionMotivation . }
                OPTIONAL { ?resolution eli:has_part ?article . }
            }
            OPTIONAL { 
                ?agendaItemHandling besluit:heeftStemming ?vote .
            }
        }

        ?agendaItem a besluit:Agendapunt .

        OPTIONAL { ?agendaItem dct:title ?agendaItemTitle . }
        OPTIONAL { ?agendaItem dct:description ?agendaItemDescription . }

        ?session a besluit:Zitting ;
            besluit:behandelt ?agendaItem .

        OPTIONAL { ?session besluit:geplandeStart ?sessionPlannedStart . }
        OPTIONAL { ?session prov:startedAtTime ?sessionStartedAt . }
        OPTIONAL { ?session prov:endedAtTime ?sessionEndedAt . }

        { 
            ?session a besluit:Zitting ;
                besluit:isGehoudenDoor ?governingBodyTimeSpecified .
    
            ?governingBodyTimeSpecified a besluit:Bestuursorgaan ;
                mandaat:isTijdspecialisatieVan ?governingBodyAbstract .
        }
        UNION { 
            ?session a besluit:Zitting ;
                besluit:isGehoudenDoor ?governingBodyAbstract .
        }

        ?governingBodyAbstract a besluit:Bestuursorgaan .
    }
} GROUP BY ?governingBodyAbstract`;
