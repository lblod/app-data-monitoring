const DCR_LANDING_ZONE_GRAPH = process.env.DCR_LANDING_ZONE_GRAPH;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 1000;
const MU_CALL_SCOPE_ID_INITIAL_SYNC = process.env.MU_CALL_SCOPE_ID_INITIAL_SYNC || 'http://redpencil.data.gift/id/concept/muScope/deltas/consumer/initialSync';
const MAX_DB_RETRY_ATTEMPTS = parseInt(process.env.MAX_DB_RETRY_ATTEMPTS || 5);
const SLEEP_BETWEEN_BATCHES = parseInt(process.env.SLEEP_BETWEEN_BATCHES || 100);
const SLEEP_TIME_AFTER_FAILED_DB_OPERATION = parseInt(process.env.SLEEP_TIME_AFTER_FAILED_DB_OPERATION || 60000);
const LANDING_ZONE_DATABASE = process.env.DCR_LANDING_ZONE_DATABASE || 'database';
const LANDING_ZONE_DATABASE_ENDPOINT = process.env.DCR_LANDING_ZONE_DATABASE_ENDPOINT || `http://${LANDING_ZONE_DATABASE}:8890/sparql`;


if (!DCR_LANDING_ZONE_GRAPH) {
    throw new Error("Lading zone graph env var not specified. The landing zonde graph is where the init ingest triples are buffered before further copying and mock-login accont generation.")
}

module.exports = {
    DCR_LANDING_ZONE_GRAPH,
    BATCH_SIZE,
    MU_CALL_SCOPE_ID_INITIAL_SYNC,
}
