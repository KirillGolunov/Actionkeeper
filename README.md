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

## SMTP Settings

- You must provide a `smtp_settings.json` file in the project root with your SMTP configuration. Do not commit real credentials to version control. You can use the provided `smtp_settings.example.json` as a template.

## Setup Instructions

1. Clone the repository and install dependencies:
   ```sh
   npm install
   ```
2. Copy the example SMTP settings and fill in your real values:
   ```sh
   cp smtp_settings.example.json smtp_settings.json
   # Edit smtp_settings.json with your SMTP credentials
   ```
3. (Optional) Set environment variables as needed:
   ```sh
   export PORT=4000
   export DB_PATH=/path/to/your/time_tracker.db
   ```
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