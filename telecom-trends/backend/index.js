const express = require('express')
const cors = require('cors')
const googleTrends = require('google-trends-api')

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

const getHash = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash)
}

const makeFakeData = (topic) => {
    console.log('making fake data for ' + topic)
    const data = []
    const now = new Date()
    const start = new Date()
    start.setFullYear(now.getFullYear() - 1)
    
    let current = new Date(start)
    const seed = getHash(topic)
    const base = (seed % 60) + 20

    while (current <= now) {
        let random = Math.floor(Math.random() * 20) - 10
        let val = base + random
        if (val < 0) val = 0
        if (val > 100) val = 100

        data.push({
            date: current.toISOString().slice(0, 10),
            value: val
        })
        current.setDate(current.getDate() + 7)
    }
    return data
}

const getMockRelated = (topic) => {
    return [
        { term: "best " + topic, value: 92 },
        { term: topic + " price", value: 85 },
        { term: topic + " reviews", value: 78 },
        { term: topic + " vs", value: 72 },
        { term: "is " + topic + " good", value: 65 },
        { term: topic + " issues", value: 60 },
        { term: "new " + topic, value: 55 },
        { term: topic + " reddit", value: 48 }
    ]
}

const fetchReal = async (topic, geo) => {
    try {
        let g = ""
        if (geo !== "Worldwide") {
            g = geo
        }
        
        const res = await googleTrends.interestOverTime({
            keyword: topic,
            geo: g,
            startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        })
        
        const parsed = JSON.parse(res)
        if (!parsed.default.timelineData || parsed.default.timelineData.length === 0) {
            return null
        }

        const formatted = parsed.default.timelineData.map(item => {
            return {
                date: item.formattedTime,
                value: item.value[0]
            }
        })
        return formatted

    } catch (err) {
        console.log("error fetching real data", err.message)
        return null
    }
}

app.get('/api/trends', async (req, res) => {
    const topic = req.query.topic || "5g internet"
    const geo = req.query.geo || "US"

    const data = await fetchReal(topic, geo)
    
    if (data) {
        res.json({ topic, geo, interestOverTime: data, source: "Real Google API" })
    } else {
        const fake = makeFakeData(topic)
        res.json({ topic, geo, interestOverTime: fake, source: "Mock Data" })
    }
})

app.get('/api/related', async (req, res) => {
    const topic = req.query.topic || "5g internet"
    const geo = req.query.geo || "US"
    
    try {
        let gCode = geo === "Worldwide" ? "" : geo
        const result = await googleTrends.relatedQueries({
            keyword: topic,
            geo: gCode
        })
        const parsed = JSON.parse(result)
        const list = parsed.default.rankedList[0]?.rankedKeyword || []
        
        const final = list.slice(0, 10).map(x => ({
            term: x.query,
            value: x.value
        }))
        
        res.json({ topic, geo, relatedQueries: final, source: "Real Google API" })

    } catch (e) {
        console.log("related failed", e.message)
        const fake = getMockRelated(topic)
        res.json({ topic, geo, relatedQueries: fake, source: "Mock Data" })
    }
})

app.get('/api/compare', async (req, res) => {
    const t1 = req.query.topic || "5g internet"
    const t2 = req.query.subtopic || "fiber internet"
    const geo = req.query.geo || "US"

    try {
        let g = geo === "Worldwide" ? "" : geo
        const results = await googleTrends.interestOverTime({
            keyword: [t1, t2],
            geo: g,
            startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        })

        const p = JSON.parse(results)
        const timeline = p.default.timelineData
        
        const series1 = []
        const series2 = []

        for (let i = 0; i < timeline.length; i++) {
            series1.push({ date: timeline[i].formattedTime, value: timeline[i].value[0] })
            series2.push({ date: timeline[i].formattedTime, value: timeline[i].value[1] })
        }

        res.json({
            geo,
            mainTopic: { topic: t1, interestOverTime: series1 },
            subTopic: { topic: t2, interestOverTime: series2 },
            source: "Real Google API"
        })

    } catch (error) {
        console.log("compare failed, using mock")
        const d1 = makeFakeData(t1)
        const d2 = makeFakeData(t2)
        
        res.json({
            geo,
            mainTopic: { topic: t1, interestOverTime: d1 },
            subTopic: { topic: t2, interestOverTime: d2 },
            source: "Mock Data"
        })
    }
})

app.listen(PORT, () => {
    console.log(`server running on ${PORT}`)
})