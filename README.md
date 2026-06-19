# AI Engineer Intern - Full Stack Weather App

**Assessment Completed:** Full Stack / Dual Role (Tech Assessment #1 & #2)

This application allows users to search for the weather in a specific location within a date range, fetches real-time data from external APIs, stores the queries in a SQLite database, and allows for full CRUD operations and data exports.

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Setup & Running Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Start the server: `npm start`
   - The backend runs on `http://localhost:5000`
   - The SQLite database (`weather.sqlite`) will automatically be created on the first run.

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
   - The frontend runs on `http://localhost:5173`

## Features Implemented
- **Frontend:** Responsive React UI, Error Handling, 5-Day Forecast display.
- **Backend (CRUD):** SQLite DB. Validates input, CREATES records, READS history, UPDATES user notes, DELETES records.
- **API Integration:** Open-Meteo Geocoding and Forecast APIs.
- **Data Export:** Endpoints to export the database to JSON or CSV.