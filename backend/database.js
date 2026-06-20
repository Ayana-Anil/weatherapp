const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'weather.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if it doesn't exist, then ensure required columns exist
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS weather_queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                weather_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Check table columns and add missing ones (safe migration)
            db.all("PRAGMA table_info(weather_queries)", [], (pragmaErr, cols) => {
                if (pragmaErr) return console.error('Failed to read table info:', pragmaErr.message);
                const names = (cols || []).map(c => c.name);
                if (!names.includes('avg_temp')) {
                    db.run('ALTER TABLE weather_queries ADD COLUMN avg_temp REAL', (aErr) => {
                        if (aErr) console.warn('Could not add avg_temp column:', aErr.message);
                        else console.log('Added avg_temp column to weather_queries');
                    });
                }
                if (!names.includes('avg_rain')) {
                    db.run('ALTER TABLE weather_queries ADD COLUMN avg_rain REAL', (aErr) => {
                        if (aErr) console.warn('Could not add avg_rain column:', aErr.message);
                        else console.log('Added avg_rain column to weather_queries');
                    });
                }
                if (!names.includes('user_note')) {
                    db.run('ALTER TABLE weather_queries ADD COLUMN user_note TEXT', (aErr) => {
                        if (aErr) console.warn('Could not add user_note column:', aErr.message);
                        else console.log('Added user_note column to weather_queries');
                    });
                }
            });
        });
    }
});

module.exports = db;