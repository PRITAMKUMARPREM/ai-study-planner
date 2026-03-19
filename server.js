const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/studyplanner")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB connection failed, but proceeding anyway:", err.message));

app.use("/api/ai", require("./routes/aiPlanner"));
app.use("/api/focus", require("./routes/focus"));
app.use("/api/platforms", require("./routes/platforms"));

// Intercept root and redirect to dashboard, skipping the index.html landing page
app.get("/", (req, res) => {
    res.redirect("/dashboard.html");
});

app.use(express.static(__dirname));

// Function to start server dynamically
function startServer(port, callback) {
    const server = app.listen(port, () => {
        console.log(`Express server listening on port ${port}`);
        if (callback) callback(port);
    });
    return server;
}

// Check if run directly or imported via Electron main.js
if (require.main === module) {
    const PORT = process.env.PORT || 5001;
    startServer(PORT);
}

module.exports = { app, startServer };