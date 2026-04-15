# Budget Planner -- Deployment & Remote Access Guide

Self-hosted Next.js budget planner running on a Mac via Docker Compose with iCloud Drive integration for automatic receipt filing.

## Prerequisites

- **Docker Desktop for Mac** -- install from [docker.com](https://www.docker.com/products/docker-desktop/) and ensure it is running.
- **This repository** cloned to your Mac.

## Quick Start

1. Generate a session secret:

   ```bash
   openssl rand -hex 32
   ```

2. Copy the example env file and fill in your secret:

   ```bash
   cp .env.example .env.production
   ```

   Open `.env.production` and set `SESSION_SECRET` to the value you generated.

3. Build and start the container:

   ```bash
   docker compose up -d --build
   ```

4. Open **http://localhost:3000** in your browser.

5. Log in with the default PIN: **0000** (change it immediately after first login).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Path to the SQLite database file | `./data/budget.db` |
| `SESSION_SECRET` | Secret used to sign session cookies. **Must** be set in production. | _(none)_ |
| `ICLOUD_BASE_PATH` | Host path to iCloud Drive root | `~/Library/Mobile Documents/com~apple~CloudDocs` |
| `MAX_UPLOAD_SIZE` | Maximum receipt upload size in bytes | `10485760` (10 MB) |
| `NODE_ENV` | `development` or `production` | `development` |

## Data Persistence

- **SQLite database** is stored at `./data/budget.db` via a mounted Docker volume.
- **Uploaded receipts** are stored in `./data/receipts/`.
- Container restarts and rebuilds preserve all data because the `./data` directory lives on the host.
- **Backup:** copy the entire `./data` directory to a safe location. That single folder contains everything.

## Remote Access

### Option A: Cloudflare Tunnel (Recommended if you own a domain)

Cloudflare Tunnel exposes your local app to the internet through an encrypted tunnel without opening any ports on your router.

1. Install `cloudflared`:

   ```bash
   brew install cloudflared
   ```

2. Authenticate with Cloudflare:

   ```bash
   cloudflared tunnel login
   ```

   This opens a browser window. Select the domain you want to use.

3. Create a tunnel:

   ```bash
   cloudflared tunnel create budget-planner
   ```

   Note the tunnel UUID printed in the output.

4. Create the config file at `~/.cloudflared/config.yml`:

   ```yaml
   tunnel: <TUNNEL_UUID>
   credentials-file: /Users/<you>/.cloudflared/<TUNNEL_UUID>.json

   ingress:
     - hostname: budget.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

   Replace `<TUNNEL_UUID>` and `<you>` with your actual values.

5. Add a DNS route:

   ```bash
   cloudflared tunnel route dns budget-planner budget.yourdomain.com
   ```

6. Start the tunnel:

   ```bash
   cloudflared tunnel run budget-planner
   ```

   Your app is now reachable at `https://budget.yourdomain.com`.

7. **Optional -- auto-start on boot with launchd:**

   Create the plist at `~/Library/LaunchAgents/com.cloudflare.budget-tunnel.plist`:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
     "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key>
     <string>com.cloudflare.budget-tunnel</string>
     <key>ProgramArguments</key>
     <array>
       <string>/opt/homebrew/bin/cloudflared</string>
       <string>tunnel</string>
       <string>run</string>
       <string>budget-planner</string>
     </array>
     <key>RunAtLoad</key>
     <true/>
     <key>KeepAlive</key>
     <true/>
     <key>StandardOutPath</key>
     <string>/tmp/cloudflared-budget.log</string>
     <key>StandardErrorPath</key>
     <string>/tmp/cloudflared-budget.log</string>
   </dict>
   </plist>
   ```

   Load it:

   ```bash
   launchctl load ~/Library/LaunchAgents/com.cloudflare.budget-tunnel.plist
   ```

   To stop it later:

   ```bash
   launchctl unload ~/Library/LaunchAgents/com.cloudflare.budget-tunnel.plist
   ```

### Option B: Tailscale (Recommended if you have no domain)

Tailscale creates a private WireGuard mesh network between your devices with zero configuration.

1. Install Tailscale on your Mac:

   ```bash
   brew install tailscale
   ```

   Or install from the Mac App Store.

2. Install Tailscale on your iPhone or other devices from their respective app stores.

3. Sign in on all devices with the same Tailscale account.

4. Access the budget planner from any device on the tailnet:

   ```
   http://<your-mac-hostname>:3000
   ```

   Find your Mac's Tailscale hostname by running `tailscale status`.

5. **Optional:** Enable **MagicDNS** in the Tailscale admin console for friendly hostnames, and enable **HTTPS** to get automatic TLS certificates for your tailnet devices.

## iCloud Drive Integration

The `docker-compose.yml` mounts the host's iCloud Drive into the container:

```
~/Library/Mobile Documents/com~apple~CloudDocs  -->  /app/icloud
```

- Receipts uploaded through the app are saved to **category-mapped subfolders** inside iCloud Drive (e.g., `/app/icloud/Budget/Groceries/`, `/app/icloud/Budget/Utilities/`).
- Because these folders live on iCloud Drive, files **sync automatically** to every Apple device signed into the same iCloud account.
- **Requirement:** iCloud Drive must be enabled on the Mac (System Settings > Apple ID > iCloud > iCloud Drive).

## Updating

Pull the latest changes and rebuild:

```bash
git pull && docker compose up -d --build
```

The `./data` volume is not affected by rebuilds, so your database and receipts are safe.

## Troubleshooting

| Problem | Fix |
|---|---|
| **Permission denied on iCloud mount** | Docker needs access to the iCloud Drive directory. Go to System Settings > Privacy & Security > Files and Folders and grant Docker full disk access, or run `chmod -R 755 ~/Library/Mobile\ Documents/com~apple~CloudDocs`. |
| **Database locked** | SQLite allows only one writer at a time. Make sure you are not running multiple container instances: `docker compose ps` should show exactly one container. |
| **Port 3000 already in use** | Either stop the other process using port 3000 (`lsof -i :3000`) or change the host port in `docker-compose.yml` (e.g., `3001:3000`). |
| **Container won't start** | Check the logs: `docker compose logs -f`. Common causes are a missing `.env.production` file or a syntax error in environment variables. |
