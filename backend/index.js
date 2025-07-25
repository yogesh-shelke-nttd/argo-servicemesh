const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
    origin: '*' // Replace with your frontend's URL
}));
app.get("/api/data", (req, res) => {
    console.log("Received request for data");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.json({ message: "Hello from backend!" });
});
app.get("/health", (req, res) => {
    console.log("Health check request received");
    // res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.send("OK");
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});