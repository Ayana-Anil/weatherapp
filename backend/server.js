const express = require('express');
const cors = require('cors');
const db = require('./database');
const fetch = require('node-fetch');
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

async function getCoordinates(location) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const response = await fetch(geoUrl);
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error("Location not found");
    return { lat: data.results[0].latitude, lon: data.results[0].longitude, name: data.results[0].name };
}

app.post('/api/weather', async (req, res) => {
    try {
        const { location, startDate, endDate } = req.body;
        
       
        if (!location) return res.status(400).json({ error: "Location is required." });
        if (!startDate || !endDate) return res.status(400).json({ error: "Date range is required." });
        if (new Date(startDate) > new Date(endDate)) return res.status(400).json({ error: "Start date must be before end date." });

    
        const geo = await getCoordinates(location);
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=${startDate}&end_date=${endDate}&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        if (weatherData.error) throw new Error("Error fetching weather data for those dates.");

        let avgTemp = null;
        let avgRain = null;
        try {
            const daily = weatherData.daily || {};
            const maxArr = daily.temperature_2m_max || [];
            const minArr = daily.temperature_2m_min || [];
            const precipArr = daily.precipitation_sum || [];
            const days = Math.max(maxArr.length, minArr.length, precipArr.length);
            const temps = [];
            for (let i = 0; i < days; i++) {
                const max = typeof maxArr[i] === 'number' ? maxArr[i] : null;
                const min = typeof minArr[i] === 'number' ? minArr[i] : null;
                if (max !== null && min !== null) temps.push((max + min) / 2);
                else if (max !== null) temps.push(max);
                else if (min !== null) temps.push(min);
            }
            const rains = [];
            for (let i = 0; i < days; i++) {
                const r = typeof precipArr[i] === 'number' ? precipArr[i] : null;
                if (r !== null) rains.push(r);
            }
            const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
            avgTemp = avg(temps);
            avgRain = avg(rains);
        } catch (e) {
            // ignore and leave averages null
        }

        const stmt = db.prepare(`INSERT INTO weather_queries (location, start_date, end_date, weather_data, avg_temp, avg_rain, user_note) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        stmt.run([geo.name, startDate, endDate, JSON.stringify(weatherData), avgTemp, avgRain, ""], function(err) {
            if (err) return res.status(500).json({ error: "Database error" });
            res.status(201).json({ id: this.lastID, location: geo.name, weatherData, avg_temp: avgTemp, avg_rain: avgRain });
        });
        stmt.finalize();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// READ
app.get('/api/weather', (req, res) => {
    db.all(`SELECT * FROM weather_queries ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

//UPDATE
app.put('/api/weather/:id', (req, res) => {
    const { user_note } = req.body;
    console.log(`PUT /api/weather/${req.params.id} user_note=`, user_note);
    db.run(`UPDATE weather_queries SET user_note = ? WHERE id = ?`, [user_note, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get(`SELECT * FROM weather_queries WHERE id = ?`, [req.params.id], (getErr, row) => {
            if (getErr) return res.status(500).json({ error: getErr.message });
            res.json({ message: "Record updated", changes: this.changes, row });
        });
    });
});

app.delete('/api/weather/:id', (req, res) => {
    db.run(`DELETE FROM weather_queries WHERE id = ?`, req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Record deleted", changes: this.changes });
    });
});

app.get('/api/export/:format', (req, res) => {
    const format = req.params.format;
    db.all(`SELECT id, location, start_date, end_date, avg_temp, avg_rain, user_note, created_at FROM weather_queries`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (format === 'json') {
            res.header("Content-Type", "application/json");
            res.attachment("weather_export.json");
            return res.send(JSON.stringify(rows, null, 2));
        } else if (format === 'csv') {
            const csvRows = ['ID,Location,Start Date,End Date,Avg Temp (C),Avg Rain (mm),Note,Created At'];
            rows.forEach(r => csvRows.push(`${r.id},"${r.location}",${r.start_date},${r.end_date},${r.avg_temp !== null ? r.avg_temp : ''},${r.avg_rain !== null ? r.avg_rain : ''},"${r.user_note || ''}",${r.created_at}`));
            res.header("Content-Type", "text/csv");
            res.attachment("weather_export.csv");
            return res.send(csvRows.join('\n'));
        }
        res.status(400).json({ error: "Invalid format requested." });
    });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));