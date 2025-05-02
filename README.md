# Time Tracker Application

A web application for tracking time spent on different projects.

## Features

- Create and manage projects
- Log time entries for projects
- View time entries in a table format
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd client
npm install
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

## API Endpoints

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project
- `GET /api/time-entries` - Get all time entries
- `POST /api/time-entries` - Create a new time entry 