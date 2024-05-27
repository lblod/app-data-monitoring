const { 
  DCR_LANDING_ZONE_GRAPH,
  LANDING_ZONE_GRAPH,
  BATCH_SIZE,
  MU_CALL_SCOPE_ID_INITIAL_SYNC,
  MAX_DB_RETRY_ATTEMPTS,
  SLEEP_BETWEEN_BATCHES,
  SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
  LANDING_ZONE_DATABASE_ENDPOINT,
  DIRECT_DATABASE_ENDPOINT,
  BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES,
  MU_SPARQL_ENDPOINT,
} = require("./dm-config.js");
const { 
  batchedDbUpdate, 
  moveToPublic,
  moveToOrganizationsGraph,
  prefixes
} = require('./dm-util');

// For initial sync use the direct endpoint always because... Why not?
// May change in the future if there is a specific reason. Then a switch env var might be added.
const endpoint = DIRECT_DATABASE_ENDPOINT;
console.log(`Inital sync module loaded. Using endpoint:${endpoint}`);

/**
 * Dispatch the fetched information to a target graph.
 * @param { mu, muAuthSudo, fetch } lib - The provided libraries from the host service.
 * @param { termObjects } data - The fetched quad information, which objects of serialized Terms
 *          [ {
 *              graph: "<http://foo>",
 *              subject: "<http://bar>",
 *              predicate: "<http://baz>",
 *              object: "<http://boom>^^<http://datatype>"
 *            }
 *         ]
 * @return {void} Nothing
 */
async function dispatch(lib, data) {
    const { mu, muAuthSudo } = lib;
    const { termObjects } = data;

    // Steps:
    // 1. Write the triples to the landing zone graph - withouth any mapping or filtering
    // 2. One-time reasoning run with the full landing zone graph and write the results to the target graph (on-finish)
    console.log(`Using ${endpoint} to insert triples`);
    if (termObjects.length) {
        const originalInsertTriples = termObjects.map(o => `${o.subject} ${o.predicate} ${o.object}.`);
        // Insert into landing zone graph
        await batchedDbUpdate(
            muAuthSudo.updateSudo,
            DCR_LANDING_ZONE_GRAPH,
            originalInsertTriples,
            { 'mu-call-scope-id': MU_CALL_SCOPE_ID_INITIAL_SYNC },
            endpoint,
            BATCH_SIZE,
            MAX_DB_RETRY_ATTEMPTS,
            SLEEP_BETWEEN_BATCHES,
            SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
        );
    }
}

/**
 * A callback you can override to do extra manipulations
 *   after initial ingest.
 * @param { mu, muAuthSudo, fech } lib - The provided libraries from the host service.
 * @return {void} Nothing
 */
async function onFinishInitialIngest(lib) {
  console.log(`!! On-finish triggered.`);
  const {mu, muAuthSudo, fech} = lib
  // Move from ingest graph to public graph
  
  await moveToPublic(muAuthSudo.updateSudo, endpoint);
  await moveToOrganizationsGraph(muAuthSudo.updateSudo, endpoint); // Crash
  // Create mock login users
  await muAuthSudo.updateSudo(`
    ${prefixes}
    INSERT {
      GRAPH <http://mu.semte.ch/graphs/public> {
        ?persoon a foaf:Person;
                mu:uuid ?uuidPersoon;
                foaf:firstName ?classificatie;
                foaf:familyName ?naam;
                foaf:member ?bestuurseenheid;
                foaf:account ?account.
        ?account a foaf:OnlineAccount;
                mu:uuid ?uuidAccount;
                foaf:accountServiceHomepage <https://github.com/lblod/mock-login-service>;
                ext:sessionRole "DM-AdminUnitAdministratorRole" . 
      }
    }
    WHERE {
        ?bestuurseenheid a besluit:Bestuurseenheid;
          skos:prefLabel ?naam;
          mu:uuid ?adminUnitUuid;
          org:classification/skos:prefLabel ?classificatie.
        BIND(CONCAT(?classificatie, " ", ?naam) as ?volledigeNaam)
        BIND(MD5(?adminUnitUuid) as ?uuidPersoon)
        BIND(MD5(CONCAT(?adminUnitUuid,"ACCOUNT")) as ?uuidAccount)
        BIND(IRI(CONCAT("http://data.lblod.info/id/persoon/", ?uuidPersoon)) AS ?persoon)
        BIND(IRI(CONCAT("http://data.lblod.info/id/account/", ?uuidAccount)) AS ?account)
        BIND(IRI(CONCAT("http://mu.semte.ch/graphs/organizations/", ?adminUnitUuid)) AS ?g)
    }
  `, undefined, endpoint)

  // Fix identifiers?
  // Perhaps try query of Nordine. Perform research?
  // Groeispurt? 5 sprint in growth spurt
  // Last sprint is innovative sprint
  
}
  
module.exports = {
  dispatch,
  onFinishInitialIngest
};
