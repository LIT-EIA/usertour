### Coder template for Usertour

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
  share        = "public"
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
    npm install -g pnpm prisma@5.12.1 prisma-dbml-generator@0.12.0 husky@9.1.7

    # --no-single-branch (and no --depth) so every branch's history is
    # fetched, not just var.git_ref's tip - /app is a persistent volume and
    # this clone only ever runs once (guarded below), so if it were shallow/
    # single-branch, none of this repo's other branches would ever become
    # reachable from inside the workspace afterwards (no `git fetch`/
    # `git checkout <other-branch>` from code-server without first
    # unshallowing and adding the remote branch back).
    if [ ! -d /app/.git ]; then
      git clone --no-single-branch --branch ${var.git_ref} ${var.git_repo_url} /app
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

    # NODE_ENV=production causes pnpm v9 to skip devDependencies, which
    # drops the repo's own pinned prisma CLI and husky (needed for prepare).
    # Override NODE_ENV just for this install so all deps are resolved.
    [ -x node_modules/.bin/prisma ] || NODE_ENV=development pnpm install

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

    # From here on, no single failure is allowed to take down this script -
    # this process is the container's PID 1, and the coder agent (started
    # above as a backgrounded subshell of THIS SAME script) dies the instant
    # this process exits, however it exits. `set -e` up to this point was
    # useful for failing fast on a broken apt/git/pnpm setup; past this
    # point it's actively dangerous, because some branches' scripts/start.sh
    # ends by exec'ing the real app process (e.g. `node dist/main`) instead
    # of the old `sleep infinity` keep-alive - if that process ever exits
    # (crash, missing build output, bad env), the old `exec ./scripts/start.sh`
    # below would exit right along with it and Coder would report "Workspace
    # agent has disconnected" with no way to open a terminal and debug.
    set +e

    # Some branches (e.g. anything whose nginx config serves static files
    # from /usr/share/nginx/html instead of proxying to a Vite dev server)
    # expect the app to have already gone through this repo's Dockerfile
    # build stages - this template only clones source and never builds an
    # image, so replicate that build here, best-effort, before handing off
    # to the branch's own start.sh. Branches that don't need this (nginx
    # still proxies to a dev server) skip straight past it.
    if grep -q '/usr/share/nginx/html' nginx/default.conf 2>/dev/null && [ ! -f apps/web/dist/index.html ]; then
      echo "Static-build branch detected - running its Dockerfile's build steps once (web/sdk/server), since this template clones source instead of building an image."

      # Mirrors the web-builder stage's config.js generation: turns each
      # VITE_ key in apps/web/.env.example into a window.ENV placeholder that
      # the branch's own start.sh envsubst's at runtime from real env vars.
      if [ -f apps/web/.env.example ] && [ ! -s apps/web/public/config.js ]; then
        mkdir -p apps/web/public
        { echo "window.ENV = {"
          while IFS= read -r line; do
            [ -z "$line" ] && continue
            var_name=$(echo "$line" | cut -d'=' -f1 | tr -d ' ' | sed 's/VITE_//')
            echo "  $var_name: '\$$var_name',"
          done < apps/web/.env.example
          echo "};"
        } > apps/web/public/config.js
      fi

      pnpm --filter @usertour/types build
      pnpm --filter @usertour/web build
      pnpm --filter @usertour/sdk build
      pnpm --filter @usertour/sdk build:iife
      pnpm --filter @usertour/server build
    fi

    # Stage whatever got built (this run or a previous one) where a
    # static-build branch's nginx config / start.sh expect to find it -
    # the branch's own Dockerfile does this with COPY --from=builder; we
    # don't have separate build stages here, so copy/symlink instead.
    [ -d apps/web/dist ] && mkdir -p /usr/share/nginx/html/web && cp -r apps/web/dist/. /usr/share/nginx/html/web/
    [ -d apps/sdk/dist ] && mkdir -p /usr/share/nginx/html/sdk && cp -r apps/sdk/dist/. /usr/share/nginx/html/sdk/
    [ -d apps/server/dist ] && rm -rf /app/dist && ln -s apps/server/dist /app/dist

    # Run the branch's own start script - NOT exec'd, so no matter how it
    # ends (the old dev-container-style `sleep infinity`, a crash, a
    # missing build artifact on some future branch), control returns here
    # instead of taking the container down with it.
    ./scripts/start.sh
    echo "scripts/start.sh exited ($?) - keeping the container (and Coder agent) alive so the workspace stays reachable for debugging instead of disconnecting."
    exec sleep infinity
    EOT
  ]

  depends_on = [
    docker_container.postgres,
    docker_container.redis,
  ]
}
