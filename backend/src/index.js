const express = require("express");
const cors = require("cors");
// const db = require("./db"); 
// const scrapeData = require("./routes/partners/SalesForce/salesforceScraper");
// const exportToExcel = require("./routes/partners/SalesForce/salesforceExcel");
const mainRouter = require("./routes/mainRouter")

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors()); // Enable CORS for all origins

app.use("/api/v1/", mainRouter);

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
