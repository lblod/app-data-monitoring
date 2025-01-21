const { batchedDbUpdate, moveToOrganizationsGraph, moveToPublic, transformLandingZoneGraph } = require('./util');
const {
  BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES,
  DIRECT_DATABASE_ENDPOINT,
  MU_CALL_SCOPE_ID_INITIAL_SYNC,
  BATCH_SIZE,
  MAX_DB_RETRY_ATTEMPTS,
  SLEEP_BETWEEN_BATCHES,
  SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
  LANDING_ZONE_GRAPH,
} = require('./config');

const endpoint = BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES ? DIRECT_DATABASE_ENDPOINT : process.env.MU_SPARQL_ENDPOINT;

/**
* Dispatch the fetched information to a target graph.
* @param { mu, muAuthSudo } lib - The provided libraries from the host service.
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
  // 1. Write the triples to the landing zone graph - without any mapping or filtering
  // 2. One-time reasoning run with the full landing zone graph and write the results to the target graph (on-finish)

  if (BYPASS_MU_AUTH_FOR_EXPENSIVE_QUERIES) {
    console.warn(`Service configured to skip MU_AUTH!`);
  }
  console.log(`Using ${endpoint} to insert triples`);

  if (termObjects.length) {
    const originalInsertTriples = termObjects.map(o => `${o.subject} ${o.predicate} ${o.object}.`);

    await batchedDbUpdate(
      muAuthSudo.updateSudo,
      LANDING_ZONE_GRAPH,
      originalInsertTriples,
      { 'mu-call-scope-id': MU_CALL_SCOPE_ID_INITIAL_SYNC },
      endpoint,
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION
    );
  }
}

async function onFinishInitialIngest(lib) {
  const { muAuthSudo } = lib;

  console.log(`!! On-finish triggered !!`);

  // DISABLE REASONER if there is an issue and run manual-query-reasoning-service.sparql instead
  //
  // const transformedMainInsertTriples = await transformLandingZoneGraph(fetch, endpoint);
  // console.log(`Transformed ${transformedMainInsertTriples.length} main triples`);
  //
  // if (transformedMainInsertTriples.length) {
  //   await batchedDbUpdate(
  //     muAuthSudo.updateSudo,
  //     LANDING_ZONE_GRAPH,
  //     transformedMainInsertTriples,
  //     { 'mu-call-scope-id': MU_CALL_SCOPE_ID_INITIAL_SYNC },
  //     endpoint,
  //     BATCH_SIZE,
  //     MAX_DB_RETRY_ATTEMPTS,
  //     SLEEP_BETWEEN_BATCHES,
  //     SLEEP_TIME_AFTER_FAILED_DB_OPERATION
  //   );
  // }

  await moveToPublic(muAuthSudo.updateSudo, endpoint)
  await moveToOrganizationsGraph(muAuthSudo.updateSudo, endpoint);
}

module.exports = {
  dispatch,
  onFinishInitialIngest
};