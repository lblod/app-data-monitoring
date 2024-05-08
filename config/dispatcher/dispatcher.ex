defmodule Dispatcher do
  use Matcher
  define_accept_types [
    html: [ "text/html", "application/xhtml+html" ],
    json: [ "application/json", "application/vnd.api+json", "application/sparql-results+json" ]
  ]

  @any %{}
  @json %{ accept: %{ json: true } }
  @html %{ accept: %{ html: true } }

  # In order to forward the 'themes' resource to the
  # resource service, use the following forward rule:
  #
  # match "/themes/*path", _ do
  #   forward conn, path, "http://resource/themes/"
  # end
  #
  # Run `docker-compose restart dispatcher` after updating
  # this file.

  ###############
  # resource
  ###############
  get "/administrative-units/*path", _ do
    forward conn, path, "http://resource/administrative-units/"
  end

  get "/administrative-unit-classification-codes/*path", _ do
    forward conn, path, "http://resource/administrative-unit-classification-codes/"
  end

  get "/governing-bodies/*path", _ do
    forward conn, path, "http://resource/governing-bodies/"
  end

  get "/governing-body-classification-codes/*path", _ do
    forward conn, path, "http://resource/governing-body-classification-codes/"
  end

  get "/locations/*path", _ do
    forward conn, path, "http://resource/locations/"
  end

  get "/sessions/*path", _ do
    forward conn, path, "http://resource/sessions/"
  end

  match "/jobs/*path", _ do
    forward conn, path, "http://resource/jobs/"
  end

  match "/tasks/*path", _ do
    forward conn, path, "http://resource/tasks/"
  end

  match "/data-containers/*path", _ do
    forward conn, path, "http://resource/data-containers/"
  end

  match "/job-errors/*path", _ do
    forward conn, path, "http://resource/job-errors/"
  end

  match "/reports/*path", _ do
    forward conn, path, "http://resource/reports/"
  end

  match "/administrative-units/*path", _ do
    forward conn, path, "http://resource/administrative-units/"
  end

  match "/administrative-unit-classification-codes/*path", _ do
    forward conn, path, "http://resource/administrative-unit-classification-codes/"
  end

  match "/organization-status-codes/*path", _ do
    forward conn, path, "http://resource/organization-status-codes/"
  end

  match "/organizations/*path", _ do
    forward conn, path, "http://resource/organizations/"
  end

  match "/identifiers/*path", _ do
    forward conn, path, "http://resource/identifiers/"
  end

  match "/structured-identifiers/*path", _ do
    forward conn, path, "http://resource/structured-identifiers/"
  end

  match "/addresses/*path", _ do
    forward conn, path, "http://resource/addresses/"
  end

  match "/concepts/*path", _ do
    forward conn, path, "http://resource/concepts/"
  end

  match "/locations/*path", _ do
    forward conn, path, "http://resource/locations/"
  end

  match "/users/*path" do
    forward conn, path, "http://resource/users/"
  end

  match "/accounts", _ do
    forward conn, [], "http://resource/accounts/"
  end

  match "/accounts/*path", _ do
    forward conn, path, "http://accountdetail/accounts/"
  end

  match "/groups/*path", _ do
    forward conn, path, "http://resource/administrative-units/"
  end

  match "/mock/sessions/*path", _ do
    forward conn, path, "http://mocklogin/sessions/"
  end

  ###############
  # SERVICES
  ###############

  # to generate uuids manually
  match "/uuid-generation/run/*_path", _ do
    forward conn, [], "http://uuid-generation/run"
  end

  ###############
  # FRONTEND
  ###############
  match "/assets/*path", _ do
    forward conn, path, "http://frontend/assets/"
  end

  match "/@appuniversum/*path", _ do
    forward conn, path, "http://frontend/@appuniversum/"
  end

  match "/*_path", _ do
    forward conn, [], "http://frontend/index.html"
  end

  ###############################################################
    # Login
  ###############################################################

  match "/sessions/*path", _ do
    forward conn, path, "http://login/sessions/"
  end

  #################
  # NOT FOUND
  #################
  match "/*_", %{ last_call: true } do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end
end
