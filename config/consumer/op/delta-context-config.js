const PREFIXES = `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
  PREFIX lblodgeneriek: <https://data.lblod.info/vocabularies/generiek/>
  PREFIX org: <http://www.w3.org/ns/org#>
  PREFIX code: <http://lblod.data.gift/vocabularies/organisatie/>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX generiek: <https://data.vlaanderen.be/ns/generiek#>
  PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
  PREFIX organisatie: <https://data.vlaanderen.be/ns/organisatie#>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX euvoc: <http://publications.europa.eu/ontology/euvoc#>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX schema: <http://schema.org/>
  PREFIX locn: <http://www.w3.org/ns/locn#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>`

const contextConfig = {
  addTypes: {
    scope: 'all', // 'inserts, 'deletes', 'all' or none. To add rdf:type to subjects of inserts, deletes or both
    exhausitive: false, // true or false: find all types for a subject, even if one is already present in delta
  },
  contextQueries: [
    {
      trigger: { // subjectType or predicateValue
        subjectType: "adms:identifier"
      },
      queryTemplate: (subject) => `
        ${PREFIXES}
        CONSTRUCT {
            ${subject} ext:goesInGraph ?g.
        } WHERE {
            ?adminUnit adms:identifier ${subject};
                mu:uuid ?uuid.
            BIND(IRI(CONCAT("http://mu.semte.ch/graphs/organizations/", ?uuid)) AS ?g)
        }`
    },
    {
      trigger: { // subjectType or predicateValue
        subjectType: "generiek:GestructureerdeIdentificator"
      },
      queryTemplate: (subject) => `
        ${PREFIXES}
        CONSTRUCT {
          ${subject} ext:goesInGraph ?g.
        } WHERE {
          GRAPH ?g {
              ?identifier generiek:gestructureerdeIdentificator ${subject}.
          }
        }`
    },
  ]
}

module.exports = {
  contextConfig,
  PREFIXES
};