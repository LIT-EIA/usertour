# Mirrors what's configured in the Coder dashboard's template editor
# "Modules" tab (source of truth is the dashboard, not `coder templates
# push` against this repo - see the note in main.tf). Kept here too so the
# module's config is visible/diffable alongside main.tf instead of only
# living in the dashboard.
module "code-server" {
  count    = data.coder_workspace.me.start_count
  source   = "registry.coder.com/coder/code-server/coder"
  version  = "1.5.0"
  agent_id = coder_agent.main.id
  # --disable-proxy used to be set here to stop code-server proxying
  # forwarded ports itself (avoiding double-proxying through both
  # code-server and the Coder Agent). It's removed because it also disables
  # code-server's /proxy/<port>/ route entirely, which is what the VS Code
  # "Ports" tab's Open in Browser/preview actions depend on - with it set,
  # those actions 403. The dedicated coder_app.usertour link in main.tf
  # remains the fast, single-hop path to the app; the Ports tab is now a
  # working but double-proxied (slower) fallback for ad hoc port access.
  additional_args         = "--disable-workspace-trust"
  auto_install_extensions = false
  extensions_dir          = ""
  folder                  = "/app"
  install_version         = ""
  offline                 = false
  open_in                 = "tab"
  port                    = 13337
  use_cached              = false
  use_cached_extensions   = false
  workspace               = ""
  # code-server's own IDE session is a separate coder_app the module
  # creates internally. subdomain = true requires --wildcard-access-url on
  # the Coder server (a wildcard DNS/TLS record for app subdomains, e.g. via
  # a Cloudflare Tunnel on a real domain - see coder_app.usertour in main.tf
  # for the same setting).
  subdomain = true

  # See var.code_server_extensions / local.code_server_settings in main.tf -
  # the module installs these itself, so nothing in main.tf's own startup
  # script needs to touch code-server directly.
  extensions = var.code_server_extensions
  settings   = local.code_server_settings
}

# The dedicated route for the app itself (nginx on :80) is
# coder_app.usertour in main.tf - that's still the fast, single-hop path
# (subdomain = true there routes it through Coder's own wildcard-subdomain
# proxy directly, not through code-server). The Ports tab in code-server
# now also works for reaching port 80 (or any other port) via
# code-server's own /proxy/<port>/ route, but that's a second hop on top
# of the Coder Agent proxy, so prefer the coder_app link when possible.
