const express = require("express");
const cors = require("cors");
const mainRouter = require("./src/routes/mainRouter")
const  shopify = require("./src/routes/partners/Shopify/shopifyScraper")
const  sap = require("./src/routes/partners/SAP/sapScraper")
const  salesforce = require("./src/routes/partners/SalesForce/salesforceScraper")
const  oracle = require("./src/routes/partners/Oracle/oracleScraper")
const  netsuite = require("./src/routes/partners/Netsuite/netsuiteScraper")
const  microsoft = require("./src/routes/partners/Microsoft/microsoftScraper")
const  intuit = require("./src/routes/partners/Intuit/intuitScraper")
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors()); // Enable CORS for all origins

app.use("/api/v1/", mainRouter);

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
