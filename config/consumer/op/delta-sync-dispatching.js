const {
    deleteFromPublicGraph,
    insertIntoPublicGraph,
    deleteFromSpecificGraphs,
    insertIntoSpecificGraphs
  } = require('./util');

  /**
  * Dispatch the fetched information to a target graph.
  * Note: <share://file/data> will be ADDED to it's own graph.
  *   We take only care of adding them, not updating triples, this is a TODO
  * @param { mu, muAuthSudo } lib - The provided libraries from the host service.
  * @param { termObjectChangeSets: { deletes, inserts } } data - The fetched changes sets, which objects of serialized Terms
  *          [ {
  *              graph: "<http://foo>",
  *              subject: "<http://bar>",
  *              predicate: "<http://baz>",
  *              object: "<http://boom>^^<http://datatype>"
  *            }
  *         ]
  * @return {void} Nothing
  */

  const publicTypes = [
    '<http://lblod.data.gift/vocabularies/organisatie/BestuurseenheidClassificatieCode>',
    '<http://lblod.data.gift/vocabularies/organisatie/TypeVestiging>',
    '<http://data.vlaanderen.be/ns/besluit#Bestuurseenheid>',
    '<http://www.w3.org/2004/02/skos/core#Concept>',
    '<http://publications.europa.eu/ontology/euvoc#Country>',
    '<http://www.w3.org/ns/prov#Location>',
    'http://www.w3.org/ns/org#Site',
    'http://schema.org/ContactPoint',
    '<http://www.w3.org/ns/org#ChangeEvent>',
    '<http://lblod.data.gift/vocabularies/organisatie/VeranderingsgebeurtenisResultaat>',
    '<http://lblod.data.gift/vocabularies/organisatie/Veranderingsgebeurtenis>',
    '<http://data.lblod.info/vocabularies/erediensten/BestuurVanDeEredienst>',
    '<http://data.lblod.info/vocabularies/erediensten/CentraalBestuurVanDeEredienst>',
    '<http://lblod.data.gift/vocabularies/organisatie/TypeEredienst>'
  ]

  const avoidPredicates = [
    '<http://www.w3.org/ns/org#hasSite>'
  ]
  async function dispatch(lib, data) {
    const { mu, fetch } = lib;
    let { termObjectChangeSets, termObjectChangeSetsWithContext } = data;

    // Both arrays are the same length, so we can zip them together for easier processing
    zippedChangeSets = termObjectChangeSets.map((o, i) => ({
      original: o,
      withContext: termObjectChangeSetsWithContext && termObjectChangeSetsWithContext[i]
    }));

    console.log(`Received ${zippedChangeSets.length} change sets`)

    for (let { original, withContext } of zippedChangeSets) {
      const insertsOnPublic = [];
      const insertsOnGraphs = {};
      for (let insert of original.inserts) {
        const subject = insert.subject;
        const contextTriples = withContext.inserts.filter((context) => context.subject === subject);
        const graphTriple = contextTriples.find((context) => context.predicate === '<http://mu.semte.ch/vocabularies/ext/goesInGraph>' && context.object !== '<http://mu.semte.ch/graphs/system/landingzone>')
        const otherContextTriples = withContext.inserts.filter((context) => context.predicate !== '<http://mu.semte.ch/vocabularies/ext/goesInGraph>' && context.predicate !== '<http://mu.semte.ch/vocabularies/ext/contextDataGoesInGraph>' && !(context.subject === subject && context.predicate === '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'));
        if (graphTriple) {
          const graph = graphTriple.object.slice(1, -1); // We have to slice it to remove the "<" and ">"
          if (!insertsOnGraphs[graph]) {
            insertsOnGraphs[graph] = [`${insert.subject} ${insert.predicate} ${insert.object}.`]
          } else {
            insertsOnGraphs[graph].push(`${insert.subject} ${insert.predicate} ${insert.object}.`)
          }
          for (let triple of otherContextTriples) {
            insertsOnGraphs[graph].push(`${triple.subject} ${triple.predicate} ${triple.object}.`)
          }
        }
        const typeTriple = contextTriples.find((context) => context.subject === subject && context.predicate === '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>');
        if (typeTriple) {
          const type = typeTriple.object;
          if (publicTypes.includes(type)) {
            if (!avoidPredicates.includes(insert.predicate)) {
              insertsOnPublic.push(`${insert.subject} ${insert.predicate} ${insert.object}.`)
            }
            //For the case where the subject is an admin unit but everything else must go in private graph
            const contextGraphTriple = contextTriples.find((context) => context.predicate === '<http://mu.semte.ch/vocabularies/ext/contextDataGoesInGraph>' && context.object !== '<http://mu.semte.ch/graphs/system/landingzone>')
            for (let triple of otherContextTriples) {
              if (contextGraphTriple) {
                if (avoidPredicates.includes(triple.predicate)) continue;
                const graph = contextGraphTriple.object.slice(1, -1);
                if (!insertsOnGraphs[graph]) {
                  insertsOnGraphs[graph] = [`${triple.subject} ${triple.predicate} ${triple.object}.`]
                } else {
                  insertsOnGraphs[graph].push(`${triple.subject} ${triple.predicate} ${triple.object}.`)
                }
              } else {
                insertsOnPublic.push(`${triple.subject} ${triple.predicate} ${triple.object}.`)
              }
            }
          }
        }
      }
      const deletesOnPublic = [];
      const deletesOnGraphs = {};
      for (let deletion of original.deletes) {
        const subject = deletion.subject;
        const contextTriples = withContext.deletes.filter((context) => context.subject === subject);
        const graphTriple = contextTriples.find((context) => context.predicate === '<http://mu.semte.ch/vocabularies/ext/goesInGraph>' && context.object !== '<http://mu.semte.ch/graphs/system/landingzone>')
        const otherContextTriples = withContext.deletes.filter((context) => context.predicate !== '<http://mu.semte.ch/vocabularies/ext/goesInGraph>' && context.predicate !== '<http://mu.semte.ch/vocabularies/ext/contextDataGoesInGraph>' && !(context.subject === subject && context.predicate === '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'));
        if (graphTriple) {
          const graph = graphTriple.object.slice(1, -1); // We have to slice it to remove the "<" and ">"
          if (!deletesOnGraphs[graph]) {
            deletesOnGraphs[graph] = [`${deletion.subject} ${deletion.predicate} ${deletion.object}.`]
          } else {
            deletesOnGraphs[graph].push(`${deletion.subject} ${deletion.predicate} ${deletion.object}.`)
          }
          for (let triple of otherContextTriples) {
            deletesOnGraphs[graph].push(`${triple.subject} ${triple.predicate} ${triple.object}.`)
          }
        }
        const typeTriple = contextTriples.find((context) => context.subject === subject && context.predicate === '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>');
        if (!typeTriple) continue;
        const type = typeTriple.object;
        if (publicTypes.includes(type)) {
          deletesOnPublic.push(`${deletion.subject} ${deletion.predicate} ${deletion.object}.`)
          for (let triple of otherContextTriples) {
            deletesOnPublic.push(`${triple.subject} ${triple.predicate} ${triple.object}.`)
          }
        }
      }

      await deleteFromPublicGraph(lib, deletesOnPublic);
      await deleteFromSpecificGraphs(lib, deletesOnGraphs);
      await insertIntoPublicGraph(lib, insertsOnPublic);
      await insertIntoSpecificGraphs(lib, insertsOnGraphs);

    }
  }

  module.exports = {
    dispatch
  };