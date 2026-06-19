const express = require('express');
const cors = require('cors');
const db = require('./database');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

// HELPER: Fetch coordinates from location name
async function getCoordinates(location) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const response = await fetch(geoUrl);
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error("Location not found");
    return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

// 2.1 CREATE / 2.2 API Integration
app.post('/api/weather', async (req, res) => {
    try {
        const { location, startDate, endDate } = req.body;
        
        // Validation
        if (!location) return res.status(400).json({ error: "Location is required." });
        if (!startDate || !endDate) return res.status(400).json({ error: "Date range is required." });
        if (new Date(startDate) > new Date(endDate)) return res.status(400).json({ error: "Start date must be before end date." });

        // API 1: Geocoding
        const geo = await getCoordinates(location);
        
        // API 2: Weather Forecast
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${startDate}&end_date=${endDate}&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.error) throw new Error("Error fetching weather data for those dates.");

        // Store in DB
        const stmt = db.prepare(`INSERT INTO weather_queries (location, start_date, end_date, weather_data, user_note) VALUES (?, ?, ?, ?, ?)`);
        stmt.run([geo.name, startDate, endDate, JSON.stringify(weatherData), ""], function(err) {
            if (err) return res.status(500).json({ error: "Database error" });
            res.status(201).json({ id: this.lastID, location: geo.name, weatherData });
        });
        stmt.finalize();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2.1 READ
app.get('/api/weather', (req, res) => {
    db.all(`SELECT * FROM weather_queries ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2.1 UPDATE
app.put('/api/weather/:id', (req, res) => {
    const { user_note } = req.body;
    db.run(`UPDATE weather_queries SET user_note = ? WHERE id = ?`, [user_note, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Record updated", changes: this.changes });
    });
});

// 2.1 DELETE
app.delete('/api/weather/:id', (req, res) => {
    db.run(`DELETE FROM weather_queries WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Record deleted", changes: this.changes });
    });
});

// 2.3 DATA EXPORT (JSON & CSV)
app.get('/api/export/:format', (req, res) => {
    const format = req.params.format;
    db.all(`SELECT id, location, start_date, end_date, user_note, created_at FROM weather_queries`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (format === 'json') {
            res.header("Content-Type", "application/json");
            res.attachment("weather_export.json");
            return res.send(JSON.stringify(rows, null, 2));
        } else if (format === 'csv') {
            const csvRows = ['ID,Location,Start Date,End Date,Note,Created At'];
            rows.forEach(r => csvRows.push(`${r.id},"${r.location}",${r.start_date},${r.end_date},"${r.user_note || ''}",${r.created_at}`));
            res.header("Content-Type", "text/csv");
            res.attachment("weather_export.csv");
            return res.send(csvRows.join('\n'));
        }
        res.status(400).json({ error: "Invalid format requested." });
    });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));