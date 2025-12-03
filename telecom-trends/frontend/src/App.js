import React, { useState, useEffect } from "react"
import axios from "axios"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import "./App.css"

const url = "http://localhost:4000/api"

function App() {
  const [search, setSearch] = useState("5g internet")
  const [loc, setLoc] = useState("US")
  const [chartData, setChartData] = useState([])
  const [words, setWords] = useState([])
  const [sub, setSub] = useState(null)
  const [vsData, setVsData] = useState({ merged: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [err, setErr] = useState("")

  useEffect(() => {
    getData()
  }, [])

  const getData = async () => {
    try {
      setIsLoading(true)
      setErr("")
      const res1 = await axios.get(url + "/trends", { params: { topic: search, geo: loc } })
      setChartData(res1.data.interestOverTime || [])
      
      const res2 = await axios.get(url + "/related", { params: { topic: search, geo: loc } })
      setWords(res2.data.relatedQueries || [])
      
      setSub(null)
      setVsData({ merged: [] })
    } catch (e) {
      console.log(e)
      setErr("Error loading data")
    } finally {
      setIsLoading(false)
    }
  }

  const onSearch = (e) => {
    e.preventDefault()
    getData()
  }

  const getCompare = async (newSub) => {
    try {
      setIsLoading(true)
      setErr("")
      const res = await axios.get(url + "/compare", {
        params: { topic: search, subtopic: newSub, geo: loc }
      })

      const d1 = res.data.mainTopic.interestOverTime || []
      const d2 = res.data.subTopic.interestOverTime || []

      const final = d1.map((item, i) => ({
        date: item.date,
        val1: item.value,
        val2: d2[i] ? d2[i].value : 0
      }))

      setVsData({ merged: final })
    } catch (error) {
      console.log(error)
      setErr("Compare failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-root">
      <div className="app-header">
        <div>
          <h1 className="app-title">Telecom Trend Explorer</h1>
          <p className="app-subtitle">Interactive Google Trends dashboard</p>
        </div>
        <div className="app-header-meta">
          <div>React & Node</div>
        </div>
      </div>

      <div className="app-main">
        <div className="card search-card">
          <form onSubmit={onSearch} className="search-form">
            <div className="form-field">
              <label>Topic</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-text" />
            </div>

            <div className="form-field">
              <label>Region</label>
              <select value={loc} onChange={(e) => setLoc(e.target.value)} className="select-region">
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="GB">UK</option>
                <option value="CA">Canada</option>
                <option value="">Worldwide</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Run Analysis</button>
            </div>
          </form>
          {isLoading ? <p>Loading...</p> : null}
          {err ? <p style={{ color: "red" }}>{err}</p> : null}
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-left">
            <div className="card chart-card">
              <div className="card-header">
                <h2>Interest Over Time</h2>
              </div>
              <div className="chart-container">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" name={search} stroke="#38bdf8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p>No data</p>}
              </div>
            </div>

            {sub && vsData.merged.length > 0 && (
              <div className="card chart-card">
                <div className="card-header">
                  <h2>{search} vs {sub}</h2>
                  <button onClick={() => { setSub(null); setVsData({ merged: [] }) }}>Clear</button>
                </div>
                <div className="chart-container chart-container-small">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vsData.merged}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="val1" name={search} stroke="#38bdf8" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="val2" name={sub} stroke="#f97316" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-right">
            <div className="card wordcloud-card">
              <h2>Related Keywords</h2>
              <div className="wordcloud-container">
                {words.length > 0 ? (
                  <div className="wordcloud-words">
                    {words.map((w) => {
                      const sz = 12 + (Math.min(100, w.value || 10) / 100) * (28 - 12)
                      return (
                        <span key={w.term} style={{ fontSize: sz + "px", margin: "5px", cursor: "pointer" }} onClick={() => { setSub(w.term); getCompare(w.term) }}>
                          {w.term}
                        </span>
                      )
                    })}
                  </div>
                ) : <p>No queries found</p>}
              </div>
            </div>

            <div className="card list-card">
              <h3>Table View</h3>
              <div className="related-list">
                {words.map((q) => (
                  <div key={q.term} className="related-list-row" style={{ backgroundColor: sub === q.term ? "#eee" : "transparent" }}>
                    <div>
                      <div>{q.term}</div>
                      <small>Score: {q.value}</small>
                    </div>
                    <button onClick={() => { setSub(q.term); getCompare(q.term) }}>Drill down</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;