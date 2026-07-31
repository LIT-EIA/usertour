### Coder template for Usertour
#
# Recreates the services defined in docker-compose.yml (postgres, redis, app)
# using the Terraform docker provider, and runs the Coder agent + code-server
# *inside* the `app` container itself (not a sidecar), so code-server is attached
# to the exact container nginx/node run in.
#
# This template is deployed via manually-created files in the Coder dashboard's
# template editor, not `coder templates push` against a checked-out repo. That
# means this file cannot read local files (no Dockerfile/.env/pnpm-lock.yaml
# access - the kreuzwerker/docker provider's docker_image build.context is also
# local-PATH-only, it does not support a remote git URL). So instead of building
# a custom image, the app container:
#   1. starts from node:22.13-slim (Debian/glibc - NOT the Dockerfile's alpine
#      base; the code-server module's standalone install bundles a Node
#      binary built for glibc, which cannot run on musl/Alpine even with
#      libc6-compat installed - that only shims simple symbols, not the real
#      ABI a Node binary needs. Prisma's schema.prisma has "native" in
#      binaryTargets, so it auto-detects and generates the right glibc engine
#      when `pnpm install` runs on this image - no override needed there.)
#   2. installs the same system/npm packages the Dockerfile installs (apt
#      instead of apk)
#   3. clones https://github.com/LIT-EIA/usertour.git (branch dev-container,
#      public repo, no auth needed) into /app on first start
#   4. runs pnpm install + the repo's own scripts/start.sh (which is fetched by
#      the clone, so its content doesn't need to be duplicated here)
# /app is on a persistent volume so edits, .env copies, and node_modules survive
# a workspace stop/start instead of being re-cloned/reinstalled from scratch.
#
# Assumptions / caveats:
# - The provisioner needs access to the Docker socket (mount
#   /var/run/docker.sock into it, same as any docker-based Coder deployment).
# - First workspace start is slow (git clone + apt install + pnpm install all
#   run live); subsequent starts reuse the /app volume and skip pnpm install
#   if node_modules already exists.
# - Host port publishing is off by default (`expose_host_port`) so multiple
#   workspaces don't fight over the same host port; use the generated coder_app
#   link to reach the running app instead. Set expose_host_port = true (and
#   adjust host_port / code_server_host_port if they collide with another
#   workspace) to publish the app (:80) and code-server (:13337) straight to
#   the docker host, bypassing Coder's proxy entirely - useful for isolating
#   whether slowness is coming from Coder's proxy or elsewhere.
# - This file intentionally does NOT declare the code-server module. Add it via
#   the Coder dashboard's template editor "Modules" tab (it writes its own
#   modules.tf, source `registry.coder.com/coder/code-server/coder`) and set its
#   `folder` field to `/app` so it opens on the right directory.

terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
      version = ">= 2.1"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "coder" {}

# Assumes the provisioner has access to the docker host's socket.
provider "docker" {}

variable "git_repo_url" {
  description = "Public repo to clone into the app container."
  type        = string
  default     = "https://github.com/LIT-EIA/usertour.git"
}

variable "git_ref" {
  description = "Branch to clone."
  type        = string
  default     = "dev-container"
}

variable "expose_host_port" {
  description = "Publish the app's port 80 to a host port (off by default to avoid conflicts across workspaces)."
  type        = bool
  default     = false
}

variable "host_port" {
  description = "Host port to publish for the app (nginx :80) when expose_host_port is true."
  type        = number
  default     = 8011
}

variable "code_server_host_port" {
  description = "Host port to publish for code-server (:13337) when expose_host_port is true - lets you hit the IDE directly, bypassing Coder's proxy entirely, to A/B against the proxied route for latency."
  type        = number
  default     = 8012
}

variable "code_server_theme" {
  description = "Default VS Code color theme for code-server (workbench.colorTheme)."
  type        = string
  default     = "Dark 2026"
}

variable "code_server_extensions" {
  description = "Extension IDs to install by default in code-server. Consumed by the code-server module's own `extensions` argument (see modules.tf) - the module installs these itself, so nothing in this file needs to."
  type        = list(string)
  default = [
    "redis.redis-for-vscode",
    "microsoft.cursor-pgsql",
    "eamodio.gitlens",
  ]
}

data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

locals {
  name_prefix  = "usertour-${data.coder_workspace.me.id}"
  database_url = "postgresql://postgres:postgres@postgres:5432/usertour?schema=usertour&sslmode=prefer"

  # Mirrors the (non-secret, dev-default) values in the repo's tracked .env,
  # set as container env vars since this file can't read that file directly.
  app_env = [
    "DATABASE_URL=${local.database_url}",
    "DATABASE_DIRECT_URL=${local.database_url}",
    "NEST_SERVER_PORT=3000",
    "Redis_HOST=redis",
    "Redis_PORT=6379",
    "JWT_SECRET=test",
    "JWT_EXPIRATION_TIME=1h",
    "JWT_REFRESH_EXPIRATION_TIME=7d",
    "EMAIL_AUTH_ENABLED=true",
    "EMAIL_SENDER=Usertour <support@usertour.io>",
    "GITHUB_AUTH_ENABLED=false",
    "GOOGLE_AUTH_ENABLED=false",
    "LOGIN_REDIRECT_URL=/env/1/flows",
    "NODE_ENV=production",
    "API_URL=",
  ]

  # Default code-server user settings. Passed straight into the code-server
  # module's own `settings` argument (see modules.tf) - the module writes
  # settings.json itself, so this file doesn't need to touch $HOME directly.
  # Add more keys here as needed.
  code_server_settings = {
    "workbench.colorTheme"   = var.code_server_theme
    "chat.disableAIFeatures" = true
    # Without this, code-server prompts "Allow automatic tasks?" the first
    # time it sees /app/.vscode/tasks.json's runOn:folderOpen task (below) -
    # "on" trusts it so the terminal panel just opens, no click required.
    "task.allowAutomaticTasks" = "on"
    # Auto-detects/forwards newly-detected listening ports in the Ports tab.
    # The coder_app "usertour" dashboard link (see main.tf) remains the
    # fast, single-hop path to the app itself; this just restores
    # auto-forwarding for other ports opened ad hoc during development.
    "remote.autoForwardPorts"       = true
    "remote.autoForwardPortsSource" = "process"
    # Pre-labels port 80 (nginx, the running Usertour app) in code-server's
    # own "Ports" panel for when it's opened manually from there, as an
    # alternative to the coder_app "usertour" dashboard link.
    "remote.portsAttributes" = {
      "80" = {
        label         = "Usertour app"
        onAutoForward = "notify"
      }
    }
  }
}

resource "coder_agent" "main" {
  arch = "amd64" # change to arm64 if your docker host is Apple Silicon / arm64
  os   = "linux"

  env = {
    GIT_AUTHOR_NAME     = data.coder_workspace_owner.me.full_name
    GIT_AUTHOR_EMAIL    = data.coder_workspace_owner.me.email
    GIT_COMMITTER_NAME  = data.coder_workspace_owner.me.full_name
    GIT_COMMITTER_EMAIL = data.coder_workspace_owner.me.email

    # We're not doing docker-in-docker in this container, so the agent's
    # dev-container auto-detection has nothing to find and just fails with
    # "docker: not found" (reported as a lifecycle START_ERROR). Disable it.
    CODER_AGENT_DEVCONTAINERS_ENABLE = "false"
  }

  metadata {
    display_name = "CPU Usage"
    key          = "cpu"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "ram"
    script       = "coder stat mem"
    interval     = 10
    timeout      = 1
  }

  display_apps {
    vscode = false
  }
}

# Direct link to the running app (nginx on :80 inside the same container the
# agent/code-server run in), proxied through Coder rather than a host port.
# subdomain = true routes this through Coder's wildcard-subdomain proxy (a
# URL like usertour--<workspace>--<owner>.<domain>), which requires the
# Coder deployment to have wildcard DNS/TLS configured for app subdomains
# (e.g. *.coder.example.com pointed at the Coder server, provisioned here
# via a Cloudflare Tunnel + a real domain). This avoids the path-prefix
# problem entirely - the app is served from "/" on its own subdomain, so
# nginx/default.conf and the web app's Vite build don't need any base-path
# awareness (unlike Coder's path-based proxy, which mounts the app under
# /@<owner>/<workspace>.<agent>/apps/usertour/ and does NOT rewrite the
# app's own absolute asset/API references to match).
resource "coder_app" "usertour" {
  agent_id     = coder_agent.main.id
  slug         = "usertour"
  display_name = "Usertour"
  url          = "http://127.0.0.1:80"
  icon         = "/icon/container.svg"
  subdomain    = true
  share        = "owner"
  open_in      = "tab"
  healthcheck {
    url       = "http://127.0.0.1:80"
    interval  = 10
    threshold = 15
  }
}

resource "docker_network" "usertour" {
  name = "${local.name_prefix}-net"
}

resource "docker_volume" "postgres_data" {
  name = "${local.name_prefix}-postgres-data"
}

resource "docker_volume" "redis_data" {
  name = "${local.name_prefix}-redis-data"
}

resource "docker_volume" "app_data" {
  name = "${local.name_prefix}-app-data"
}

resource "docker_image" "postgres" {
  name         = "postgres:15-alpine"
  keep_locally = true
}

resource "docker_image" "redis" {
  name         = "redis:alpine"
  keep_locally = true
}

resource "docker_image" "app" {
  name         = "node:22.13-slim"
  keep_locally = true
}

resource "docker_container" "postgres" {
  count    = data.coder_workspace.me.start_count
  name     = "${local.name_prefix}-postgres"
  image    = docker_image.postgres.image_id
  hostname = "postgres"
  restart  = "always"

  networks_advanced {
    name    = docker_network.usertour.name
    aliases = ["postgres"]
  }

  env = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=postgres",
    "POSTGRES_DB=usertour",
  ]

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U postgres"]
    interval = "10s"
    timeout  = "5s"
    retries  = 3
  }
}

resource "docker_container" "redis" {
  count    = data.coder_workspace.me.start_count
  name     = "${local.name_prefix}-redis"
  image    = docker_image.redis.image_id
  hostname = "redis"
  restart  = "always"

  networks_advanced {
    name    = docker_network.usertour.name
    aliases = ["redis"]
  }

  volumes {
    volume_name    = docker_volume.redis_data.name
    container_path = "/data"
  }

  healthcheck {
    test     = ["CMD", "redis-cli", "ping"]
    interval = "10s"
    timeout  = "5s"
    retries  = 3
  }
}

resource "docker_container" "app" {
  count    = data.coder_workspace.me.start_count
  name     = "${local.name_prefix}-app"
  image    = docker_image.app.image_id
  hostname = "app"
  restart  = "always"

  networks_advanced {
    name    = docker_network.usertour.name
    aliases = ["app"]
  }

  dynamic "ports" {
    for_each = var.expose_host_port ? [1] : []
    content {
      internal = 80
      external = var.host_port
    }
  }

  # Publishes code-server's port directly to the host, bypassing Coder's
  # agent/dashboard proxy entirely. Useful to A/B: if the IDE is just as
  # slow hitting this host port directly, the bottleneck is the container/
  # network path, not Coder's proxying - if it's fast here but slow via
  # the dashboard, the bottleneck is on Coder's side.
  dynamic "ports" {
    for_each = var.expose_host_port ? [1] : []
    content {
      internal = 13337
      external = var.code_server_host_port
    }
  }

  volumes {
    volume_name    = docker_volume.app_data.name
    container_path = "/app"
  }

  # init_script deliberately does not embed the auth token in its own text
  # (so it doesn't leak via `docker logs`/`docker inspect`) - it expects
  # CODER_AGENT_TOKEN to already be set in the environment it runs in.
  env = concat(local.app_env, [
    "CODER_AGENT_TOKEN=${coder_agent.main.token}",
  ])

  # Everything the Dockerfile did at build time happens here at container
  # start time instead, since this template has no local build context to
  # work with. /app is persisted on a volume, so clone/install only really
  # happen on the first start of a given workspace.
  entrypoint = ["sh", "-c"]
  command = [
    <<-EOT
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update

    # curl + ca-certificates so the agent's init script can download+verify
    # its binary over HTTPS. bash is included defensively (Debian slim ships
    # it by default, but the code-server module's install script - which
    # runs the instant the agent connects, only a couple seconds away - has
    # #!/usr/bin/env bash, and that race isn't worth re-litigating).
    apt-get install -y --no-install-recommends curl ca-certificates bash

    # Wrapped in an explicit subshell: init_script is many lines long and
    # ends in `exec ./coder agent`. A bare trailing "&" only backgrounds
    # whatever is on that same line - since init_script ends with a
    # newline, the "&" landed on its own empty line, so `exec` ran in the
    # foreground and replaced this ENTIRE script's process with the agent,
    # permanently, before any of the lines below ever got to run (that's
    # why /app stayed empty no matter how long we waited). The parens
    # force the whole block, exec included, into a background subshell.
    ( ${coder_agent.main.init_script} ) &

    apt-get install -y --no-install-recommends nginx openssl gettext-base git netcat-openbsd
    npm install -g pnpm prisma

    if [ ! -d /app/.git ]; then
      git clone --branch ${var.git_ref} --depth 1 ${var.git_repo_url} /app
    fi
    cd /app

    [ -f apps/sdk/.env ] || cp apps/sdk/.env.example apps/sdk/.env
    [ -f apps/web/.env ] || cp apps/web/.env.example apps/web/.env
    [ -f apps/server/.env ] || cp apps/server/.env.example apps/server/.env

    # Opens the terminal panel by default when code-server loads /app: a
    # runOn:folderOpen task with no real command, just reveal:always/panel:new
    # so it triggers on every window open. Guarded like the .env copies
    # above so it's only seeded once and won't clobber a real tasks.json a
    # user later adds to the (persistent) /app folder.
    if [ ! -f .vscode/tasks.json ]; then
      mkdir -p .vscode
      cat > .vscode/tasks.json <<'JSON'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open terminal",
      "type": "shell",
      "command": "echo Usertour dev workspace ready.",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "runOptions": {
        "runOn": "folderOpen"
      }
    }
  ]
}
JSON
    fi

    # --prod=false: NODE_ENV=production is already set in this container's
    # env (matching docker-compose), which makes pnpm skip devDependencies -
    # including the project's own pinned `prisma` CLI. Without it, `pnpm
    # prisma` at runtime falls back to whatever `npm install -g prisma`
    # above resolved (latest, currently a major version ahead), which
    # doesn't understand this project's older schema.prisma syntax.
    [ -x node_modules/.bin/prisma ] || pnpm install --prod=false

    # getaddrinfo("localhost") on this container resolves ::1 (IPv6) before
    # 127.0.0.1. Vite's dev server host config defaults to the string
    # "localhost", so it ends up bound to ::1 only - meanwhile nginx's own
    # "localhost" proxy_pass targets may resolve/connect via IPv4, missing
    # it entirely (502). Rather than patching every proxy_pass target to
    # chase wherever each dev process happens to bind, fix it at the root:
    # drop the IPv6 alias so "localhost" means 127.0.0.1 for every process
    # in this container (nginx, Vite, Nest, anything else).
    # Docker bind-mounts /etc/hosts into the container, so `sed -i` (which
    # renames a temp file over the original) fails with "Device or resource
    # busy" - have to overwrite its contents in place instead.
    sed '/^::1/s/\<localhost\>//' /etc/hosts > /tmp/hosts.new && cat /tmp/hosts.new > /etc/hosts

    mkdir -p /var/cache/nginx /etc/nginx/conf.d
    cp nginx/nginx.conf /etc/nginx/nginx.conf
    cp nginx/default.conf /etc/nginx/conf.d/default.conf
    chmod +x scripts/start.sh

    # nginx.conf has `user nginx;` - Alpine's nginx package creates that
    # system user, Debian's does not (it uses www-data instead), so nginx
    # fails immediately with getpwnam("nginx") unless we create it.
    getent passwd nginx >/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin nginx

    until nc -z postgres 5432; do sleep 1; done
    until nc -z redis 6379; do sleep 1; done

    exec ./scripts/start.sh
    EOT
  ]

  depends_on = [
    docker_container.postgres,
    docker_container.redis,
  ]
}
