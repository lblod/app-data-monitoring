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
  # match "/themes/*path", @json do
  #   Proxy.forward conn, path, "http://resource/themes/"
  # end
  #
  # Run `docker-compose restart dispatcher` after updating
  # this file.

  ###############
  # RESOURCES
  ###############
  get "/administrative-units/*path", @any do
    Proxy.forward conn, path, "http://resources/administrative-units/"
  end

  get "/administrative-unit-classification-codes/*path", @any do
    Proxy.forward conn, path, "http://resources/administrative-unit-classification-codes/"
  end

  get "/governing-bodies/*path", @any do
    Proxy.forward conn, path, "http://resources/governing-bodies/"
  end

  get "/governing-body-classification-codes/*path", @any do
    Proxy.forward conn, path, "http://resources/governing-body-classification-codes/"
  end

  get "/locations/*path", @any do
    Proxy.forward conn, path, "http://resources/locations/"
  end

  get "/sessions/*path", @any do
    Proxy.forward conn, path, "http://resources/sessions/"
  end

  match "/jobs/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/jobs/"
  end

  match "/tasks/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/tasks/"
  end

  match "/data-containers/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/data-containers/"
  end

  match "/job-errors/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/job-errors/"
  end

  match "/reports/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/reports/"
  end

  match "/administrative-units/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/administrative-units/"
  end

  match "/administrative-unit-classification-codes/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/administrative-unit-classification-codes/"
  end

  match "/organization-status-codes/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/organization-status-codes/"
  end

  match "/organizations/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/organizations/"
  end

  match "/identifiers/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/identifiers/"
  end

  match "/structured-identifiers/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/structured-identifiers/"
  end

  match "/addresses/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/addresses/"
  end

  match "/concepts/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/concepts/"
  end

  match "/locations/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resources/locations/"
  end

  match "/users/*path" do
    Proxy.forward conn, path, "http://resources/users/"
  end

  match "/accounts", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, [], "http://resource/accounts/"
  end

  match "/groups/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://resource/administrative-units/"
  end

  match "/accounts/*path", %{ accept: [:json], layer: :api} do
    Proxy.forward conn, path, "http://accountdetail/accounts/"
  end

  match "/mock/sessions/*path", %{ accept: [:any], layer: :api} do
    Proxy.forward conn, path, "http://mocklogin/sessions/"
  end

  ###############
  # SERVICES
  ###############

  # to generate uuids manually
  match "/uuid-generation/run/*_path", @json do
    Proxy.forward conn, [], "http://uuid-generation/run"
  end

  ###############
  # FRONTEND
  ###############
  match "/assets/*path", @any do
    Proxy.forward conn, path, "http://frontend/assets/"
  end

  match "/@appuniversum/*path", @any do
    Proxy.forward conn, path, "http://frontend/@appuniversum/"
  end

  match "/*_path", @html do
    Proxy.forward conn, [], "http://frontend/index.html"
  end

  ###############################################################
    # Login
  ###############################################################

  match "/sessions/*path" do
    Proxy.forward conn, path, "http://login/sessions/"
  end

  #################
  # NOT FOUND
  #################
  match "/*_", %{ last_call: true } do
    send_resp( conn, 404, "Route not found.  See config/dispatcher.ex" )
  end
end
