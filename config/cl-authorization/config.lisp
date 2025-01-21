;;;;;;;;;;;;;;;;;;;
;;; delta messenger
(in-package :delta-messenger)

(setf *delta-handlers* nil)
(add-delta-logger)
(add-delta-messenger "http://deltanotifier/")

;;;;;;;;;;;;;;;;;
;;; configuration
(in-package :client)
(setf *log-sparql-query-roundtrip* t)
(setf *backend* "http://triplestore:8890/sparql")

(in-package :server)
(setf *log-incoming-requests-p* t)

;;;;;;;;;;;;;;;;;
;;; access rights

(type-cache::add-type-for-prefix "http://mu.semte.ch/sessions/" "http://mu.semte.ch/vocabularies/session/Session")

(in-package :acl)

(defparameter *access-specifications* nil
  "All known ACCESS specifications.")

(defparameter *graphs* nil
  "All known GRAPH-SPECIFICATION instances.")

(defparameter *rights* nil
  "All known GRANT instances connecting ACCESS-SPECIFICATION to GRAPH.")


;;;;;;;;;;;
;; prefixes

(define-prefixes
  :org "http://www.w3.org/ns/org#"
  :locn "http://www.w3.org/ns/locn#"
  :schema "http://schema.org/"
  :regorg "http://www.w3.org/ns/regorg#"
  :person "http://www.w3.org/ns/person#"
  :vcard "http://www.w3.org/2006/vcard/ns#"
  :dbpedia "http://dbpedia.org/ontology/"
  :adms "http://www.w3.org/ns/adms#"
  :m8g "http://data.europa.eu/m8g/"
  :prov "http://www.w3.org/ns/prov#"
  :organisatie "https://data.vlaanderen.be/ns/organisatie#"
  :persoon "https://data.vlaanderen.be/ns/persoon#"
  :adres "https://data.vlaanderen.be/ns/adres#"
  :generiek "https://data.vlaanderen.be/ns/generiek#"
  :mandaat "http://data.vlaanderen.be/ns/mandaat#"
  :besluit "http://data.vlaanderen.be/ns/besluit#"
  :lblodlg "http://data.lblod.info/vocabularies/leidinggevenden/"
  :lblodorg "https://data.lblod.info/vocabularies/organisatie/"
  :lblodgeneriek "https://data.lblod.info/vocabularies/generiek/"
  :dc_terms "http://purl.org/dc/terms/"
  :foaf "http://xmlns.com/foaf/0.1/"
  :skos "http://www.w3.org/2004/02/skos/core#"
  :euvoc "http://publications.europa.eu/ontology/euvoc#"
  :ere "http://data.lblod.info/vocabularies/erediensten/"
  :ch "http://data.lblod.info/vocabularies/contacthub/"
  :code "http://lblod.data.gift/vocabularies/organisatie/"
  :ext "http://mu.semte.ch/vocabularies/ext/"
  :geo "http://www.opengis.net/ont/geosparql#"
  :nacebel "http://data.gift/vocabularies/nace-bel/"
  :dct "http://purl.org/dc/terms/"
  :time "http://www.w3.org/2006/time#"
  :datamonitoring "http://lblod.data.gift/vocabularies/datamonitoring/"
  :musession "http://mu.semte.ch/vocabularies/session/"
  :nfo "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#"
  :eli "http://data.europa.eu/eli/ontology#"
  :xsd "http://www.w3.org/2001/XMLSchema#")


(define-graph public ("http://mu.semte.ch/graphs/public")
  ("foaf:OnlineAccount" -> _)
  ("foaf:Person" -> _)
  ("ext:FileAddress" -> _)
  ("nfo:FileDataObject" -> _)
  ("prov:Location" -> _)
  ("besluit:Bestuurseenheid" -> _)
  ("org:Organization" -> _)
  ("ext:BestuurseenheidClassificatieCode" -> _)
  ("ext:BestuursorgaanClassificatieCode" -> _)
  ("euvoc:Country" -> _)
  ("eli:LegalResource" -> _)
  ("org:Role" -> _)
  ("skos:ConceptScheme" -> _)
  ("skos:Concept" -> _)
  ("m8g:PeriodOfTime" -> _)
  ("foaf:Document" -> _))

(define-graph sessions ("http://mu.semte.ch/graphs/sessions")
  ("musession:Session" -> _))

(define-graph data-monitoring ("http://mu.semte.ch/graphs/organizations/")
  ("besluit:Besluit" -> _)
  ("besluit:Bestuursorgaan" -> _)
  ("foaf:Person" -> _)
  ("adms:Identifier" -> _)
  ("dct:PeriodOfTime" -> _)
  ("schema:ContactPoint" -> _)
  ("locn:Address" -> _)
  ("datamonitoring:GoverningBodyCountReport" -> _)
  ("datamonitoring:PublicationCountReport" -> _)
  ("datamonitoring:AdminUnitCountReport" -> _)
  ("datamonitoring:LastHarvestingExecutionReport" -> _)
  ("datamonitoring:LastHarvestingExecutionRecord" -> _)
  ("org:Organization" -> _)
  ("besluit:Bestuurseenheid" -> _)
  ("code:BestuurseenheidClassificatieCode" -> _)
  ("code:OrganisatieStatusCode" -> _)
  ("prov:Location" -> _)
  ("foaf:OnlineAccount" -> _)
  )

(define-graph organization ("http://mu.semte.ch/graphs/organizations/")
  ("nfo:FileDataObject" -> _)
  ("foaf:Person" -> _)
  ("foaf:OnlineAccount" -> _)
  ("adms:Identifier" -> _))

;;;;;;;;;;;;;;;;;
;; allowed groups

(supply-allowed-group "public")

(supply-allowed-group "vendor"
  :parameters ("session_group" "session_role")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group ?session_role WHERE {
            <SESSION_ID> muAccount:canActOnBehalfOf/mu:uuid ?session_group;
                         muAccount:account/ext:sessionRole ?session_role.
          }")

(supply-allowed-group "authenticated"
  :parameters ()
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group ?session_role WHERE {
            <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                         ext:sessionRole ?session_role.
          }")

(supply-allowed-group "organization-member"
  :parameters ("session_group")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT ?session_group ?session_role WHERE {
            <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group.
          }")

(supply-allowed-group "datamonitoring-gebruiker"
  :parameters ("session_group" "session_role")
  :query "PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
          PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
          SELECT DISTINCT ?session_group ?session_role WHERE {
            <SESSION_ID> ext:sessionGroup/mu:uuid ?session_group;
                         ext:sessionRole ?session_role.
            FILTER( ?session_role = \"DMGEBRUIKER\" )
          }")

;;;;;;;;;;;;;;;;
;; access grants
(grant (read)
       :to-graph public
       :for-allowed-group "public")

(grant (read)
       :to-graph data-monitoring
       :for-allowed-group "vendor")

(grant (read)
       :to-graph public
       :for-allowed-group "authenticated")

(grant (read)
       :to-graph sessions
       :for-allowed-group "authenticated")

(grant (read)
       :to-graph organization
       :for-allowed-group "organization-member")

(grant (read write)
       :to-graph data-monitoring
       :for-allowed-group "datamonitoring-gebruiker")