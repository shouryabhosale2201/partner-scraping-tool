const express = require("express");
const router = express.Router();

const salesforceRouter = require("./partners/SalesForce/salesforceRouter");
const oracleRouter = require("./partners/Oracle/oracleRouter");
const shopifyRouter = require("./partners/Shopify/shopifyRouter");
const microsoftRouter = require("./partners/Microsoft/microsoftRouter");
const intuitRouter    = require("./partners/Intuit/intuitRouter");

router.use("/salesforce/", salesforceRouter);
router.use("/oracle/", oracleRouter);
router.use("/shopify/", shopifyRouter);
router.use("/microsoft/",microsoftRouter);
router.use("/intuit/",intuitRouter);


module.exports = router;
