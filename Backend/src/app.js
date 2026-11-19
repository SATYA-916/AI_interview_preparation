const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const mongoose = require("mongoose")

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin: true,
    credentials: true
}))

/* Health check - used by Render (Advanced > Health Check Path: /health)
   and by the 5-minute keep-alive ping so the free service never sleeps */
function healthHandler(req, res) {
    const dbState = mongoose.connection.readyState // 1 = connected
    const dbConnected = dbState === 1
    // Always HTTP 200: this is Render's liveness/health check - returning
    // 503 when the DB is down would make Render restart-loop the service.
    // Database state is reported in the body instead.
    res.status(200).json({
        status: dbConnected ? "ok" : "degraded",
        service: "ai-interview-backend",
        database: dbConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
    })
}
app.get("/health", healthHandler)
app.get("/api/health", healthHandler)
app.get("/", (req, res) => {
    res.json({ service: "ai-interview-backend", status: "running", health: "/health" })
})

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)



module.exports = app
