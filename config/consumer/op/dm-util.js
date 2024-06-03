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
} = require('./dm-config');

const prefixes = `
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
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ext:<http://mu.semte.ch/vocabularies/ext/>
`
/**
 * Batched db funtion copied from delta-notifier single graph util
 * @param {(string):Promise<void>} muUpdate 
 * @param {string} graph 
 * @param {object[]} triples 
 * @param {object} extraHeaders 
 * @param {string} endpoint 
 * @param {number} batchSize 
 * @param {number} maxAttempts 
 * @param {number} sleepBetweenBatches 
 * @param {number} sleepTimeOnFail 
 * @param {string} operation 
 */
async function batchedDbUpdate(
  muUpdate,
  graph,
  triples,
  extraHeaders,
  endpoint,
  batchSize,
  maxAttempts,
  sleepBetweenBatches = 1000,
  sleepTimeOnFail = 1000,
  operation = 'INSERT'
) {
  for (let i = 0; i < triples.length; i += batchSize) {
    console.log(`Inserting triples in batch: ${i}-${i + batchSize}`);

    const batch = triples.slice(i, i + batchSize).join('\n');

    const insertCall = async () => {
      await muUpdate(`
${operation} DATA {
GRAPH <${graph}> {
${batch}
}
}
`, extraHeaders, endpoint);
    };

    await operationWithRetry(insertCall, 0, maxAttempts, sleepTimeOnFail);

    console.log(`OK. Sleeping before next query execution: ${sleepBetweenBatches}`);
    await new Promise(r => setTimeout(r, sleepBetweenBatches));
  }
}

async function operationWithRetry(callback,
  attempt,
  maxAttempts,
  sleepTimeOnFail) {
  try {
    if (typeof callback === "function")
      return await callback();
    else // Catch error from promise - not how I would do it normally, but allows re use of existing code.
      return await callback;
  }
  catch (e) {
    console.log(`Operation failed for ${callback.toString()}, attempt: ${attempt} of ${maxAttempts}`);
    console.log(`Error: ${e}`);
    console.log(`Sleeping ${sleepTimeOnFail} ms`);

    if (attempt >= maxAttempts) {
      console.log(`Max attempts reached for ${callback.toString()}, giving up`);
      throw e;
    }

    await new Promise(r => setTimeout(r, sleepTimeOnFail));
    return operationWithRetry(callback, ++attempt, maxAttempts, sleepTimeOnFail);
  }
}


async function insertIntoPublicGraph(lib, statements) {
  console.log(`Inserting ${statements.length} statements into public graph`);

  await batchedDbUpdate(
    lib.muAuthSudo.updateSudo,
    'http://mu.semte.ch/graphs/public',
    statements,
    {},
    MU_SPARQL_ENDPOINT,
    BATCH_SIZE,
    MAX_DB_RETRY_ATTEMPTS,
    SLEEP_BETWEEN_BATCHES,
    SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
    'INSERT');
}

async function insertIntoSpecificGraphs(lib, statementsWithGraphs) {

  for( let graph in statementsWithGraphs) {
    console.log(`Inserting ${statementsWithGraphs[graph].length} statements into ${graph} graph`);
    await batchedDbUpdate(
      lib.muAuthSudo.updateSudo,
      graph,
      statementsWithGraphs[graph],
      {},
      MU_SPARQL_ENDPOINT,
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      'INSERT');
  }
  
}

async function deleteFromPublicGraph(lib, statements) {
  console.log(`Deleting ${statements.length} statements from public graph`);

  await batchedDbUpdate(
    lib.muAuthSudo.updateSudo,
    'http://mu.semte.ch/graphs/public',
    statements,
    {},
    MU_SPARQL_ENDPOINT,
    BATCH_SIZE,
    MAX_DB_RETRY_ATTEMPTS,
    SLEEP_BETWEEN_BATCHES,
    SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
    'DELETE');
}

async function deleteFromSpecificGraphs(lib, statementsWithGraphs) {
  for( let graph in statementsWithGraphs) {
    console.log(`Deleting ${statementsWithGraphs[graph].length} statements from ${graph} graph`);
    await batchedDbUpdate(
      lib.muAuthSudo.updateSudo,
      graph,
      statementsWithGraphs[graph],
      {},
      MU_SPARQL_ENDPOINT,
      BATCH_SIZE,
      MAX_DB_RETRY_ATTEMPTS,
      SLEEP_BETWEEN_BATCHES,
      SLEEP_TIME_AFTER_FAILED_DB_OPERATION,
      'DELETE');
  }
}

async function moveToPublic(muUpdate, endpoint, limited) {
  console.log('moving to public')
  await moveTypeToPublic(muUpdate, endpoint, 'code:BestuurseenheidClassificatieCode')
  await moveAdminUnitsToPublic(muUpdate, endpoint, limited)
  await moveTypeToPublic(muUpdate, endpoint, 'besluit:Bestuursorgaan')
  await moveTypeToPublic(muUpdate, endpoint, 'skos:Concept')
  await moveTypeToPublic(muUpdate, endpoint, 'euvoc:Country')
  await moveTypeToPublic(muUpdate, endpoint, 'prov:Location')
  await moveTypeToPublic(muUpdate, endpoint, 'code:OrganisatieStatusCode')
}

/**
 * Similar to moveTypeToPublic but special filter for admin units and only applied if the last parameter limit is true.
 * @param { any } muUpdate 
 * @param { any } endpoint 
 * @param { boolean } limit 
 */
async function moveAdminUnitsToPublic(muUpdate, endpoint, limit) {
  if (!limit) {
    await moveTypeToPublic(muUpdate, endpoint, 'besluit:Bestuurseenheid');
    return;
  }
  await muUpdate(`
    ${prefixes}
    DELETE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?subject a besluit:Bestuurseenheid;
          ?pred ?obj.
      }
    }
    INSERT {
      GRAPH <http://mu.semte.ch/graphs/public> {
        ?subject a besluit:Bestuurseenheid;
          ?pred ?obj.
      }
    }
    WHERE {
      VALUES (?classification ?classificationLabel) {
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000001> "Gemeente")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000000> "Provincie")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/36a82ba0-7ff1-4697-a9dd-2e94df73b721> "Autonoom gemeentebedrijf")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/80310756-ce0a-4a1b-9b8e-7c01b6cc7a2d> "Autonoom provinciebedrijf")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000002> "OCMW")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000003> "District")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/a3922c6d-425b-474f-9a02-ffb71a436bfc> "Politiezone")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/2ad46df5-5c79-4d67-84d5-604c1377231e> "PEVA gemeente")
        ( <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/088784b6-e188-48bf-b94f-94665f9e1f53> "PEVA provincie")
      }
      ?subject a besluit:Bestuurseenheid;
        org:classification ?classification;
        ?pred ?obj.
    }
  `, undefined, endpoint);
  console.log(`MOVE TO PUBLIC SUCCEEDED!!! Successfully moved  besluit:Bestuurseenheid limited to specific classes.`)
}

async function moveTypeToPublic(muUpdate, endpoint, type) {
  await muUpdate(`
    ${prefixes}
    DELETE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?subject a ${type};
          ?pred ?obj.
      }
    }
    INSERT {
      GRAPH <http://mu.semte.ch/graphs/public> {
        ?subject a ${type};
          ?pred ?obj.
      }
    }
    WHERE {
      ?subject a ${type};
          ?pred ?obj.
    }
  `, undefined, endpoint);
  console.log(`MOVE TO PUBLIC SUCCEEDED!!! Successfully moved ${type}`)
}

async function moveToOrganizationsGraph(muUpdate, endpoint) {

  //Move identifiers
  await muUpdate(`
    ${prefixes}
    DELETE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?identifier a adms:Identifier;
        mu:uuid ?uuid;
          skos:notation ?idName;
          generiek:gestructureerdeIdentificator ?structuredId.
      }
    }
    INSERT {
      GRAPH ?g {
        ?identifier a adms:Identifier;
        mu:uuid ?uuid;
          skos:notation ?idName;
          generiek:gestructureerdeIdentificator ?structuredId.
      }
    }
    WHERE {
      ?adminUnit adms:identifier ?identifier.
      ?adminUnit mu:uuid ?adminUnitUuid.
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?identifier a adms:Identifier;
          mu:uuid ?uuid;
            skos:notation ?idName;
            generiek:gestructureerdeIdentificator ?structuredId.
      }
      BIND(IRI(CONCAT("http://mu.semte.ch/graphs/organizations/", ?adminUnitUuid)) AS ?g)

    }
  `, undefined, endpoint)

  //Move identifiers
  await muUpdate(`
    ${prefixes}
    DELETE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?structuredId a generiek:GestructureerdeIdentificator;
          mu:uuid ?structuredUuid;
          generiek:lokaleIdentificator ?localId.
      }
    }
    INSERT {
      GRAPH ?g {
        ?structuredId a generiek:GestructureerdeIdentificator;
          mu:uuid ?structuredUuid;
          generiek:lokaleIdentificator ?localId.
      }
    }
    WHERE {
      GRAPH ?g {
        ?identifier generiek:gestructureerdeIdentificator ?structuredId.
      }
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?structuredId a generiek:GestructureerdeIdentificator;
          mu:uuid ?structuredUuid;
          generiek:lokaleIdentificator ?localId.
      }
    }
  `, undefined, endpoint)

  //Move worships to assure everyone gets also the type besturseenheid and organization
  await muUpdate(`
    ${prefixes}
    DELETE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?subject a ?type;
          ?pred ?obj.
          
      }
    }
    INSERT {
      GRAPH <http://mu.semte.ch/graphs/public> {
        ?subject a ?type;
          a besluit:Bestuurseenheid;
          ?pred ?obj.
      }
    }
    WHERE {
      GRAPH <${LANDING_ZONE_GRAPH}> {
        ?subject a ?type;
            ?pred ?obj.
        VALUES ?type { <http://data.lblod.info/vocabularies/erediensten/BestuurVanDeEredienst> <http://data.lblod.info/vocabularies/erediensten/CentraalBestuurVanDeEredienst> }
      }
    }
  `, undefined, endpoint)

  //Create mock users
  await muUpdate(`
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
      GRAPH ?g {
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
}

module.exports = {
  batchedDbUpdate,
  moveToPublic,
  insertIntoPublicGraph,
  deleteFromPublicGraph,
  insertIntoSpecificGraphs,
  deleteFromSpecificGraphs,
  moveToOrganizationsGraph,
  prefixes,
};