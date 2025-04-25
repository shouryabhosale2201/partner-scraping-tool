import React from "react";
const ProductInfo = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Avalara's Web Scraper</h1>
            <p className="text-l text-left text-gray-600 mb-4">It offers real-time data scraping of partners associated with Oracle, Microsoft, Salesforce, and Shopify, supplying essential details to those who need them.</p>
            <h2 className="text-xl font-bold text-center text-gray-600 mb-4">Why use Avalara's Web Scraper?</h2>
            <ul className="list-disc pl-6 text-base text-gray-600 space-y-2">
                <li>Avalara's Web Scraper swiftly delivers data on thousands of partners.</li>
                <li>Built-in relevant filters help refine search results instantly.</li>
                <li>Eliminates the need for days or months of manual searching.</li>
                <li>Significantly enhances team productivity.</li>
                <li>Allows downloading of all data, along with applied filters, in Excel format for added convenience.</li>
            </ul>
            <h2 className="text-xl font-bold text-center text-gray-600 mb-4 mt-4">How to use it?</h2>
            <p className="text-base text-left text-gray-600 mb-2">Step 1: Select the company whose partners' data is required.</p>
            <p className="text-base text-left text-gray-600 mb-2">Step 2: You'll have 3 options:</p>
            <ul className="list-disc pl-6 text-base text-gray-600 space-y-2">
                <li>Scrape live data present on the websites at that moment (this takes some time).</li>
                <li>Fetch data present already in our database (which can be automatically updated on a daily/weekly basis).</li>
                <li>Download the necessary data in Excel.</li>
            </ul>
        </div>
    )
}
export default ProductInfo;
