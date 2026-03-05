import { useState, useCallback, useEffect } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// Load SheetJS from CDN
let XLSXLib = null;
const loadXLSX = () => new Promise((resolve) => {
  if (XLSXLib) { resolve(XLSXLib); return; }
  if (window.XLSX) { XLSXLib = window.XLSX; resolve(XLSXLib); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload = () => { XLSXLib = window.XLSX; resolve(XLSXLib); };
  document.head.appendChild(s);
});

// ── Export Helpers ────────────────────────────────────────────────────────────
function parseEstimateLines(text) {
  // Extract line items: rows that have a dollar amount and Low|Mid|High pattern
  const rows = [];
  let currentSection = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("##")) { currentSection = line.replace(/^#+\s*/, ""); continue; }
    const clean = line.replace(/\*\*/g, "").trim();
    if (!clean) continue;
    // Try to parse lines like "Foundation & Concrete  $40k | $58k | $65k"
    const m = clean.match(/^(.+?)\s+\$?([\d,k\.]+)\s*[|\/]\s*\$?([\d,k\.]+)\s*[|\/]\s*\$?([\d,k\.]+)/);
    if (m) {
      const parse = v => { const n = parseFloat(v.replace(/[,k]/g, v.includes('k') ? '000' : '')); return isNaN(n) ? v : n; };
      rows.push({ Section: currentSection, "Line Item": m[1].trim(), Low: parse(m[2]), Mid: parse(m[3]), High: parse(m[4]) });
    } else if (clean.length > 2 && !clean.startsWith("▸") && currentSection) {
      rows.push({ Section: currentSection, "Line Item": clean, Low: "", Mid: "", High: "" });
    }
  }
  return rows;
}

async function exportToExcel(estimate, formMeta) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Estimate line items
  const rows = parseEstimateLines(estimate);
  const ws1 = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Section: "", "Line Item": estimate.slice(0, 200), Low: "", Mid: "", High: "" }]);
  ws1["!cols"] = [{ wch: 28 }, { wch: 42 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Estimate");

  // Sheet 2: Benchmarks from both seed jobs
  const benchRows = [
    ["Trade", "57th St Total", "57th $/sqft (5050sf)", "50th Ave Total", "50th $/sqft (3860sf)", "Average $/sqft"],
    ["Foundation",          58729.63, (58729.63/5050).toFixed(2), 40304.09, (40304.09/3860).toFixed(2), ((58729.63/5050+40304.09/3860)/2).toFixed(2)],
    ["Framing + Lumber",    148837.38,(148837.38/5050).toFixed(2),94983.86, (94983.86/3860).toFixed(2), ((148837.38/5050+94983.86/3860)/2).toFixed(2)],
    ["Backfill & Utilities",108201.35,(108201.35/5050).toFixed(2),56114.59, (56114.59/3860).toFixed(2), ((108201.35/5050+56114.59/3860)/2).toFixed(2)],
    ["Electrical",          55920.58, (55920.58/5050).toFixed(2), 55502.34, (55502.34/3860).toFixed(2), ((55920.58/5050+55502.34/3860)/2).toFixed(2)],
    ["Plumbing",            74716.60, (74716.60/5050).toFixed(2), 68085.69, (68085.69/3860).toFixed(2), ((74716.60/5050+68085.69/3860)/2).toFixed(2)],
    ["HVAC",                48458.88, (48458.88/5050).toFixed(2), 37519.13, (37519.13/3860).toFixed(2), ((48458.88/5050+37519.13/3860)/2).toFixed(2)],
    ["Siding",              59733.60, (59733.60/5050).toFixed(2), 32067.10, (32067.10/3860).toFixed(2), ((59733.60/5050+32067.10/3860)/2).toFixed(2)],
    ["Roofing",             22480.00, (22480.00/5050).toFixed(2), 26539.19, (26539.19/3860).toFixed(2), ((22480.00/5050+26539.19/3860)/2).toFixed(2)],
    ["Drywall",             57467.10, (57467.10/5050).toFixed(2), 40388.10, (40388.10/3860).toFixed(2), ((57467.10/5050+40388.10/3860)/2).toFixed(2)],
    ["Cabinetry",           37463.95, (37463.95/5050).toFixed(2), 28830.31, (28830.31/3860).toFixed(2), ((37463.95/5050+28830.31/3860)/2).toFixed(2)],
    ["Hardwood Floors",     45342.82, (45342.82/5050).toFixed(2), 48828.28, (48828.28/3860).toFixed(2), ((45342.82/5050+48828.28/3860)/2).toFixed(2)],
    ["Landscape",           68430.72, (68430.72/5050).toFixed(2), 56949.80, (56949.80/3860).toFixed(2), ((68430.72/5050+56949.80/3860)/2).toFixed(2)],
    ["Windows",             36463.43, (36463.43/5050).toFixed(2), 23033.62, (23033.62/3860).toFixed(2), ((36463.43/5050+23033.62/3860)/2).toFixed(2)],
    ["Doors & Millwork",    38085.27, (38085.27/5050).toFixed(2), 31998.13, (31998.13/3860).toFixed(2), ((38085.27/5050+31998.13/3860)/2).toFixed(2)],
    ["Tile",                34322.51, (34322.51/5050).toFixed(2), 38514.71, (38514.71/3860).toFixed(2), ((34322.51/5050+38514.71/3860)/2).toFixed(2)],
    ["Exterior Paint",      32636.01, (32636.01/5050).toFixed(2), 25714.31, (25714.31/3860).toFixed(2), ((32636.01/5050+25714.31/3860)/2).toFixed(2)],
    ["TOTAL",               1229439.32,(1229439.32/5050).toFixed(2),881750.72,(881750.72/3860).toFixed(2),((1229439.32/5050+881750.72/3860)/2).toFixed(2)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(benchRows);
  ws2["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, "$/sqft Benchmarks");

  // Sheet 3: Project metadata
  const meta = [
    ["Field", "Value"],
    ["Project Type", formMeta?.projectType || ""],
    ["Total Sqft", formMeta?.sqft || ""],
    ["Unit Count", formMeta?.units || ""],
    ["Location", formMeta?.location || ""],
    ["Timeline", formMeta?.timeline || ""],
    ["Scope", formMeta?.description || ""],
    ["Generated", new Date().toLocaleString()],
    ["Reference Jobs", "3407 NW 57th St ($1,229,439 · $243/sqft) | 5017 50th Ave SW ($881,751 · $228/sqft)"],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(meta);
  ws3["!cols"] = [{ wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Project Info");

  const date = new Date().toISOString().slice(0, 10);
  const slug = (formMeta?.description || "estimate").slice(0, 30).replace(/[^a-z0-9]/gi, "_");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BuildCost_${slug}_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function exportToPDF(estimate, formMeta) {
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>BuildCost Estimate</title>
<style>
  body { font-family: 'Courier New', monospace; background: #fff; color: #1a1a2e; margin: 0; padding: 32px 40px; font-size: 11px; }
  .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .logo { font-size: 20px; font-weight: 700; color: #1d4ed8; letter-spacing: -0.5px; }
  .subtitle { font-size: 9px; color: #64748b; letter-spacing: 0.12em; margin-top: 3px; }
  .date { font-size: 10px; color: #64748b; text-align: right; }
  .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .meta-item { font-size: 10px; } .meta-label { color: #94a3b8; font-size: 9px; letter-spacing: 0.1em; }
  .section { margin-bottom: 20px; }
  .section-title { background: #1d4ed8; color: #fff; padding: 7px 14px; font-size: 9px; letter-spacing: 0.12em; font-weight: 700; border-radius: 4px 4px 0 0; }
  .section-body { border: 1px solid #e2e8f0; border-top: none; padding: 12px 14px; border-radius: 0 0 4px 4px; }
  .line { padding: 3px 0; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; color: #334155; line-height: 1.6; }
  .line:last-child { border-bottom: none; }
  .total-line { font-weight: 700; font-size: 12px; color: #1d4ed8; border-top: 2px solid #1d4ed8 !important; padding-top: 8px; margin-top: 4px; }
  .benchmarks { font-size: 9px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 16px 20px; } }
</style>
</head>
<body>
<div class="header">
  <div><div class="logo">🏗 BuildCost AI</div><div class="subtitle">BUNGALOW BUILDING CORP · CONSTRUCTION ESTIMATOR</div></div>
  <div class="date">Generated: ${date}</div>
</div>
<div class="meta">
  <div><div class="meta-label">PROJECT TYPE</div><div class="meta-item">${formMeta?.projectType||"—"}</div></div>
  <div><div class="meta-label">SQUARE FOOTAGE</div><div class="meta-item">${formMeta?.sqft ? Number(formMeta.sqft).toLocaleString() + " sqft" : "—"}</div></div>
  <div><div class="meta-label">UNIT COUNT</div><div class="meta-item">${formMeta?.units||"—"} units</div></div>
  <div><div class="meta-label">LOCATION</div><div class="meta-item">${formMeta?.location||"—"}</div></div>
  <div><div class="meta-label">TIMELINE</div><div class="meta-item">${formMeta?.timeline||"—"}</div></div>
  <div><div class="meta-label">REFERENCES</div><div class="meta-item">57th $243/sqft · 50th Ave $228/sqft · Alonzo $247/sqft · Avg $240/sqft</div></div>
  <div style="grid-column:1/-1"><div class="meta-label">SCOPE</div><div class="meta-item">${formMeta?.description||"—"}</div></div>
</div>
${estimate.split(/\n(?=## )/).map(section => {
  const lines = section.split("\n");
  const isH = lines[0]?.startsWith("##");
  const title = isH ? lines[0].replace(/^#+\s*/, "") : "ESTIMATE";
  const body = (isH ? lines.slice(1) : lines).filter(l => l.trim());
  return `<div class="section">
    <div class="section-title">${title.toUpperCase()}</div>
    <div class="section-body">
      ${body.map(l => {
        const clean = l.replace(/\*\*/g, "").replace(/^[-•▸]\s*/, "").trim();
        const isTotal = /total project estimate/i.test(clean);
        return `<div class="line${isTotal ? " total-line" : ""}">${clean}</div>`;
      }).join("")}
    </div>
  </div>`;
}).join("")}
<div class="benchmarks">
  <strong>$/SQFT REFERENCE:</strong> Foundation $11/sf · Framing+Lumber $27/sf · Electrical $13/sf · Plumbing $16/sf · HVAC $10/sf · Siding $10/sf · Roofing $6/sf · Drywall $11/sf · Landscape $14/sf · Total avg $236/sf
</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ── Seed Jobs ─────────────────────────────────────────────────────────────────
const SEED_JOBS = [
  {
    id: "seed-1",
    name: "3407 NW 57th St",
    notes: "3 units: Unit 1 @ 2,400 sqft (w/garage), Unit 2 @ 1,250 sqft (w/garage), Unit 3 @ 1,400 sqft — 5,050 sqft total",
    sqft: 5050,
    rowCount: 347,
    skippedNegative: 18,
    grandTotal: 1229439.32,
    hasClass: true,
    byClass: {
      "Backfill and Utilities (sewer, water. storm)": 108201.35,
      "Lumber":                          81500.20,
      "Plumbing & Plumbing Fixtures":    74716.60,
      "Landscape, Rockeries, Walkway":   68430.72,
      "Framing, Materials, Trusses":     67733.85,
      "Siding":                          59733.60,
      "Cabinetry & Countertops":         59434.64,  // $37,464 original + $21,971 Western Title countertops
      "Foundation":                      58729.63,
      "Drywall":                         57467.10,
      "Electrical":                      55920.58,
      "HVAC, Gas Piping, Venting":       48458.88,
      "Hardwood Floors":                 45342.82,
      "Demo, Exterm, Abate":             45218.68,  // +$4,604 TI demo / Kieran / cleaning
      "Doors & Millwork":                38085.27,
      "Windows":                         36463.43,
      "Excavation, Demo, Site Prep":     35394.60,
      "Decking, Waterproofing, Railing": 35372.87,
      "Appliances":                      34431.44,  // +$21,755 Albert Lee (was missing class)
      "Tile":                            34322.51,
      "Exterior Paint":                  32636.01,
      "Misc":                            32535.43,
      "Finish Carpentry":                22721.68,  // +$6,157 AAA Kartak closets
      "Roofing":                         24191.85,  // +$1,712 ACP gutters
      "Insulation":                      15986.01,
      "Fixtures & Hardware":             10898.13,
      "Temp Services, Utilities, Waste": 10485.94,
      "legal":                           10055.53,
      "Staging":                          8717.65,  // Avia Home Staging — sales cost, not hard construction
      "Mirrors, Shower Doors":            5462.04,
      "Survey":                           2008.33,  // B E Winters standard survey — repeatable every project
      "Condo Docs":                        4970.00,  // B E Winters Inv 18029 condo recording — ONE-TIME, condo conversion only
      "Inspections/Geotech":              1857.51,
      "Permits, Plans, Fees":             1276.03,
      "Insurance":                         555.75,
      "Interior Paint & Finishes":         122.66,
    },
    byPillar: { Labor: 0, Materials: 410000, Subcontractors: 671000, Other: 148439 },
  },
  {
    id: "seed-2",
    name: "5017 50th Ave SW",
    notes: "3 units: Unit 1 @ 986 sqft, Unit 2 @ 1,244 sqft (w/garage), Unit 3 @ 1,102 sqft — 3,860 sqft total (3,585 livable + 275 garage). Flat/simple site. Budget-format data used (more complete than QB — captures $53,500 architectural fees missing from QB).",
    sqft: 3860,
    rowCount: 43,
    skippedNegative: 0,
    grandTotal: 917705,
    hasClass: true,
    byClass: {
      "Plumbing & Plumbing Fixtures":                 66552,
      "Landscape, Rockeries, Walkway":                56950,
      "Backfill and Utilities (sewer, water. storm)": 56115,
      "Electrical":                                   55502,
      "Architectural":                                53500,
      "Lumber":                                       49404,
      "Hardwood Floors":                              48838,
      "Framing, Materials, Trusses":                  45580,
      "Drywall":                                      40388,
      "Foundation":                                   40304,
      "Tile":                                         38515,
      "HVAC, Gas Piping, Venting":                    37519,
      "Siding":                                       32067,
      "Doors & Millwork":                             31998,
      "Cabinetry & Countertops":                      29746,
      "Roofing":                                      29622,
      "Exterior Paint":                               25714,
      "Windows":                                      25034,
      "Excavation, Demo, Site Prep":                  24601,
      "Demo, Exterm, Abate":                          23237,
      "Appliances":                                   17148,
      "Temp Services, Utilities, Waste":              15532,
      "legal":                                        11576,
      "Survey":                                       10852,
      "Fixtures & Hardware":                           9307,
      "Misc":                                          8797,
      "Insulation":                                    7154,
      "Permits, Plans, Fees":                          6721,
      "Finish Carpentry":                              6274,
      "Mirrors, Shower Doors":                         5751,
      "Decking, Waterproofing, Railing":               4149,
      "Inspections/Geotech":                           1431,
      "Accounting":                                    1425,
      "Engineering":                                    400,
    },
    byPillar: { Labor: 0, Materials: 370000, Subcontractors: 400000, Other: 111750 },
  },
  {
    id: "seed-3",
    name: "7032 Alonzo Ave NW",
    notes: "3 units · 4,166 interior + 308 garage = 4,474 sqft total · Flat/simple site. Budget/cost-code format. $20k excavation credit applied post-completion.",
    sqft: 4474,
    rowCount: 43,
    skippedNegative: 1,
    grandTotal: 1105091,
    hasClass: true,
    byClass: {
      "Framing, Materials, Trusses":                 120835,
      "Excavation, Demo, Site Prep":                  92621,
      "Landscape, Rockeries, Walkway":                83014,
      "Plumbing & Plumbing Fixtures":                 68149,
      "Foundation":                                   67042,
      "Electrical":                                   62130,
      "Cabinetry & Countertops":                      61034,
      "Drywall":                                      56169,
      "Siding":                                       54073,
      "Tile":                                         44939,
      "Hardwood Floors":                              42825,
      "HVAC, Gas Piping, Venting":                    37839,
      "Backfill and Utilities (sewer, water. storm)": 29624,
      "Doors & Millwork":                             29127,
      "Interior Paint & Finishes":                    27659,
      "Misc":                                         27034,
      "Appliances":                                   23648,
      "Roofing":                                      20655,
      "Finish Carpentry":                             19816,
      "Permits, Plans, Fees":                         19772,
      "Windows":                                      19670,
      "Demo, Exterm, Abate":                          16711,
      "Mirrors, Shower Doors":                        13652,
      "Insulation":                                   13261,
      "Decking, Waterproofing, Railing":              11945,
      "Survey":                                       10603,
      "Accounting":                                    8000,
      "legal":                                         7822,
      "Exterior Paint":                                5310,
      "Temp Services, Utilities, Waste":               3806,
      "Inspections/Geotech":                           3785,
      "Engineering":                                   2415,
      "Architectural":                                  106,
    },
    byPillar: { Labor: 0, Materials: 420000, Subcontractors: 560000, Other: 125091 },
  },
  {
    id: "seed-4",
    name: "8608 30th Ave SW",
    notes: "3 units · 4,225 sqft total · Flat site, simple build (West Seattle). All hardwood floors, no carpet/vinyl. Superintendent cost excluded from benchmarks.",
    sqft: 4225,
    rowCount: 45,
    skippedNegative: 0,
    grandTotal: 1029051,
    hasClass: true,
    byClass: {
      "Framing, Materials, Trusses":                 128925,
      "Landscape, Rockeries, Walkway":                75774,
      "Plumbing & Plumbing Fixtures":                 66808,
      "Excavation, Demo, Site Prep":                  64803,
      "Backfill and Utilities (sewer, water. storm)": 62246,
      "Cabinetry & Countertops":                      61366,
      "Siding":                                       54641,
      "Electrical":                                   51014,
      "Foundation":                                   50321,
      "Drywall":                                      44904,
      "Hardwood Floors":                              41895,
      "HVAC, Gas Piping, Venting":                    38060,
      "Roofing":                                      27251,
      "Tile":                                         26528,
      "Doors & Millwork":                             24473,
      "Windows":                                      23785,
      "Interior Paint & Finishes":                    23672,
      "Misc":                                         22465,
      "Permits, Plans, Fees":                         18691,
      "Finish Carpentry":                             18233,
      "Appliances":                                   18086,
      "Exterior Paint":                               13230,
      "Insulation":                                   11793,
      "Engineering":                                  10770,
      "Mirrors, Shower Doors":                        10534,
      "legal":                                         9551,
      "Decking, Waterproofing, Railing":               6845,
      "Accounting":                                    6000,
      "Demo, Exterm, Abate":                           5224,
      "Survey":                                        3500,
      "Inspections/Geotech":                           3278,
      "Temp Services, Utilities, Waste":               3108,
      "Architectural":                                 1277,
    },
    byPillar: { Labor: 0, Materials: 390000, Subcontractors: 510000, Other: 129051 },
  },
  {
    id: "seed-5",
    name: "1423 Madrona Dr",
    notes: "2 units · 3,665 sqft total · COMPLEX steep slope site. Madrona — premium finish level. Foundation $80k (vs ~$52k flat avg), Backfill/Utilities $95k (vs ~$57k flat avg). +$77/sqft premium over flat sites.",
    sqft: 3665,
    rowCount: 44,
    skippedNegative: 0,
    grandTotal: 1171945,
    hasClass: true,
    byClass: {
      "Framing, Materials, Trusses":                 148511,
      "Backfill and Utilities (sewer, water. storm)": 94643,
      "Foundation":                                   80332,
      "Plumbing & Plumbing Fixtures":                 63484,
      "Siding":                                       59337,
      "Cabinetry & Countertops":                      54008,
      "Landscape, Rockeries, Walkway":                52066,
      "Hardwood Floors":                              50892,  // includes $11,640 reclassified from carpet/vinyl
      "Tile":                                         50076,
      "Excavation, Demo, Site Prep":                  44010,
      "Electrical":                                   42205,
      "Drywall":                                      41121,
      "HVAC, Gas Piping, Venting":                    35401,
      "Interior Paint & Finishes":                    35097,
      "Decking, Waterproofing, Railing":              32086,
      "Windows":                                      29900,
      "Doors & Millwork":                             29167,
      "Roofing":                                      28853,
      "Appliances":                                   26581,
      "Demo, Exterm, Abate":                          23672,
      "Insulation":                                   21442,
      "Misc":                                         21364,
      "Survey":                                       18479,
      "Engineering":                                  18233,
      "Finish Carpentry":                             18038,
      "Mirrors, Shower Doors":                        10548,
      "Permits, Plans, Fees":                         10357,
      "Inspections/Geotech":                           7618,
      "Fireplaces":                                    7331,
      "Exterior Paint":                                6615,
      "Accounting":                                    6000,
      "Temp Services, Utilities, Waste":               2455,
      "legal":                                         2023,
    },
    byPillar: { Labor: 0, Materials: 430000, Subcontractors: 610000, Other: 131945 },
  },
  {
    id: "seed-6",
    name: "4052 31st Ave W",
    notes: "1-unit DADU · 1,476 sqft (1,220 heated) · COMPLEX steep slope · Built for client (no purchase price) · Tagged separately — different building type from multi-unit projects. High $/sqft partly due to fixed site/slope costs spread over small footprint.",
    sqft: 1476,
    rowCount: 43,
    skippedNegative: 1,
    grandTotal: 490943,
    hasClass: true,
    buildingType: "ADU/DADU",
    byClass: {
      "Excavation, Demo, Site Prep":                  54865,
      "Landscape, Rockeries, Walkway":                53976,
      "Framing, Materials, Trusses":                  46867,
      "Foundation":                                   45346,
      "Backfill and Utilities (sewer, water. storm)": 24101,
      "Siding":                                       19809,
      "Tile":                                         18957,
      "Plumbing & Plumbing Fixtures":                 18242,
      "Survey":                                       16868,
      "Electrical":                                   17634,
      "Drywall":                                      16535,
      "Cabinetry & Countertops":                      14572,
      "Hardwood Floors":                              14034,
      "HVAC, Gas Piping, Venting":                    12794,
      "Doors & Millwork":                             12754,
      "Misc":                                         11262,
      "Roofing":                                      11045,
      "Interior Paint & Finishes":                    10428,
      "Permits, Plans, Fees":                         10162,
      "Demo, Exterm, Abate":                          10000,
      "Accounting":                                    8000,
      "legal":                                         6893,
      "Engineering":                                   6695,
      "Windows":                                       6511,
      "Finish Carpentry":                              5742,
      "Insulation":                                    5168,
      "Appliances":                                    3835,
      "Exterior Paint":                                2759,
      "Mirrors, Shower Doors":                         2725,
      "Inspections/Geotech":                           1623,
      "Architectural":                                  454,
      "Decking, Waterproofing, Railing":                287,
    },
    byPillar: { Labor: 0, Materials: 180000, Subcontractors: 260000, Other: 50943 },
  },
];

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const cols = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || "").replace(/^"|"$/g, "")]));
  });
}

function processJobData(rows, jobName, jobSqft) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  const classKey   = keys.find(k => /^class$/i.test(k.trim()));
  const amtKey     = keys.find(k => /^amount$|^total$|^debit$|^cost$/i.test(k.trim())) || keys.find(k => /amount|cost|total|debit/i.test(k));
  const accountKey = keys.find(k => /account|category/i.test(k));
  const itemKey    = keys.find(k => /item|description|memo/i.test(k));
  const parseAmt = v => { if (!v) return 0; const s = String(v).replace(/[$,\s]/g,""); if (/^\(.*\)$/.test(s)) return -parseFloat(s.replace(/[()]/g,""))||0; return parseFloat(s)||0; };
  const classify = (c,a,i) => { const all=[c,a,i].join(" ").toLowerCase(); if(/\blab(or|our)\b|wages?|payroll/i.test(all)) return "Labor"; if(/\bsub(contractor)?s?\b|outside\s+labor|1099/i.test(all)) return "Subcontractors"; if(/\bmat(erials?|l)?\b|supplies|lumber|hardware|parts/i.test(all)) return "Materials"; if(c&&c.trim()&&c.toLowerCase()!=="uncategorized") return c.trim(); return "Other"; };
  const byClass={}, byPillar={Labor:0,Materials:0,Subcontractors:0,Other:0};
  let grandTotal=0, skippedNegative=0, rowCount=0;
  for (const row of rows) {
    const amt = parseAmt(amtKey ? row[amtKey] : Object.values(row).find(v=>/^\(?\$?[\d,]+\.?\d*\)?$/.test((v||"").trim())));
    if (amt<=0) { if(amt<0) skippedNegative++; continue; }
    rowCount++;
    const c=classKey?row[classKey]:"", a=accountKey?row[accountKey]:"", it=itemKey?row[itemKey]:"";
    const label=c?.trim()||a?.trim()||"Other";
    byClass[label]=(byClass[label]||0)+amt;
    byPillar[classify(c,a,it)]=(byPillar[classify(c,a,it)]||0)+amt;
    grandTotal+=amt;
  }
  return { id:Date.now()+Math.random(), name:jobName, notes:"", sqft:jobSqft||null, rowCount, skippedNegative, grandTotal, byClass, byPillar, hasClass:!!classKey };
}

// ── AI System Prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt(jobs) {
  const summaries = jobs.map(j => {
    const sqftLine = j.sqft ? `  Square Footage: ${j.sqft.toLocaleString()} sqft (${(j.grandTotal/j.sqft).toFixed(2)}/sqft)` : "  Square Footage: Unknown";
    const classBkd = Object.entries(j.byClass).sort((a,b)=>b[1]-a[1])
      .map(([k,v]) => {
        const psf = j.sqft ? ` ($${(v/j.sqft).toFixed(2)}/sqft)` : "";
        return `    ${k}: $${v.toLocaleString(undefined,{maximumFractionDigits:0})}${psf}`;
      }).join("\n");
    return `JOB: "${j.name}"
  ${j.notes || ""}
${sqftLine}
  Total Hard Cost: $${j.grandTotal.toLocaleString(undefined,{maximumFractionDigits:0})}
  Transactions: ${j.rowCount} rows (${j.skippedNegative} reimbursements/deposits excluded)
  Class Breakdown:
${classBkd}`;
  }).join("\n\n---\n\n");

  return `You are an expert construction cost estimator for Bungalow Building Corporation, a Seattle residential developer specializing in multi-unit new construction condos and townhomes. You have real QuickBooks job cost data — all figures are actual paid expenses, reimbursements excluded.

HISTORICAL JOB DATA:
${summaries}

CONTEXT:
- All projects are Seattle new construction, 3-unit buildings by Bungalow Building Corp
- 3407 NW 57th St (Ballard):       5,050 sqft → $1,229,439 → $243/sqft
  Unit mix: 1@2,400sqft (w/garage), 2@1,250sqft (w/garage), 3@1,400sqft
- 5017 50th Ave SW (West Seattle):  3,860 sqft → $917,705   → $238/sqft
  Unit mix: 1@986sqft, 2@1,244sqft (w/garage), 3@1,102sqft
- 7032 Alonzo Ave NW:               4,474 sqft → $1,105,091 → $247/sqft
  3 units · 4,166 interior + 308 garage · $20k excavation credit applied
- 8608 30th Ave SW (West Seattle):  4,225 sqft → $1,029,051 → $244/sqft  [FLAT/SIMPLE]
- 1423 Madrona Dr:                  3,665 sqft → $1,171,945 → $320/sqft  [COMPLEX — steep slope, premium finishes, 2 units]
- 4052 31st Ave W:                  1,476 sqft → $490,943   → $333/sqft  [ADU/DADU — 1 unit, steep slope, built for client — SEPARATE BUILDING TYPE]

⚠ DO NOT include 4052 31st Ave W in multi-unit $/sqft averages. It is a different building type.
The high $/sqft ($333) is partly explained by fixed site/slope costs ($227k = $154/sqft) spread over a small 1,476 sqft footprint. The same fixed costs on a 4,000 sqft project would be ~$57/sqft.

ADU/DADU BENCHMARKS (31st Ave — steep slope, 1 unit):
Total hard cost: $490,943 · $333/sqft
Key slope costs: Excavation $54,865 · Landscape/retaining $53,976 · Foundation $45,346 · Survey $16,868
Use this as reference ONLY when estimating single-unit ADU/DADU projects on steep sites.

SITE COMPLEXITY BENCHMARKS:
FLAT/SIMPLE avg (50th Ave, Alonzo, 30th Ave):   $243/sqft  range $238–$247
57th St (moderate):                              $243/sqft
COMPLEX (Madrona — steep slope + premium):       $320/sqft  (+$77/sqft or +32% over flat)

COMPLEXITY PREMIUM DRIVERS at Madrona vs flat avg:
  Foundation:        $80,332 vs $52k flat avg  → +$7.67/sqft (steep slope concrete)
  Backfill/Utilities:$94,643 vs $57k flat avg  → +$10.39/sqft (complex utility runs)
  Survey/Geotech:    $18,479 vs $8.5k flat avg → +$2.71/sqft (geotech required)
  Engineering:       $18,233 vs $7.9k flat avg → +$2.83/sqft (structural for slope)
  Decking/Railing:   $32,086 vs $6.2k flat avg → +$7.06/sqft (complex steel/stairs)
  Insulation:        $21,442 vs $12k flat avg  → +$2.50/sqft
  TOTAL IDENTIFIED:                             → +$33/sqft of the $77 total premium
  Remaining ~$44/sqft premium: higher finishes (tile $50k, hardwood $51k), larger framing scope

ESTIMATION GUIDANCE BY SITE TYPE:
- Flat/simple 3-unit: anchor at $240–$250/sqft base
- Moderate complexity: $250–$265/sqft
- Steep slope / shoring / heavy concrete: $300–$325/sqft (Madrona at $320 is the reference)
- All ranges exclude staging, interest, purchase price, and soft financing costs
- Add $10–$14/sqft for architectural if not yet captured in project budget

IMPORTANT — GAP TO OWNER'S EXPECTED RANGE:
Owner expects $250–$275/sqft. Historical average is $242.94/sqft.
Gap likely reflects architectural/soft costs not fully captured across all jobs.
Use $250–$275/sqft as working estimate range; flag that actuals have averaged $243.
Budget $10–$14/sqft for architectural based on 50th Ave actuals where it was fully captured.

NOTE: Alonzo excavation ($20.70/sqft) and 30th Ave excavation ($15.34/sqft, includes alley/street improvements) are both higher than 50th Ave ($6.37). Normal excavation range without site complications is $6–$8/sqft.

VENDOR CATEGORIZATION RULES (always apply these):
- AAA Kartak Co → always Finish Carpentry (closet organization systems)
- B E Winters / Chadwick & Winters → Survey for standard survey work; "Condo Docs" invoice → one-time Condo Docs cost (only for condo conversions, not standard new construction)
- Russell + Lambert → Survey
- Western Tile Inc (shows as "Western Title" in QB) → Tile when QB class is Tile; Cabinetry & Countertops when memo says "Countertops" — they do both tile installation and countertop supply/install
- Avia Home Staging & Design → Staging (sales/marketing cost, NOT hard construction — exclude from build cost estimates)
- ACP General Contracting → Roofing (gutters)
- True Clean LLC / MJL Cleaning / J J House Cleaning → Temp Services (post-construction cleaning)
- Albert Lee → Appliances

IMPORTANT ESTIMATION NOTE: Condo Docs ($4,970–$8,700 range) should be called out as a one-time cost only applicable to condo conversions. For standard new construction or townhomes, exclude this line. If the user says "no condo docs needed," remove this line from the estimate entirely.
- Your subcontractors include: Black Wolf Construction (framing), Rainstate Earthworks (excavation/utilities), Star Electric, Plumbing Group LLC, Comfy Air LLC (HVAC), GL Siding / New Beginnings (siding), Puzzle/AAA Roofing, Arreguin's Drywall, M Finish Coat Painting, Green Edging Landscaping, Pinnacle Custom Floors, New Renaissance (finish carpentry), Bellmont (cabinetry)
- Typical material suppliers: Chinook Lumber, DMS Supply, Lake Washington Windows, New Standard Building Materials, Western Title (countertops)

ESTIMATION INSTRUCTIONS:
Respond with exactly three sections:

## COST-PER-SQUARE-FOOT BENCHMARKS
Show $/sqft for 3407 NW 57th St (use 5,050 sqft). For 5017 50th Ave SW, note sqft is unknown.
Table columns: Category | 57th St Total | 57th St $/sqft | 50th Ave Total
Key trades: Foundation, Framing+Lumber, Electrical, Plumbing, HVAC, Siding, Roofing, Drywall, Cabinetry+Finishes, Landscape, Backfill/Site

## COST ESTIMATE BY CATEGORY
Line-item estimate with Low | Mid | High. Scale from the 57th St $/sqft benchmarks.
Lines:
- Site Work / Excavation / Demo
- Foundation & Concrete  
- Framing, Lumber & Trusses
- Roofing
- Windows & Exterior Doors
- Siding & Exterior
- Electrical
- Plumbing & Fixtures
- HVAC & Gas
- Insulation
- Drywall
- Hardwood Floors & Tile
- Interior Finishes (paint, millwork, carpentry)
- Cabinetry & Countertops
- Appliances
- Landscaping & Site
- Permits, Engineering, Legal, Survey
- Backfill, Utilities, Site Infrastructure
- Contingency & Overhead (12%)
- **TOTAL PROJECT ESTIMATE**

## CONFIDENCE & ASSUMPTIONS
- Confidence level and why
- Key assumptions (sqft, unit mix, finish level)
- Risks that could push costs above the high estimate
- Note any significant differences between the two reference jobs

Be specific. Use real numbers from the data. Do not invent figures.`;
}

const PILLAR_COLORS = { Labor:"#3b82f6", Materials:"#10b981", Subcontractors:"#f59e0b", Other:"#6366f1" };

// ── Paste Modal ───────────────────────────────────────────────────────────────
function PasteModal({ onAdd, onClose }) {
  const [csv, setCsv]   = useState("");
  const [name, setName] = useState("");
  const [sqft, setSqft] = useState("");
  const [err, setErr]   = useState("");

  const handle = () => {
    if (!csv.trim()) { setErr("Paste CSV data first."); return; }
    if (!name.trim()) { setErr("Enter a job name."); return; }
    const rows = parseCSV(csv);
    if (rows.length < 2) { setErr("Couldn't parse — make sure the first row has column headers."); return; }
    const job = processJobData(rows, name.trim(), sqft ? parseInt(sqft) : null);
    if (!job || job.grandTotal === 0) { setErr("No positive cost values found."); return; }
    onAdd(job); onClose();
  };

  const inp = { background:"rgba(5,13,31,0.9)", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { color:"#334155", fontSize:9, letterSpacing:"0.12em", marginBottom:5, display:"block", fontWeight:700 };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#06111e", border:"1px solid #1e3a5f", borderRadius:16, padding:28, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Add Another Job</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#334155", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
          <div><label style={lbl}>JOB NAME</label><input type="text" placeholder="e.g. 1234 Main St" value={name} onChange={e=>setName(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>TOTAL SQFT</label><input type="number" placeholder="e.g. 4200" value={sqft} onChange={e=>setSqft(e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>PASTE CSV DATA</label>
          <textarea value={csv} onChange={e=>{setCsv(e.target.value);setErr("");}} placeholder={"Date,Class,Account,Amount\n..."} rows={8} style={{...inp,resize:"vertical",fontSize:11,lineHeight:1.6}} />
        </div>
        {csv && <div style={{fontSize:10,color:"#334155",marginBottom:10}}>{csv.trim().split("\n").length} rows detected</div>}
        {err && <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:12,marginBottom:12}}>⚠ {err}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid #1e3a5f", borderRadius:9, padding:"11px", color:"#334155", cursor:"pointer", fontSize:12, fontWeight:700 }}>Cancel</button>
          <button onClick={handle} style={{ flex:2, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:9, padding:"11px", color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700 }}>+ Add Job</button>
        </div>
      </div>
    </div>
  );
}

// ── Update Sqft Modal ─────────────────────────────────────────────────────────
function SqftModal({ job, onSave, onClose }) {
  const [val, setVal] = useState(job.sqft || "");
  const [notes, setNotes] = useState(job.notes || "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#06111e", border:"1px solid #1e3a5f", borderRadius:16, padding:28, width:"100%", maxWidth:460 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginBottom:18 }}>Edit: {job.name}</div>
        <div style={{ marginBottom:12 }}>
          <label style={{ color:"#334155", fontSize:9, letterSpacing:"0.12em", marginBottom:5, display:"block", fontWeight:700 }}>TOTAL SQUARE FOOTAGE</label>
          <input type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="e.g. 4100"
            style={{ background:"rgba(5,13,31,0.9)", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ color:"#334155", fontSize:9, letterSpacing:"0.12em", marginBottom:5, display:"block", fontWeight:700 }}>UNIT MIX / NOTES</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
            style={{ background:"rgba(5,13,31,0.9)", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:12, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid #1e3a5f", borderRadius:9, padding:"11px", color:"#334155", cursor:"pointer", fontSize:12, fontWeight:700 }}>Cancel</button>
          <button onClick={()=>onSave(val?parseInt(val):null, notes)} style={{ flex:2, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:9, padding:"11px", color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onRemove, onEdit, isSeed }) {
  const [open, setOpen] = useState(false);
  const t = job.grandTotal;
  const psf = job.sqft ? `$${(t/job.sqft).toFixed(0)}/sqft` : "sqft TBD";

  return (
    <div style={{ background:"rgba(10,20,40,0.9)", border:`1px solid ${isSeed?"#1d4ed8":"#1e3a5f"}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:13 }}>{job.name}</div>
          {job.notes && <div style={{ color:"#334155", fontSize:10, marginTop:2 }}>{job.notes}</div>}
          <div style={{ color:"#334155", fontSize:10, marginTop:3 }}>
            {job.rowCount} transactions · {job.skippedNegative} excluded
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"#f59e0b", fontWeight:700, fontSize:14 }}>${(t/1000).toFixed(0)}k</div>
          <div style={{ color:"#1d4ed8", fontSize:10, fontWeight:600 }}>{psf}</div>
        </div>
        <button onClick={()=>onEdit(job)} title="Edit sqft/notes" style={{ background:"rgba(29,78,216,0.1)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:6, color:"#60a5fa", cursor:"pointer", padding:"3px 8px", fontSize:10 }}>✏</button>
        <button onClick={()=>setOpen(o=>!o)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e3a5f", borderRadius:6, color:"#334155", cursor:"pointer", padding:"3px 9px", fontSize:11 }}>{open?"▲":"▼"}</button>
        {!isSeed && <button onClick={onRemove} style={{ background:"none", border:"none", color:"#1e3a5f", cursor:"pointer", fontSize:15 }}>✕</button>}
      </div>

      <div style={{ height:4, display:"flex", margin:"0 18px 12px", borderRadius:3, overflow:"hidden" }}>
        {Object.entries(job.byPillar).filter(([,v])=>v>0).map(([k,v])=>(
          <div key={k} title={`${k}: $${v.toLocaleString()}`} style={{ flex:v, background:PILLAR_COLORS[k]||"#475569" }} />
        ))}
      </div>

      {open && (
        <div style={{ borderTop:"1px solid #0f2040", padding:"12px 18px 16px" }}>
          <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.12em", marginBottom:10, fontWeight:700 }}>CLASS BREAKDOWN</div>
          {Object.entries(job.byClass).sort((a,b)=>b[1]-a[1]).map(([cls,amt])=>{
            const pct = t ? amt/t*100 : 0;
            const psf2 = job.sqft ? ` · $${(amt/job.sqft).toFixed(0)}/sqft` : "";
            return (
              <div key={cls} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#475569", marginBottom:2 }}>
                  <span>{cls}</span>
                  <span>${amt.toLocaleString(undefined,{maximumFractionDigits:0})} · {pct.toFixed(1)}%{psf2}</span>
                </div>
                <div style={{ background:"#050d1f", borderRadius:3, height:3 }}>
                  <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", borderRadius:3, background:"linear-gradient(90deg,#1d4ed8,#3b82f6)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Estimate Form ─────────────────────────────────────────────────────────────
function EstimateForm({ onEstimate, loading }) {
  const [form, setForm] = useState({ projectType:"New Multi-Unit Construction", sqft:"", units:"3", description:"", location:"Seattle, WA", timeline:"12–18 months" });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const inp = { background:"rgba(5,13,31,0.9)", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { color:"#334155", fontSize:9, letterSpacing:"0.12em", marginBottom:5, display:"block", fontWeight:700 };
  const ok = form.sqft && form.description && !loading;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12 }}>
        <div>
          <label style={lbl}>PROJECT TYPE</label>
          <select value={form.projectType} onChange={set("projectType")} style={inp}>
            {["New Multi-Unit Construction","Single Family New Construction","ADU / DADU","Residential Renovation","Commercial Build-Out","Other"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>TOTAL SQFT <span style={{color:"#ef4444"}}>*</span></label>
          <input type="number" placeholder="e.g. 5000" value={form.sqft} onChange={set("sqft")} style={inp} />
        </div>
        <div>
          <label style={lbl}>UNIT COUNT</label>
          <input type="number" placeholder="3" value={form.units} onChange={set("units")} style={inp} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label style={lbl}>LOCATION</label>
          <input type="text" value={form.location} onChange={set("location")} style={inp} />
        </div>
        <div>
          <label style={lbl}>TIMELINE</label>
          <select value={form.timeline} onChange={set("timeline")} style={inp}>
            {["6–12 months","12–18 months","18–24 months","24+ months"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>SCOPE / UNIT MIX / FINISH LEVEL <span style={{color:"#ef4444"}}>*</span></label>
        <textarea value={form.description} onChange={set("description")}
          placeholder="e.g. 3-unit condo, Unit 1 @ 2,200 sqft w/garage, Units 2-3 @ 1,400 sqft each. Mid-to-high finish level. Sloped site. Backfill required. Similar scope to 57th St project."
          rows={4} style={{...inp, resize:"vertical"}} />
      </div>
      {!form.sqft && <div style={{ fontSize:11, color:"#334155" }}>⚠ Square footage required for $/sqft benchmarks</div>}
      <button onClick={()=>onEstimate(form)} disabled={!ok} style={{
        background: ok ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "#0a1428",
        border:"none", borderRadius:10, padding:"13px", color: ok?"#fff":"#1e3a5f",
        fontWeight:700, fontSize:13, cursor: ok?"pointer":"not-allowed", letterSpacing:"0.05em",
      }}>
        {loading ? "⚙ CROSS-REFERENCING JOB HISTORY…" : "⚡ GENERATE ESTIMATE"}
      </button>
    </div>
  );
}

// ── Estimate Result ───────────────────────────────────────────────────────────
function EstimateResult({ result }) {
  if (!result) return null;
  const sections = result.split(/\n(?=## )/);
  return (
    <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:14, animation:"fadeIn 0.4s ease" }}>
      {sections.map((section, si) => {
        const lines = section.split("\n");
        const isH   = lines[0]?.startsWith("##");
        const title = isH ? lines[0].replace(/^#+\s*/,"") : null;
        const body  = isH ? lines.slice(1) : lines;
        const isBench = title?.toLowerCase().includes("benchmark");
        const isConf  = title?.toLowerCase().includes("confidence");
        const accent  = isBench ? "#3b82f6" : isConf ? "#10b981" : "#f59e0b";
        return (
          <div key={si} style={{ background:"rgba(5,13,31,0.9)", border:`1px solid ${accent}22`, borderRadius:12, overflow:"hidden" }}>
            {title && <div style={{ padding:"11px 20px", background:`${accent}11`, borderBottom:"1px solid #0f2040", color:accent, fontSize:10, fontWeight:700, letterSpacing:"0.12em" }}>{title.toUpperCase()}</div>}
            <div style={{ padding:"16px 20px" }}>
              {body.map((line, li) => {
                if (!line.trim()) return <div key={li} style={{ height:6 }} />;
                const isTotal  = /\*\*total/i.test(line);
                const isBullet = /^[-•▸]/.test(line.trim());
                const stripped = line.replace(/^[-•▸]\s*/,"");
                const parts    = stripped.split(/\*\*(.*?)\*\*/g);
                const rendered = parts.map((p,i) => i%2===1 ? <strong key={i} style={{color:"#e2e8f0"}}>{p}</strong> : p);
                return (
                  <div key={li} style={{
                    display:"flex", gap:8, alignItems:"flex-start",
                    marginBottom:isTotal?0:4, paddingTop:isTotal?10:0, marginTop:isTotal?8:0,
                    borderTop:isTotal?"1px solid #1e3a5f":"none",
                    color:isTotal?accent:"#64748b", fontSize:isTotal?14:12, fontWeight:isTotal?700:400,
                  }}>
                    {isBullet && <span style={{ color:accent, flexShrink:0, marginTop:1 }}>▸</span>}
                    <span style={{ lineHeight:1.65 }}>{rendered}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function ConstructionEstimator() {
  const [jobs, setJobs]           = useState(SEED_JOBS);
  const [tab, setTab]             = useState("estimate");
  const [estimate, setEstimate]   = useState(null);
  const [estimateHistory, setEstimateHistory] = useState([]);
  const [lastForm, setLastForm]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob]     = useState(null);

  const handleAdd  = useCallback(job => setJobs(prev => [...prev, job]), []);
  const handleEdit = (job) => setEditJob(job);
  const handleSave = (sqft, notes) => {
    setJobs(prev => prev.map(j => j.id === editJob.id ? {...j, sqft, notes} : j));
    setEditJob(null);
  };

  const handleEstimate = async form => {
    setLoading(true); setError(null); setEstimate(null); setLastForm(form);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body: JSON.stringify({
          model: ANTHROPIC_MODEL, max_tokens: 1000,
          system: buildSystemPrompt(jobs),
          messages: [{ role:"user", content:
            `Estimate this new project:\nType: ${form.projectType}\nTotal Sqft: ${form.sqft} sqft\nUnit Count: ${form.units}\nLocation: ${form.location}\nTimeline: ${form.timeline}\nScope: ${form.description}\n\nProvide $/sqft benchmarks from our historical jobs, then a full line-item estimate with Low|Mid|High ranges.`
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map(b=>b.text||"").join("") || "";
      setEstimate(text);
      setEstimateHistory(prev => [{
        id: Date.now(),
        date: new Date().toLocaleString(),
        form,
        text,
      }, ...prev]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const totalCost = jobs.reduce((s,j)=>s+j.grandTotal, 0);
  const card = { background:"rgba(8,16,36,0.9)", border:"1px solid #1e3a5f", borderRadius:14, padding:24, marginBottom:16 };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(155deg,#050d1f 0%,#06111e 50%,#050a18 100%)", fontFamily:"'IBM Plex Mono','DM Mono',monospace", color:"#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box} select,option{background:#06111e;color:#e2e8f0} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {showModal && <PasteModal onAdd={handleAdd} onClose={()=>setShowModal(false)} />}
      {editJob   && <SqftModal job={editJob} onSave={handleSave} onClose={()=>setEditJob(null)} />}

      {/* Header */}
      <header style={{ borderBottom:"1px solid #0f2040", padding:"15px 28px", display:"flex", alignItems:"center", gap:14, background:"rgba(5,10,20,0.98)", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ width:38, height:38, borderRadius:9, fontSize:18, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center" }}>🏗</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>BuildCost AI</div>
          <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.1em" }}>BUNGALOW BUILDING CORP · SEATTLE CONSTRUCTION ESTIMATOR</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <div style={{ background:"rgba(29,78,216,0.1)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:8, padding:"4px 14px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#60a5fa" }}>{jobs.length}</div>
            <div style={{ fontSize:8, color:"#1e3a5f", letterSpacing:"0.12em" }}>JOBS</div>
          </div>
          <div style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:8, padding:"4px 14px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b" }}>${(totalCost/1000000).toFixed(2)}M</div>
            <div style={{ fontSize:8, color:"#1e3a5f", letterSpacing:"0.12em" }}>COST DATA</div>
          </div>
          <div style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:8, padding:"4px 14px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#10b981" }}>$240</div>
            <div style={{ fontSize:8, color:"#1e3a5f", letterSpacing:"0.12em" }}>/SQFT AVG</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:860, margin:"0 auto", padding:"26px 18px" }}>
        {/* Tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:22, padding:3, background:"rgba(5,13,31,0.8)", borderRadius:10 }}>
          {[["estimate","⚡  Estimate"],["history","📊  Job History"],["saved","🗂  Saved Estimates"],["data","📁  Add Data"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:"9px 0", borderRadius:8, fontSize:11, fontWeight:700,
              cursor:"pointer", border:"none", transition:"all 0.15s", letterSpacing:"0.04em",
              background:tab===id?"rgba(29,78,216,0.25)":"transparent",
              color:tab===id?"#93c5fd":"#1e3a5f",
            }}>{label}</button>
          ))}
        </div>

        {/* ── ESTIMATE ── */}
        {tab==="estimate" && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            {/* Benchmark summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {jobs.filter(j=>j.sqft).map(j=>(
                <div key={j.id} style={{ background:"rgba(5,13,31,0.9)", border:"1px solid #1e3a5f", borderRadius:12, padding:"14px 18px" }}>
                  <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.12em", fontWeight:700, marginBottom:6 }}>REFERENCE: {j.name.toUpperCase()}</div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    <div><div style={{ fontSize:18, fontWeight:700, color:"#f59e0b" }}>${(j.grandTotal/j.sqft).toFixed(0)}<span style={{fontSize:10,color:"#334155"}}>/sqft</span></div><div style={{fontSize:9,color:"#475569"}}>{j.sqft.toLocaleString()} sqft total</div></div>
                    <div><div style={{ fontSize:18, fontWeight:700, color:"#10b981" }}>${(j.grandTotal/1000).toFixed(0)}k</div><div style={{fontSize:9,color:"#475569"}}>total hard cost</div></div>
                  </div>
                  {j.notes && <div style={{ fontSize:10, color:"#334155", marginTop:6, lineHeight:1.5 }}>{j.notes}</div>}
                </div>
              ))}
              {jobs.filter(j=>!j.sqft).map(j=>(
                <div key={j.id} style={{ background:"rgba(5,13,31,0.9)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:"14px 18px" }}>
                  <div style={{ fontSize:9, color:"#334155", letterSpacing:"0.12em", fontWeight:700, marginBottom:6 }}>REFERENCE: {j.name.toUpperCase()}</div>
                  <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                    <div><div style={{ fontSize:18, fontWeight:700, color:"#f59e0b" }}>${(j.grandTotal/1000).toFixed(0)}k</div><div style={{fontSize:9,color:"#475569"}}>total hard cost</div></div>
                    <button onClick={()=>setEditJob(j)} style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:7, padding:"6px 12px", color:"#f59e0b", cursor:"pointer", fontSize:10, fontWeight:700 }}>+ Add Sqft ✏</button>
                  </div>
                  {j.notes && <div style={{ fontSize:10, color:"#334155", marginTop:6 }}>{j.notes}</div>}
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.12em", fontWeight:700, marginBottom:4 }}>NEW PROJECT ESTIMATE</div>
              <div style={{ fontSize:11, color:"#334155", marginBottom:18 }}>
                Using <span style={{color:"#60a5fa"}}>{jobs.length} reference jobs</span> · ${(totalCost/1000000).toFixed(2)}M in historical data
              </div>
              <EstimateForm onEstimate={handleEstimate} loading={loading} />
            </div>
            {error && <div style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"12px 16px", color:"#f87171", fontSize:12, marginTop:10 }}>⚠ {error}</div>}
            {loading && (
              <div style={{ textAlign:"center", padding:44, color:"#1e3a5f" }}>
                <div style={{ fontSize:26, marginBottom:12, display:"inline-block", animation:"spin 2s linear infinite" }}>⚙</div>
                <div style={{ fontSize:10, letterSpacing:"0.12em" }}>CROSS-REFERENCING {jobs.length} JOBS · $2.11M COST DATABASE…</div>
              </div>
            )}
            {estimate && (
              <>
                <div style={{ display:"flex", gap:10, margin:"16px 0 4px" }}>
                  <button onClick={()=>exportToPDF(estimate, lastForm)} style={{
                    flex:1, background:"linear-gradient(135deg,#dc2626,#ef4444)", border:"none", borderRadius:10,
                    padding:"12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", letterSpacing:"0.05em",
                  }}>⬇ Export PDF</button>
                  <button onClick={()=>exportToExcel(estimate, lastForm)} style={{
                    flex:1, background:"linear-gradient(135deg,#16a34a,#22c55e)", border:"none", borderRadius:10,
                    padding:"12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", letterSpacing:"0.05em",
                  }}>⬇ Export Excel (.xlsx)</button>
                </div>
                <div style={{ fontSize:10, color:"#1e3a5f", textAlign:"center", marginBottom:4 }}>
                  Excel has 3 tabs: Estimate · $/sqft Benchmarks · Project Info
                </div>
                <EstimateResult result={estimate} />
              </>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            {jobs.map(j=>(
              <div key={j.id} style={card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:15 }}>{j.name}</div>
                    {j.notes && <div style={{ color:"#334155", fontSize:10, marginTop:3 }}>{j.notes}</div>}
                    <div style={{ color:"#475569", fontSize:10, marginTop:3 }}>{j.rowCount} expense rows · {j.skippedNegative} excluded</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:"#f59e0b", fontWeight:700, fontSize:20 }}>${j.grandTotal.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                    {j.sqft && <div style={{ color:"#10b981", fontSize:12, fontWeight:600 }}>${(j.grandTotal/j.sqft).toFixed(0)}/sqft</div>}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:18, marginTop:14 }}>
                  {[
                    ["Foundation", j.byClass["Foundation"]||0, "#6366f1"],
                    ["Framing+Lumber", (j.byClass["Framing, Materials, Trusses"]||0)+(j.byClass["Lumber"]||0), "#3b82f6"],
                    ["Electrical", j.byClass["Electrical"]||0, "#f59e0b"],
                    ["Plumbing", j.byClass["Plumbing & Plumbing Fixtures"]||0, "#10b981"],
                    ["HVAC", j.byClass["HVAC, Gas Piping, Venting"]||0, "#ec4899"],
                    ["Landscape", j.byClass["Landscape, Rockeries, Walkway"]||0, "#84cc16"],
                  ].map(([lbl,v,c])=>(
                    <div key={lbl} style={{ background:"rgba(5,13,31,0.9)", borderRadius:8, padding:"10px 12px", borderLeft:`3px solid ${c}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:c }}>${(v/1000).toFixed(0)}k</div>
                      {j.sqft && <div style={{ fontSize:8, color:"#334155" }}>${(v/j.sqft).toFixed(0)}/sqft</div>}
                      <div style={{ fontSize:8, color:"#1e3a5f", marginTop:2, letterSpacing:"0.08em" }}>{lbl.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.12em", marginBottom:10, fontWeight:700 }}>FULL CLASS BREAKDOWN</div>
                {Object.entries(j.byClass).sort((a,b)=>b[1]-a[1]).map(([cls,amt])=>{
                  const pct = j.grandTotal ? amt/j.grandTotal*100 : 0;
                  return (
                    <div key={cls} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#475569", marginBottom:2 }}>
                        <span>{cls}</span>
                        <span style={{color:"#64748b"}}>
                          ${amt.toLocaleString(undefined,{maximumFractionDigits:0})}
                          {j.sqft ? ` · $${(amt/j.sqft).toFixed(0)}/sqft` : ""}
                          {" · "}{pct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ background:"#050d1f", borderRadius:3, height:4 }}>
                        <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", borderRadius:3, background:"linear-gradient(90deg,#1d4ed8,#3b82f6)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── SAVED ESTIMATES ── */}
        {tab==="saved" && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            {estimateHistory.length === 0 ? (
              <div style={{ ...card, textAlign:"center", padding:48 }}>
                <div style={{ fontSize:28, marginBottom:12 }}>🗂</div>
                <div style={{ color:"#334155", fontSize:13, fontWeight:700, marginBottom:8 }}>No saved estimates yet</div>
                <div style={{ color:"#1e3a5f", fontSize:11 }}>Generate an estimate on the ⚡ Estimate tab — it will appear here automatically.</div>
              </div>
            ) : estimateHistory.map(entry => (
              <div key={entry.id} style={{ ...card, marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:13 }}>{entry.form?.description?.slice(0,60) || "Estimate"}{entry.form?.description?.length > 60 ? "…" : ""}</div>
                    <div style={{ color:"#334155", fontSize:10, marginTop:3 }}>{entry.form?.projectType} · {entry.form?.sqft ? Number(entry.form.sqft).toLocaleString() + " sqft" : ""} · {entry.form?.units} units · {entry.form?.location}</div>
                    <div style={{ color:"#1e3a5f", fontSize:9, marginTop:3, letterSpacing:"0.08em" }}>{entry.date}</div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>exportToPDF(entry.text, entry.form)} style={{ background:"rgba(220,38,38,0.12)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:7, padding:"6px 12px", color:"#f87171", cursor:"pointer", fontSize:10, fontWeight:700 }}>PDF</button>
                    <button onClick={()=>exportToExcel(entry.text, entry.form)} style={{ background:"rgba(22,163,74,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:7, padding:"6px 12px", color:"#4ade80", cursor:"pointer", fontSize:10, fontWeight:700 }}>Excel</button>
                  </div>
                </div>
                <EstimateResult result={entry.text} />
              </div>
            ))}
          </div>
        )}

        {/* ── ADD DATA ── */}
        {tab==="data" && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            <div style={card}>
              <div style={{ fontSize:9, color:"#1e3a5f", letterSpacing:"0.12em", fontWeight:700, marginBottom:16 }}>LOADED JOBS ({jobs.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                {jobs.map(j=>(
                  <JobCard key={j.id} job={j} isSeed={j.id.startsWith("seed")}
                    onEdit={handleEdit}
                    onRemove={()=>setJobs(prev=>prev.filter(x=>x.id!==j.id))} />
                ))}
              </div>
              <button onClick={()=>setShowModal(true)} style={{
                width:"100%", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:10,
                padding:"13px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", letterSpacing:"0.05em",
              }}>+ Add Another Job from CSV</button>
              <div style={{ marginTop:14, fontSize:10, color:"#1e3a5f", lineHeight:2 }}>
                ✓ Both Bungalow Building Corp jobs pre-loaded with full class breakdowns<br/>
                ✓ Click ✏ on any job to add/update square footage for $/sqft benchmarks<br/>
                ✓ Add more jobs via CSV paste to improve estimate accuracy
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
