/* -----------------------------------------------------------------------
   Intuit Excel exporter — columns mirror the IntuitTable in the frontend
   ----------------------------------------------------------------------- */
const XLSX = require("xlsx");
const path = require("path");

/* helper: strip HTML & whitespace, return the “Who We Are” paragraph only */
function whoWeAre(html = "") {
  const m = html.match(/<b[^>]*>\s*Who\s+We\s+Are\s*<\/b>([\s\S]*?)(<b|$)/i);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* helper: grab comma-separated values for a given displayName */
function getFieldValues(partner, displayName) {
  const fv = partner.fieldValues?.find(f => f.displayName === displayName);
  if (!fv || !Array.isArray(fv.values)) return "";
  const uniq = [...new Set(fv.values.map(v => v.trim()).filter(Boolean))];
  return uniq.join(", ");
}

function exportToExcel(partners, fileName = "intuit_partners.xlsx") {
  if (!Array.isArray(partners) || partners.length === 0) {
    throw new Error("No partner data supplied");
  }

  /* build rows in the order we want them */
  const rows = partners.map(p => ({
    id                  : p.serialNumber || p.id,
    name                : p.name || "",
    city                : p.addresses?.[0]?.city || "",
    whoWeAre            : whoWeAre(p.profileDescription || p.description || ""),
    industryFocus       : getFieldValues(p, "Industry Focus"),
    productFocus        : getFieldValues(p, "Product Focus"),
    specializedServices : getFieldValues(p, "Specialized Services"),
    website             : p.website || ""
  }));

  /* workbook with autofilter */
  const ws = XLSX.utils.json_to_sheet(rows);
  const lastCol = XLSX.utils.encode_col(Object.keys(rows[0]).length - 1);
  const lastRow = rows.length + 1;
  ws["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Partners");

  const outFile = path.resolve(
    __dirname,
    "../../../../../frontend/public/data",
    fileName
  );
  XLSX.writeFile(wb, outFile);
  return outFile;
}

module.exports = exportToExcel;
