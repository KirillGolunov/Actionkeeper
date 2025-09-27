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
- `DB_PATH`: (optional) Path to the SQLite database file. Defaults to `time_tracker.db` if not set.
- `APP_BASE_URL`: (optional) The base URL for links in emails. Defaults to `http://localhost:3000`.
- `ACME_EMAIL`: Email used by the reverse proxy (Caddy) to request TLS certificates from Let’s Encrypt.
- SMTP settings (**must be set via environment variables for production/multi-client installs**):
  - `SMTP_HOST`: SMTP server hostname
  - `SMTP_PORT`: SMTP server port (e.g. 587)
  - `SMTP_USER`: SMTP username
  - `SMTP_PASS`: SMTP password
  - `SMTP_FROM`: From email address
  - `SMTP_SECURE`: Set to `true` for SSL/TLS, `false` otherwise

### Example .env file

```env
PORT=3001
DB_PATH=./time_tracker.db
APP_BASE_URL=https://actionlog.ru
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM=your@email.com
SMTP_SECURE=false
ACME_EMAIL=admin@example.com
```

## SMTP Settings

- **For production and multi-client installs, you must provide SMTP settings via environment variables.**
- The `smtp_settings.json` file is only used as a fallback for local development if environment variables are not set.
- Do not commit real credentials to version control. You can use the provided `smtp_settings.example.json` as a template for local development only.

## Setup Instructions

1. Clone the repository and install dependencies:
   ```sh
   npm install
   ```
2. (Optional) Copy the example SMTP settings and fill in your real values:
   ```sh
   cp smtp_settings.example.json smtp_settings.json
   # Edit smtp_settings.json with your SMTP credentials (if not using env vars)
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
   - Create and configure your `.env` file in the project root (see Environment Variables section above)
   - Point your domain’s DNS A/AAAA records to the server running the stack (e.g. `actionlog.ru -> 185.244.218.82`).

2. **Start the stack:**
   ```sh
   docker compose pull
   docker compose up -d --remove-orphans
   ```

3. **Access the app:**
   - Application (served via Caddy with HTTPS): [https://actionlog.ru](https://actionlog.ru)
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
