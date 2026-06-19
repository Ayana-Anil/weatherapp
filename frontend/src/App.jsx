import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize dates to next 5 days for easy UX
  useEffect(() => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + 5);
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(future.toISOString().split('T')[0]);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/weather`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setForecast(null);

    try {
      const res = await fetch(`${API_BASE}/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, startDate, endDate })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setForecast({ name: data.location, data: data.weatherData });
      fetchHistory(); // Refresh history table
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/weather/${id}`, { method: 'DELETE' });
    fetchHistory();
  };

  const handleUpdateNote = async (id, currentNote) => {
    const newNote = prompt("Enter a note for this location:", currentNote || "");
    if (newNote !== null) {
      await fetch(`${API_BASE}/weather/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_note: newNote })
      });
      fetchHistory();
    }
  };

  return (
    <div className="container">
      <h1>🌍 Weather API Explorer</h1>
      
      {error && <div className="error">⚠️ {error}</div>}

      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="Enter Location (e.g., Paris, 90210)" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)} 
          required 
        />
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          required 
        />
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
          required 
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Get Weather'}
        </button>
      </form>

      {/* FORECAST VIEW (1.1) */}
      {forecast && (
        <div>
          <h2>Forecast for {forecast.name}</h2>
          <div className="forecast-grid">
            {forecast.data.daily.time.map((date, idx) => (
              <div key={date} className="forecast-card">
                <strong>{date}</strong>
                <p>High: {forecast.data.daily.temperature_2m_max[idx]}°C</p>
                <p>Low: {forecast.data.daily.temperature_2m_min[idx]}°C</p>
                <p>Precip: {forecast.data.daily.precipitation_sum[idx]} mm</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DATABASE CRUD & EXPORT (2.1 & 2.3) */}
      <div className="history-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Search History (Database)</h2>
          <div className="export-links">
            <a href={`${API_BASE}/export/json`} target="_blank">📥 Export JSON</a>
            <a href={`${API_BASE}/export/csv`} target="_blank">📥 Export CSV</a>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Range</th>
              <th>My Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td>{item.location}</td>
                <td>{item.start_date} to {item.end_date}</td>
                <td>{item.user_note || <em style={{color: '#9ca3af'}}>None</em>}</td>
                <td>
                  <button onClick={() => handleUpdateNote(item.id, item.user_note)} style={{marginRight: '8px'}}>Edit Note</button>
                  <button className="danger" onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan="4" style={{textAlign: 'center'}}>No database records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;