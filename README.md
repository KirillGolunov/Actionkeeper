# Actionkeeper

A time tracking application to help users monitor and manage their activities efficiently.

## Features

- Create and manage projects
- Log time entries for projects
- View time entries in a table format
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Environment Variables

- `PORT`: (optional) The port your server will listen on. Defaults to 3001 if not set.
- `DB_PATH`: (optional) Path to the SQLite database file. Defaults to `./data/time_tracker.db` if not set.
- `APP_BASE_URL`: (optional) The base URL for links in emails. Defaults to `http://localhost:3000`.
- `APP_DOMAIN`: Public domain used by Caddy for the production site. Defaults to `actionlog.ru` in the bundled Caddy config if not set.
- `ACME_EMAIL`: Email used by the reverse proxy (Caddy) to request TLS certificates from Let's Encrypt.
- SMTP settings (can be provided via environment variables for initial/bootstrap configuration):
  - `SMTP_HOST`: SMTP server hostname
  - `SMTP_PORT`: SMTP server port (e.g. 587)
  - `SMTP_USER`: SMTP username
  - `SMTP_PASS`: SMTP password
  - `SMTP_FROM`: From email address
  - `SMTP_SECURE`: Set to `true` for SSL/TLS, `false` otherwise

### Example .env file

```env
PORT=3001
DB_PATH=./data/time_tracker.db
APP_BASE_URL=https://actionlog.ru
APP_DOMAIN=actionlog.ru
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM=your@email.com
SMTP_SECURE=false
ACME_EMAIL=admin@example.com
```

Copy `.env.example` to `.env` for local development or a fresh server install, then replace the placeholder values with your own.

## SMTP Settings

- SMTP can be bootstrapped from `.env` via `SMTP_*` variables.
- Admin changes from the in-app SMTP settings page are saved to `data/smtp_settings.json`, which has priority over `.env` and survives Docker restarts through the `./data` volume.
- Do not commit real credentials to version control. `data/` and `.env` are deployment-local and ignored by git.

## Setup Instructions

1. Clone the repository and install dependencies:
   ```sh
   npm install
   ```
2. Create a local `.env` file from the example:
   ```sh
   cp .env.example .env
   # Edit .env with your local or server-specific values
   ```
3. Set environment variables as needed (see above).
4. Start the server:
   ```sh
   npm start
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm start
   ```
2. In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm start
   ```
3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

- `server.js` - Backend server with Express and SQLite
- `client/` - React frontend application
  - `src/components/` - Reusable React components
  - `src/pages/` - Main application pages
- `emailTemplates/` - Handlebars templates for emails

## API Endpoints

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project
- `GET /api/time-entries` - Get all time entries
- `POST /api/time-entries` - Create a new time entry

## License

This project is currently unlicensed. You may add a license of your choice.

## Running with Docker Compose

1. **Prerequisites:**
   - Docker and Docker Compose installed
   - Create and configure your local `.env` file in the project root from `.env.example` (see Environment Variables section above)
   - Point your domain's DNS A/AAAA records to the server running the stack (e.g. `actionlog.ru -> 185.244.218.82`).
   - Set `APP_DOMAIN` to the host name that should answer HTTPS traffic for this specific deployment.

2. **Start the stack:**
   ```sh
   docker compose pull
   docker compose up -d --remove-orphans
   ```

3. **Access the app:**
   - Application (served via Caddy; if another service already uses 443, configure its fallback to forward SNI for your `APP_DOMAIN` to this stack): open `https://<your-app-domain>`
   - API requests are automatically proxied by Caddy under the `/api` path.

4. **Database Persistence:**
   - The SQLite database file is stored in the `./data` directory on your host for persistence.

5. **Stopping the app:**
   ```sh
   docker compose down
   ```

6. **Rebuilding after code changes:**
   ```sh
   docker compose pull
   docker compose up -d --remove-orphans
   ```

## Installing Another Production Copy

1. Point the new domain to the new server before requesting certificates.
2. Run `./install.sh` on the target server.
3. Enter the new public URL when prompted; the installer will:
   - save the full URL to `APP_BASE_URL`
   - extract the host name into `APP_DOMAIN`
   - write both values into `.env`
4. Start the stack with Docker Compose.

For the existing production server, keep:

```env
APP_BASE_URL=https://actionlog.ru
APP_DOMAIN=actionlog.ru
```

This keeps the currently deployed instance behavior unchanged while allowing new servers to use a different domain from the same repository.

## Deployment Safety

- `.env` and `data/smtp_settings.json` are deployment-local files and should not be committed to git.
- The production deploy workflow preserves `.env`; runtime SMTP settings remain in the persistent `data/` directory.
- For a new server, run `./install.sh` to generate `.env`; later SMTP changes can be made from the admin settings page.

