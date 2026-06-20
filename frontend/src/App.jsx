import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNoteValue, setEditNoteValue] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize dates to next 5 days
  useEffect(() => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + 5);
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(future.toISOString().split('T')[0]);
    fetchHistory();
  }, []);

  // ── DYNAMIC BACKGROUND based on avg rainfall ──────────────────────────────
  useEffect(() => {
    if (!forecast) {
      // Reset to default CSS background when no forecast is loaded
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
      return;
    }

    const rain = forecast.avgRain;

    let bgUrl = '';
    if (rain === null || rain === undefined) {
      // No rain data — leave background as CSS default
      return;
    } else if (rain <= 0.1) {
      bgUrl = '/backgrounds/sunny.jpeg';   // ← SUNNY image URL
    } else if (rain <= 7.5) {
      bgUrl = '/backgrounds/windy.jpeg';   // ← WINDY image URL
    } else {
      bgUrl = '/backgrounds/rainy.jpeg';   // ← RAINY image URL
    }

    document.body.style.backgroundImage = `url("${bgUrl}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  }, [forecast]);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/weather`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const renderWeatherPreview = (item) => {
    const preAvgTemp = item?.avg_temp ?? item?.avgTemp ?? null;
    const preAvgRain = item?.avg_rain ?? item?.avgRain ?? null;
    if (preAvgTemp !== null || preAvgRain !== null) {
      return (
        <div style={{marginTop: '12px'}}>
          <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
            <div style={{background: '#fff', padding: '10px 12px', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#6b7280'}}>Avg Temp</div>
              <div style={{fontWeight: 700, fontSize: '16px'}}>{preAvgTemp !== null ? `${Number(preAvgTemp).toFixed(1)}°C` : 'N/A'}</div>
            </div>
            <div style={{background: '#fff', padding: '10px 12px', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#6b7280'}}>Avg Rain</div>
              <div style={{fontWeight: 700, fontSize: '16px'}}>{preAvgRain !== null ? `${Number(preAvgRain).toFixed(1)} mm` : 'N/A'}</div>
            </div>
          </div>
        </div>
      );
    }

    let wd = item?.weatherData || item?.weather_data || item?.data;
    if (typeof wd === 'string') {
      try { wd = JSON.parse(wd); } catch (e) { wd = null; }
    }
    if (!wd || !wd.daily) return null;

    const maxArr = wd.daily.temperature_2m_max || [];
    const minArr = wd.daily.temperature_2m_min || [];
    const precipArr = wd.daily.precipitation_sum || [];
    const days = Math.max(maxArr.length, minArr.length, precipArr.length);
    if (days === 0) return null;

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

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const avgTemp = avg(temps);
    const avgRain = avg(rains);

    return (
      <div style={{marginTop: '12px'}}>
        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          <div style={{background: '#fff', padding: '10px 12px', borderRadius: '8px'}}>
            <div style={{fontSize: '13px', color: '#6b7280'}}>Avg Temp</div>
            <div style={{fontWeight: 700, fontSize: '16px'}}>{avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : 'N/A'}</div>
          </div>
          <div style={{background: '#fff', padding: '10px 12px', borderRadius: '8px'}}>
            <div style={{fontSize: '13px', color: '#6b7280'}}>Avg Rain</div>
            <div style={{fontWeight: 700, fontSize: '16px'}}>{avgRain !== null ? `${avgRain.toFixed(1)} mm` : 'N/A'}</div>
          </div>
        </div>
      </div>
    );
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

      // Store avgRain alongside forecast so the background effect can use it
      setForecast({ name: data.location, data: data.weatherData, avgRain: data.avg_rain });
      fetchHistory();
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

  const handleView = (item) => {
    setSelectedHistory(item);
    setShowAll(false);
  };

  const handleViewAll = () => {
    setShowAll((s) => !s);
    setSelectedHistory(null);
  };

  const handleUpdateNote = (id, currentNote) => {
    setEditId(id);
    setEditNoteValue(currentNote || '');
    setEditModalOpen(true);
  };

  const submitUpdateNote = async () => {
    try {
      await fetch(`${API_BASE}/weather/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_note: editNoteValue })
      });
      setEditModalOpen(false);
      setEditId(null);
      setEditNoteValue('');
      fetchHistory();
    } catch (err) {
      console.error('Failed to update note', err);
      setError('Failed to update note');
    }
  };

  const closeModal = () => {
    setSelectedHistory(null);
    setShowAll(false);
    setEditModalOpen(false);
    setEditId(null);
    setEditNoteValue('');
  };

  return (
    <div className="container">
      <h1>Weather Forecast</h1>

      {error && <div className="error">{error}</div>}

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

      {/* FORECAST VIEW */}
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

      {/* DATABASE CRUD & EXPORT */}
      <div className="history-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Search History (Database)</h2>
          <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
            <div className="export-links">
              <a href={`${API_BASE}/export/json`} target="_blank">📥 Export JSON</a>
              <a href={`${API_BASE}/export/csv`} target="_blank">📥 Export CSV</a>
            </div>
            <button onClick={handleViewAll} style={{background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px'}}>
              {showAll ? 'Hide Full History' : 'View Full History'}
            </button>
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
                  <button onClick={() => handleView(item)} style={{marginRight: '8px'}}>View</button>
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

        {/* Modal overlay */}
        {(selectedHistory || showAll || editModalOpen) && (
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}}>
            <div style={{width: '90%', maxWidth: '900px', background: '#e6eef6', padding: '18px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0}}>{editModalOpen ? 'Edit Note' : (showAll ? 'Full History' : `Details — ${selectedHistory?.location}`)}</h3>
                <button onClick={closeModal} style={{background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px'}}>Close</button>
              </div>

              <div style={{marginTop: '12px'}}>
                {editModalOpen ? (
                  <div>
                    <label style={{display: 'block', marginBottom: '8px'}}>Note</label>
                    <textarea value={editNoteValue} onChange={(e) => setEditNoteValue(e.target.value)} rows={4} style={{width: '100%', padding: '8px', borderRadius: '6px'}} />
                    <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                      <button onClick={submitUpdateNote} style={{background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px'}}>Save</button>
                      <button onClick={closeModal} style={{background: '#9ca3af', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px'}}>Cancel</button>
                    </div>
                  </div>
                ) : showAll ? (
                  <div style={{display: 'grid', gap: '10px', maxHeight: '60vh', overflowY: 'auto'}}>
                    {history.map((item) => (
                      <div key={item.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '8px'}}>
                        <div>
                          <div style={{fontWeight: 700}}>{item.location}</div>
                          <div style={{color: '#6b7280'}}>{item.start_date} to {item.end_date}</div>
                          <div style={{marginTop: '6px'}}><strong>Note:</strong> {item.user_note || <em style={{color: '#9ca3af'}}>None</em>}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{background: '#fff', padding: '12px', borderRadius: '8px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <div style={{fontSize: '18px', fontWeight: 700}}>{selectedHistory.location}</div>
                          <div style={{color: '#6b7280'}}>{selectedHistory.start_date} to {selectedHistory.end_date}</div>
                        </div>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button onClick={() => { setEditId(selectedHistory.id); setEditNoteValue(selectedHistory.user_note || ''); setEditModalOpen(true); }} style={{background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '6px'}}>Edit Note</button>
                          <button className="danger" onClick={() => { handleDelete(selectedHistory.id); closeModal(); }} style={{background: '#ef4444', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '6px'}}>Delete</button>
                        </div>
                      </div>
                      <div style={{marginTop: '10px'}}>
                        <strong>My Note:</strong> {selectedHistory.user_note || <em style={{color: '#9ca3af'}}>None</em>}
                      </div>
                      {renderWeatherPreview(selectedHistory)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;