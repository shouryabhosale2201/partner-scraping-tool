import { useState } from "react";
import axios from "axios";

export default function ScraperApp() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:5000/scrape", { url });
      if (response.data.success) setData(response.data.data);
      else throw new Error(response.data.error);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:5000/fetch");
      if (response.data.success) setData(response.data.data);

      else throw new Error(response.data.error);
      console.log(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDownloadExcel = async () => {
    try {
      const response = await axios.get("http://localhost:5000/downloadExcel", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "partners.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Download failed:", error.message);
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Web Scraper</h1>
        <input
          type="text"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex space-x-3 justify-center">
          <button
            onClick={handleScrape}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            Scrape Data
          </button>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
          >
            Fetch Stored Data
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-4"
          >
            Download Excel
          </button>

        </div>
        {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
      </div>
      {data.length > 0 && (
        <div className="overflow-x-auto px-4 mt-6">
          <table className="table table-xs border border-gray-200 shadow-md rounded-lg w-full">
            <thead className="bg-base-200 text-base font-semibold">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Tagline</th>
                <th>Description</th>
                <th>Expertise</th>
                <th>Industries</th>
                <th>Services</th>
                <th>Extended Description</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={index}
                  className="align-top text-sm text-gray-700 border-b border-gray-300 py-2 last:border-b-0 hover:bg-gray-50 transition"
                >
                  <th className="py-2">{index + 1}</th>
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">{item.tagline}</td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.description}</div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.expertise}</div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.industries}</div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.services}</div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-[100px] overflow-y-auto">{item.extendedDescription}</div>
                  </td>
                  <td className="py-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Tagline</th>
                <th>Description</th>
                <th>Expertise</th>
                <th>Industries</th>
                <th>Services</th>
                <th>Extended Description</th>
                <th>Link</th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}