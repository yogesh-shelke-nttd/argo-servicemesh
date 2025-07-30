const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({origin: "*"} ));

app.get("/api/data", (req, res) => {
    console.log("Received request for data");
    res.json({ message: "Hello from backend!" });
});
app.get("/health", (req, res) => {
    console.log("Health check request received");
    res.send("OK");
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});