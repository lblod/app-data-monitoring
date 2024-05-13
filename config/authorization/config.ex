alias Acl.Accessibility.Always, as: AlwaysAccessible
alias Acl.Accessibility.ByQuery, as: AccessByQuery
alias Acl.GraphSpec.Constraint.ResourceFormat, as: ResourceFormatConstraint
alias Acl.GraphSpec.Constraint.Resource, as: ResourceConstraint
alias Acl.GraphSpec, as: GraphSpec
alias Acl.GroupSpec, as: GroupSpec
alias Acl.GroupSpec.GraphCleanup, as: GraphCleanup
alias Acl.GraphSpec.Constraint.Resource.NoPredicates, as: NoPredicates
alias Acl.GraphSpec.Constraint.Resource.AllPredicates, as: AllPredicates

defmodule Acl.UserGroups.Config do
  def user_groups do
    # These elements are walked from top to bottom.  Each of them may
    # alter the quads to which the current query applies.  Quads are
    # represented in three sections: current_source_quads,
    # removed_source_quads, new_quads.  The quads may be calculated in
    # many ways.  The useage of a GroupSpec and GraphCleanup are
    # common.
    [
      # PUBLIC: Minimal. App not intented for general public
      %GroupSpec{
        name: "public",
        useage: [:read,:read_for_write, :write],
        access: %AlwaysAccessible{}, # TODO: Should be only for logged in users
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/public",
            constraint: %ResourceConstraint{
                resource_types: [
                  "http://xmlns.com/foaf/0.1/OnlineAccount",
                  "http://xmlns.com/foaf/0.1/Person",
                ]
              }
            },
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/sessions",
            constraint: %ResourceFormatConstraint{
                resource_prefix: "http://mu.semte.ch/sessions/",
              }
          }
        ]
      },
      # Local government administrator group spec
      # Local governments need to be able to check their own data monitoring reports
      %GroupSpec{
        name: "admin-unit-admin-users",
        useage: [:read, :write, :read_for_write],
        access: %AccessByQuery{
          vars: ["session_group_uuid"],
          query: """
            PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT DISTINCT ?session_group WHERE {
              <SESSION_ID>
                ext:sessionGroup/mu:uuid ?session_group_uuid;
                ext:sessionRole \"DM-AdminUnitAdministratorRole\".
              }
          """
        },
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/dm-reports",
            constraint: %ResourceConstraint{
              resource_types: [
                "http://xmlns.com/foaf/0.1/OnlineAccount",
                "http://xmlns.com/foaf/0.1/Person",
                "http://data.vlaanderen.be/ns/besluit#Bestuurseenheid",
                "http://www.w3.org/ns/org#Organization",
                "http://lblod.data.gift/vocabularies/organisatie/TypeVestiging",
                "http://lblod.data.gift/vocabularies/organisatie/BestuurseenheidClassificatieCode",
                "http://lblod.data.gift/vocabularies/organisatie/OrganisatieStatusCode",
                "http://www.w3.org/2004/02/skos/core#Concept",
                "http://www.w3.org/2004/02/skos/core#ConceptScheme",
                "http://publications.europa.eu/ontology/euvoc#Country",
                "http://www.w3.org/ns/prov#Location",
                "http://lblod.data.gift/vocabularies/datamonitoring/GoverningBodyCountReport",
                "http://lblod.data.gift/vocabularies/datamonitoring/Count",
                "http://lblod.data.gift/vocabularies/datamonitoring/AdminUnitCountReport"
              ]
            },
          },
        ],
      },
      # ABB administrator group spec
      # ABB administrators need to be able to access all local gov related reports as well as reports on the admin level
      %GroupSpec{
        name: "abb-admin-users",
        useage: [:read, :write, :read_for_write],
        access:  %AccessByQuery{
          vars: ["session_group_uuid"],
          query: """
            PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
            PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
            SELECT DISTINCT ?session_group WHERE {
              <SESSION_ID>
                ext:sessionGroup/mu:uuid ?session_group_uuid;
                ext:sessionRole \"DM-AbbAdministratorRole\".
            }
          """
        },
        graphs: [
          %GraphSpec{
            graph: "http://mu.semte.ch/graphs/dm-reports-overview"
          }
        ], # No restrictions
      },
      %GraphCleanup{
        originating_graph: "http://mu.semte.ch/application",
        useage: [:write],
        name: "clean"
      },
    ]
  end
end
