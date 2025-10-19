import { z as push, J as escape_html, B as pop, M as ensure_array_like, K as attr, N as maybe_selected, F as head, G as attr_class, P as stringify } from "../../../../chunks/index2.js";
import { B as Button } from "../../../../chunks/Button.js";
import "clsx";
import supabaseService from "../../../../chunks/supabase.js";
import { d as derived, w as writable } from "../../../../chunks/index.js";
class PDFExportService {
  /**
   * Check reconciliation status for a given month
   */
  static async getReconciliationStatus(month) {
    try {
      await supabaseService.init();
      const [year, monthNum] = month.includes("-") ? month.split("-") : [month.split(" ")[1], String((/* @__PURE__ */ new Date(month + " 1, 2024")).getMonth() + 1).padStart(2, "0")];
      const startDate = `${year}-${monthNum}-01`;
      const endDate = `${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}`;
      const fuelReconciliations = await supabaseService.query(
        () => supabaseService.ensureInitialized().from("fuel_reconciliations").select("*").gte("start_date", startDate).lte("end_date", endDate).order("created_at", { ascending: false }).limit(1)
      );
      const tankReconciliations = await supabaseService.query(
        () => supabaseService.ensureInitialized().from("tank_reconciliations").select("*").gte("reconciliation_date", startDate).lte("reconciliation_date", endDate).order("created_at", { ascending: false }).limit(1)
      );
      const fuelRecord = fuelReconciliations.data?.[0];
      const tankRecord = tankReconciliations.data?.[0];
      return {
        month,
        fuelReconciled: !!fuelRecord,
        tankReconciled: !!tankRecord,
        fuelReconciliationDate: fuelRecord?.created_at?.split("T")[0],
        tankReconciliationDate: tankRecord?.created_at?.split("T")[0],
        lastFuelVariance: fuelRecord?.fuel_variance,
        lastTankVariance: tankRecord?.tank_variance_litres
      };
    } catch (err) {
      console.error("Error checking reconciliation status:", err);
      return {
        month,
        fuelReconciled: false,
        tankReconciled: false
      };
    }
  }
  /**
   * Generate PDF content HTML
   */
  static generatePDFContent(options, reconciliationStatus) {
    const { title, period, data, includeReconciliationStatus, includeSignatureLine, reportType } = options;
    let content = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>${title}</title>
				<style>
					body { 
						font-family: Arial, sans-serif; 
						margin: 40px; 
						color: #333;
						line-height: 1.6;
					}
					.header { 
						text-align: center; 
						margin-bottom: 30px; 
						border-bottom: 2px solid #ddd; 
						padding-bottom: 20px; 
					}
					.header h1 { 
						margin: 0 0 10px; 
						color: #f97316; 
						font-size: 24px;
					}
					.header .period { 
						color: #666; 
						font-size: 16px; 
						margin: 5px 0;
					}
					.reconciliation-status {
						background: #f9fafb;
						border: 1px solid #e5e7eb;
						border-radius: 8px;
						padding: 15px;
						margin-bottom: 20px;
					}
					.reconciliation-status h3 {
						margin: 0 0 10px;
						color: #111827;
						font-size: 16px;
					}
					.status-grid {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 15px;
					}
					.status-item {
						display: flex;
						justify-content: space-between;
						align-items: center;
						font-size: 14px;
					}
					.status-badge {
						padding: 4px 8px;
						border-radius: 4px;
						font-weight: 600;
						font-size: 12px;
					}
					.status-reconciled {
						background: #d1fae5;
						color: #065f46;
					}
					.status-pending {
						background: #fef3c7;
						color: #92400e;
					}
					.summary-grid { 
						display: grid; 
						grid-template-columns: repeat(2, 1fr); 
						gap: 20px; 
						margin-bottom: 30px; 
					}
					.summary-card { 
						border: 1px solid #ddd; 
						padding: 15px; 
						border-radius: 8px; 
						background: #fafafa;
					}
					.summary-card h4 {
						margin: 0 0 8px;
						color: #111827;
						font-size: 14px;
					}
					.summary-card .value {
						font-size: 18px;
						font-weight: 700;
						color: #f97316;
					}
					.data-table {
						width: 100%;
						border-collapse: collapse;
						margin-bottom: 30px;
					}
					.data-table th,
					.data-table td {
						padding: 12px;
						text-align: left;
						border-bottom: 1px solid #ddd;
						font-size: 13px;
					}
					.data-table th {
						background: #f9fafb;
						font-weight: 600;
						color: #111827;
					}
					.data-table tr:nth-child(even) {
						background: #fafafa;
					}
					.signature-section {
						margin-top: 50px;
						display: flex;
						justify-content: flex-end;
					}
					.signature-box {
						border: 1px solid #ddd;
						padding: 20px;
						width: 300px;
						text-align: center;
						background: #fafafa;
					}
					.signature-line {
						border-top: 1px solid #333;
						margin: 40px 0 10px;
						height: 1px;
					}
					.signature-label {
						font-size: 12px;
						color: #666;
						margin-top: 5px;
					}
					.generated-info {
						margin-top: 30px;
						padding-top: 20px;
						border-top: 1px solid #eee;
						font-size: 11px;
						color: #999;
						text-align: center;
					}
					@media print { 
						body { margin: 20px; }
						.reconciliation-status,
						.summary-grid,
						.data-table {
							page-break-inside: avoid;
						}
					}
				</style>
			</head>
			<body>
				<div class="header">
					<h1>FarmTrack - ${title}</h1>
					<div class="period">${period}</div>
				</div>
		`;
    if (includeReconciliationStatus && reconciliationStatus) {
      content += `
				<div class="reconciliation-status">
					<h3>Reconciliation Status for ${reconciliationStatus.month}</h3>
					<div class="status-grid">
						<div class="status-item">
							<span>Fuel Reconciliation:</span>
							<span class="status-badge ${reconciliationStatus.fuelReconciled ? "status-reconciled" : "status-pending"}">
								${reconciliationStatus.fuelReconciled ? "Completed" : "Pending"}
							</span>
						</div>
						<div class="status-item">
							<span>Tank Reconciliation:</span>
							<span class="status-badge ${reconciliationStatus.tankReconciled ? "status-reconciled" : "status-pending"}">
								${reconciliationStatus.tankReconciled ? "Completed" : "Pending"}
							</span>
						</div>
			`;
      if (reconciliationStatus.fuelReconciled && reconciliationStatus.fuelReconciliationDate) {
        content += `
					<div class="status-item">
						<span>Fuel Reconciled On:</span>
						<span>${new Date(reconciliationStatus.fuelReconciliationDate).toLocaleDateString()}</span>
					</div>
				`;
      }
      if (reconciliationStatus.tankReconciled && reconciliationStatus.tankReconciliationDate) {
        content += `
					<div class="status-item">
						<span>Tank Reconciled On:</span>
						<span>${new Date(reconciliationStatus.tankReconciliationDate).toLocaleDateString()}</span>
					</div>
				`;
      }
      content += `
					</div>
				</div>
			`;
    }
    content += this.generateReportContent(data, reportType || "fuel-entries");
    if (includeSignatureLine) {
      content += `
				<div class="signature-section">
					<div class="signature-box">
						<div style="margin-bottom: 20px;">
							<strong>Verification & Approval</strong>
						</div>
						<div class="signature-line"></div>
						<div class="signature-label">
							Fuel Attendant / Manager Signature
						</div>
						<div style="margin-top: 15px; font-size: 11px; color: #666;">
							Date: ________________
						</div>
					</div>
				</div>
			`;
    }
    content += `
			<div class="generated-info">
				Generated on ${(/* @__PURE__ */ new Date()).toLocaleString()} by FarmTrack Fuel Management System
			</div>
		`;
    content += `
			</body>
			</html>
		`;
    return content;
  }
  /**
   * Generate report-specific content
   */
  static generateReportContent(data, reportType) {
    switch (reportType) {
      case "fuel-entries":
        return this.generateFuelEntriesContent(data);
      case "reconciliation":
        return this.generateReconciliationContent(data);
      case "variance":
        return this.generateVarianceContent(data);
      case "efficiency":
        return this.generateEfficiencyContent(data);
      default:
        return this.generateGenericContent(data);
    }
  }
  static generateFuelEntriesContent(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div style="text-align: center; padding: 40px; color: #666;">No data available</div>';
    }
    const totalFuel = data.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
    const avgFuel = totalFuel / data.length;
    const uniqueVehicles = new Set(data.map((entry) => entry.vehicle_id)).size;
    let content = `
			<div class="summary-grid">
				<div class="summary-card">
					<h4>Total Fuel Dispensed</h4>
					<div class="value">${totalFuel.toLocaleString("en-ZA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L</div>
				</div>
				<div class="summary-card">
					<h4>Total Entries</h4>
					<div class="value">${data.length}</div>
				</div>
				<div class="summary-card">
					<h4>Average per Entry</h4>
					<div class="value">${avgFuel.toLocaleString("en-ZA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L</div>
				</div>
				<div class="summary-card">
					<h4>Vehicles Fueled</h4>
					<div class="value">${uniqueVehicles}</div>
				</div>
			</div>
			
			<table class="data-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Vehicle</th>
						<th>Driver</th>
						<th>Fuel (L)</th>
						<th>Activity</th>
						<th>Location</th>
					</tr>
				</thead>
				<tbody>
		`;
    data.forEach((entry) => {
      content += `
				<tr>
					<td>${(/* @__PURE__ */ new Date(entry.entry_date + "T" + (entry.time || "00:00"))).toLocaleDateString("en-ZA")}</td>
					<td>${entry.vehicles?.code || "N/A"} - ${entry.vehicles?.name || ""}</td>
					<td>${entry.drivers?.name || "N/A"}</td>
					<td style="text-align: right; font-weight: 600;">${(entry.litres_dispensed || 0).toLocaleString("en-ZA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
					<td>${entry.activities?.name || "N/A"}</td>
					<td>${entry.fields?.name || entry.zones?.name || "N/A"}</td>
				</tr>
			`;
    });
    content += `
				</tbody>
			</table>
		`;
    return content;
  }
  static generateReconciliationContent(data) {
    return "<div>Reconciliation report content will be implemented</div>";
  }
  static generateVarianceContent(data) {
    return "<div>Variance report content will be implemented</div>";
  }
  static generateEfficiencyContent(data) {
    return "<div>Efficiency report content will be implemented</div>";
  }
  static generateGenericContent(data) {
    return `<div><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
  }
  /**
   * Export to PDF using print dialog
   */
  static async exportToPDF(options) {
    try {
      let reconciliationStatus;
      if (options.includeReconciliationStatus) {
        const monthMatch = options.period.match(/(\w+\s+\d{4}|\d{4}-\d{2})/);
        if (monthMatch) {
          reconciliationStatus = await this.getReconciliationStatus(monthMatch[1]);
        }
      }
      const htmlContent = this.generatePDFContent(options, reconciliationStatus);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Please allow popups to export PDF");
      }
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (err) {
      console.error("PDF export failed:", err);
      throw new Error("Failed to export PDF: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }
  /**
   * Export to Excel using XLSX
   */
  static async exportToExcel(options) {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const summaryData = [];
      summaryData.push([options.title]);
      summaryData.push([options.period]);
      summaryData.push([]);
      if (options.includeReconciliationStatus) {
        const monthMatch = options.period.match(/(\w+\s+\d{4}|\d{4}-\d{2})/);
        if (monthMatch) {
          const reconciliationStatus = await this.getReconciliationStatus(monthMatch[1]);
          summaryData.push(["Reconciliation Status"]);
          summaryData.push(["Fuel Reconciled", reconciliationStatus.fuelReconciled ? "Yes" : "No"]);
          summaryData.push(["Tank Reconciled", reconciliationStatus.tankReconciled ? "Yes" : "No"]);
          if (reconciliationStatus.fuelReconciliationDate) {
            summaryData.push(["Fuel Reconciled On", reconciliationStatus.fuelReconciliationDate]);
          }
          if (reconciliationStatus.tankReconciliationDate) {
            summaryData.push(["Tank Reconciled On", reconciliationStatus.tankReconciliationDate]);
          }
          summaryData.push([]);
        }
      }
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
      if (Array.isArray(options.data) && options.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(options.data);
        XLSX.utils.book_append_sheet(wb, ws, "Data");
      }
      const filename = `${options.title.replace(/\s+/g, "_")}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Excel export failed:", err);
      throw new Error("Failed to export Excel: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }
}
function InlineFuelEditor($$payload, $$props) {
  push();
  let {
    startDate = "",
    endDate = "",
    onclose = () => {
    }
  } = $$props;
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-ZA");
  }
  $$payload.out.push(`<div class="fuel-editor-overlay svelte-1j3s8hq"><div class="fuel-editor-modal svelte-1j3s8hq"><div class="modal-header svelte-1j3s8hq"><div class="header-content svelte-1j3s8hq"><h2 class="svelte-1j3s8hq">Edit Fuel Entries</h2> <p class="svelte-1j3s8hq">Period: ${escape_html(formatDate(startDate))} to ${escape_html(formatDate(endDate))}</p></div> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: onclose,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Close`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-1j3s8hq">Loading fuel entries...</div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
function TankLevelAdjustment($$payload, $$props) {
  push();
  let { date = "", onclose = () => {
  } } = $$props;
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-ZA");
  }
  $$payload.out.push(`<div class="tank-adjustment-overlay svelte-pnqj21"><div class="tank-adjustment-modal svelte-pnqj21"><div class="modal-header svelte-pnqj21"><div class="header-content svelte-pnqj21"><h2 class="svelte-pnqj21">Tank Level Adjustment</h2> <p class="svelte-pnqj21">Date: ${escape_html(formatDate(date))}</p></div> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: onclose,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Close`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-pnqj21">Loading tank data...</div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
function ReportingFramework($$payload, $$props) {
  push();
  let { startDate = "", endDate = "", onclose = () => {
  } } = $$props;
  let loading = false;
  let error = "";
  let reportData = null;
  let reportType = "fuel-usage";
  let groupBy = "vehicle";
  let includeDetails = true;
  const reportTypes = [
    { value: "fuel-usage", label: "Fuel Usage Report" },
    { value: "efficiency", label: "Vehicle Efficiency Report" },
    { value: "reconciliation", label: "Reconciliation Summary" },
    { value: "variance", label: "Variance Analysis Report" }
  ];
  const groupByOptions = [
    { value: "vehicle", label: "By Vehicle" },
    { value: "driver", label: "By Driver" },
    { value: "date", label: "By Date" },
    { value: "activity", label: "By Activity Type" }
  ];
  async function generateReport() {
    if (!startDate || !endDate) return;
    loading = true;
    error = "";
    reportData = null;
    try {
      await supabaseService.init();
      switch (reportType) {
        case "fuel-usage":
          reportData = await generateFuelUsageReport();
          break;
        case "efficiency":
          reportData = await generateEfficiencyReport();
          break;
        case "reconciliation":
          reportData = await generateReconciliationReport();
          break;
        case "variance":
          reportData = await generateVarianceReport();
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to generate report";
    }
    loading = false;
  }
  async function generateFuelUsageReport() {
    const result = await supabaseService.getFuelEntriesForPeriod(startDate, endDate);
    if (result.error) throw new Error(result.error);
    const entries = result.data || [];
    const grouped = groupData(entries);
    return {
      title: "Fuel Usage Report",
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      summary: calculateFuelSummary(entries),
      groups: grouped,
      totalEntries: entries.length
    };
  }
  async function generateEfficiencyReport() {
    const result = await supabaseService.getFuelEntriesForPeriod(startDate, endDate);
    if (result.error) throw new Error(result.error);
    const entries = result.data || [];
    const grouped = groupData(entries);
    const enrichedGroups = grouped.map((group) => ({
      ...group,
      efficiency: {
        fuelPerHour: group.totalFuel / Math.max(group.totalHours || 8, 1),
        fuelPerActivity: group.totalFuel / Math.max(group.activities || 1, 1),
        averageConsumption: group.totalFuel / Math.max(group.entries.length, 1)
      }
    }));
    return {
      title: "Vehicle Efficiency Report",
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      summary: calculateEfficiencySummary(enrichedGroups),
      groups: enrichedGroups,
      totalEntries: entries.length
    };
  }
  async function generateReconciliationReport() {
    const reconResult = await supabaseService.getDateRangeReconciliationData(startDate, endDate);
    const tankResult = await supabaseService.getTankReconciliationData(endDate);
    if (reconResult.error) throw new Error(reconResult.error);
    if (tankResult.error) throw new Error(tankResult.error);
    const fuelData = reconResult.data;
    const tankData = tankResult.data;
    const fuelVariance = (fuelData?.bowserEnd || 0) - (fuelData?.bowserStart || 0) - (fuelData?.fuelDispensed || 0);
    const tankVariance = (tankData?.calculatedLevel || 0) - (tankData?.measuredLevel || 0);
    return {
      title: "Reconciliation Summary",
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      summary: {
        fuelDispensed: fuelData?.fuelDispensed || 0,
        bowserStart: fuelData?.bowserStart || 0,
        bowserEnd: fuelData?.bowserEnd || 0,
        bowserDifference: (fuelData?.bowserEnd || 0) - (fuelData?.bowserStart || 0),
        fuelVariance,
        tankCalculated: tankData?.calculatedLevel || 0,
        tankMeasured: tankData?.measuredLevel || 0,
        tankVariance,
        tankVariancePercent: Math.abs(tankVariance / 24e3 * 100)
      }
    };
  }
  async function generateVarianceReport() {
    const historyResult = await supabaseService.getReconciliationHistory();
    if (historyResult.error) throw new Error(historyResult.error);
    const history = historyResult.data || [];
    const varianceAnalysis = history.map((record) => ({
      date: record.end_date || record.reconciliation_date,
      type: record.fuel_dispensed !== void 0 ? "fuel" : "tank",
      variance: record.fuel_dispensed !== void 0 ? record.fuel_variance : record.tank_variance_litres,
      variancePercent: record.fuel_dispensed !== void 0 ? Math.abs((record.fuel_variance || 0) / Math.max(record.fuel_dispensed, 1) * 100) : Math.abs((record.tank_variance_litres || 0) / 24e3 * 100)
    }));
    return {
      title: "Variance Analysis Report",
      period: "Historical Data",
      summary: {
        totalRecords: varianceAnalysis.length,
        avgFuelVariance: calculateAverage(varianceAnalysis.filter((v) => v.type === "fuel"), "variance"),
        avgTankVariance: calculateAverage(varianceAnalysis.filter((v) => v.type === "tank"), "variance"),
        maxVariance: Math.max(...varianceAnalysis.map((v) => Math.abs(v.variance || 0)))
      },
      analysis: varianceAnalysis
    };
  }
  function groupData(entries) {
    const groups = /* @__PURE__ */ new Map();
    entries.forEach((entry) => {
      let key;
      let label;
      switch (groupBy) {
        case "vehicle":
          key = entry.vehicle_id;
          label = `${entry.vehicles?.code || "N/A"} - ${entry.vehicles?.name || "Unknown"}`;
          break;
        case "driver":
          key = entry.driver_id;
          label = entry.drivers?.name || "Unknown Driver";
          break;
        case "date":
          key = entry.entry_date;
          label = formatDate(entry.entry_date);
          break;
        case "activity":
          key = entry.activities?.name || "Unknown";
          label = entry.activities?.name || "Unknown Activity";
          break;
      }
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          entries: [],
          totalFuel: 0,
          totalHours: 0,
          activities: 0
        });
      }
      const group = groups.get(key);
      group.entries.push(entry);
      group.totalFuel += entry.litres_dispensed || 0;
      group.totalHours += entry.hours || 0;
      group.activities += 1;
    });
    return Array.from(groups.values()).sort((a, b) => b.totalFuel - a.totalFuel);
  }
  function calculateFuelSummary(entries) {
    return {
      totalFuel: entries.reduce((sum, e) => sum + (e.litres_dispensed || 0), 0),
      totalHours: entries.reduce((sum, e) => sum + (e.hours || 0), 0),
      avgFuelPerEntry: entries.length > 0 ? entries.reduce((sum, e) => sum + (e.litres_dispensed || 0), 0) / entries.length : 0,
      uniqueVehicles: new Set(entries.map((e) => e.vehicle_id)).size,
      uniqueDrivers: new Set(entries.map((e) => e.driver_id)).size
    };
  }
  function calculateEfficiencySummary(groups) {
    const totalFuel = groups.reduce((sum, g) => sum + g.totalFuel, 0);
    const totalHours = groups.reduce((sum, g) => sum + g.totalHours, 0);
    return {
      totalFuel,
      totalHours,
      overallEfficiency: totalHours > 0 ? totalFuel / totalHours : 0,
      bestPerformer: groups.length > 0 ? groups.reduce((best, current) => current.efficiency.fuelPerHour < best.efficiency.fuelPerHour ? current : best) : null,
      worstPerformer: groups.length > 0 ? groups.reduce((worst, current) => current.efficiency.fuelPerHour > worst.efficiency.fuelPerHour ? current : worst) : null
    };
  }
  function calculateAverage(data, field) {
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
  }
  function formatNumber(num, decimals = 1) {
    if (num === null || num === void 0) return "-";
    return new Intl.NumberFormat("en-ZA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-ZA");
  }
  async function exportToExcel() {
    if (!reportData) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const summaryData = [];
      summaryData.push([reportData.title]);
      summaryData.push([reportData.period]);
      summaryData.push([]);
      if (reportData.summary) {
        summaryData.push(["Summary"]);
        Object.entries(reportData.summary).forEach(([key, value]) => {
          const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
          summaryData.push([label, typeof value === "number" ? value : String(value)]);
        });
      }
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
      if (reportData.groups && reportData.groups.length > 0) {
        const detailsData = [];
        detailsData.push([
          "Group",
          "Total Fuel (L)",
          "Entries",
          "Average (L)",
          "Hours",
          "Efficiency (L/hr)"
        ]);
        reportData.groups.forEach((group) => {
          detailsData.push([
            group.label,
            group.totalFuel,
            group.entries.length,
            group.totalFuel / group.entries.length,
            group.totalHours || 0,
            group.efficiency?.fuelPerHour || group.totalFuel / Math.max(group.totalHours || 8, 1)
          ]);
        });
        const detailsWs = XLSX.utils.aoa_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(wb, detailsWs, "Details");
      }
      if (reportData.analysis && reportData.analysis.length > 0) {
        const analysisData = [];
        analysisData.push(["Date", "Type", "Variance (L)", "Variance (%)"]);
        reportData.analysis.forEach((item) => {
          analysisData.push([
            formatDate(item.date),
            item.type.toUpperCase(),
            item.variance,
            item.variancePercent
          ]);
        });
        const analysisWs = XLSX.utils.aoa_to_sheet(analysisData);
        XLSX.utils.book_append_sheet(wb, analysisWs, "Variance Analysis");
      }
      const filename = `${reportData.title.replace(/\s+/g, "_")}_${formatDate(startDate)}_to_${formatDate(endDate)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export failed:", err);
      error = "Failed to export report to Excel";
    }
  }
  async function exportToPDF() {
    if (!reportData) return;
    try {
      await PDFExportService.exportToPDF({
        title: reportData.title,
        period: reportData.period,
        data: reportData.groups || reportData.analysis || reportData,
        includeReconciliationStatus: false,
        // Don't include for advanced reports
        includeSignatureLine: false,
        // Don't include for advanced reports
        reportType
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      error = "Failed to export report to PDF";
    }
  }
  const each_array = ensure_array_like(reportTypes);
  $$payload.out.push(`<div class="reporting-overlay svelte-o5ood3"><div class="reporting-modal svelte-o5ood3"><div class="modal-header svelte-o5ood3"><div class="header-content svelte-o5ood3"><h2 class="svelte-o5ood3">Advanced Reporting</h2> <p class="svelte-o5ood3">Generate detailed reports for analysis and export</p></div> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: onclose,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Close`);
    }
  });
  $$payload.out.push(`<!----></div> <div class="report-controls svelte-o5ood3"><div class="control-group svelte-o5ood3"><label for="report-type" class="svelte-o5ood3">Report Type</label> <select id="report-type" class="svelte-o5ood3">`);
  $$payload.select_value = reportType;
  $$payload.out.push(`<!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let type = each_array[$$index];
    $$payload.out.push(`<option${attr("value", type.value)}${maybe_selected($$payload, type.value)}>${escape_html(type.label)}</option>`);
  }
  $$payload.out.push(`<!--]-->`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div> `);
  {
    $$payload.out.push("<!--[-->");
    const each_array_1 = ensure_array_like(groupByOptions);
    $$payload.out.push(`<div class="control-group svelte-o5ood3"><label for="group-by" class="svelte-o5ood3">Group By</label> <select id="group-by" class="svelte-o5ood3">`);
    $$payload.select_value = groupBy;
    $$payload.out.push(`<!--[-->`);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let option = each_array_1[$$index_1];
      $$payload.out.push(`<option${attr("value", option.value)}${maybe_selected($$payload, option.value)}>${escape_html(option.label)}</option>`);
    }
    $$payload.out.push(`<!--]-->`);
    $$payload.select_value = void 0;
    $$payload.out.push(`</select></div>`);
  }
  $$payload.out.push(`<!--]--> <div class="control-group svelte-o5ood3"><label for="include-details" class="svelte-o5ood3"><input id="include-details" type="checkbox"${attr("checked", includeDetails, true)} class="svelte-o5ood3"/> Include detailed breakdowns</label></div> `);
  Button($$payload, {
    variant: "primary",
    onclick: generateReport,
    disabled: loading,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html(loading ? "Generating..." : "Refresh Report")}`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  if (reportData && !loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="export-controls svelte-o5ood3">`);
    Button($$payload, {
      variant: "outline",
      onclick: exportToExcel,
      disabled: loading,
      children: ($$payload2) => {
        $$payload2.out.push(`<!---->Export Excel`);
      }
    });
    $$payload.out.push(`<!----> `);
    Button($$payload, {
      variant: "outline",
      onclick: exportToPDF,
      disabled: loading,
      children: ($$payload2) => {
        $$payload2.out.push(`<!---->Export PDF`);
      }
    });
    $$payload.out.push(`<!----></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-message svelte-o5ood3"><span class="error-icon">⚠️</span> <span>${escape_html(error)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (loading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-o5ood3">Generating report...</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (reportData) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="report-content svelte-o5ood3"><div class="report-header svelte-o5ood3"><h1 class="svelte-o5ood3">${escape_html(reportData.title)}</h1> <p class="report-period svelte-o5ood3">${escape_html(reportData.period)}</p></div> `);
      if (reportData.summary) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<div class="summary-section svelte-o5ood3"><h2 class="svelte-o5ood3">Summary</h2> `);
        {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<div class="summary-grid svelte-o5ood3"><div class="summary-card svelte-o5ood3"><span class="summary-label svelte-o5ood3">Total Fuel</span> <span class="summary-value svelte-o5ood3">${escape_html(formatNumber(reportData.summary.totalFuel))}L</span></div> <div class="summary-card svelte-o5ood3"><span class="summary-label svelte-o5ood3">Total Entries</span> <span class="summary-value svelte-o5ood3">${escape_html(reportData.totalEntries)}</span></div> <div class="summary-card svelte-o5ood3"><span class="summary-label svelte-o5ood3">Average per Entry</span> <span class="summary-value svelte-o5ood3">${escape_html(formatNumber(reportData.summary.avgFuelPerEntry))}L</span></div> <div class="summary-card svelte-o5ood3"><span class="summary-label svelte-o5ood3">Unique Vehicles</span> <span class="summary-value svelte-o5ood3">${escape_html(reportData.summary.uniqueVehicles)}</span></div></div>`);
        }
        $$payload.out.push(`<!--]--></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      if (reportData.groups && includeDetails) {
        $$payload.out.push("<!--[-->");
        const each_array_2 = ensure_array_like(reportData.groups);
        $$payload.out.push(`<div class="details-section svelte-o5ood3"><h2 class="svelte-o5ood3">Detailed Breakdown</h2> <div class="details-list svelte-o5ood3"><!--[-->`);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let group = each_array_2[$$index_2];
          $$payload.out.push(`<div class="detail-card svelte-o5ood3"><div class="detail-header svelte-o5ood3"><h3 class="svelte-o5ood3">${escape_html(group.label)}</h3> <div class="detail-metrics svelte-o5ood3"><span>${escape_html(formatNumber(group.totalFuel))}L</span> `);
          {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]--></div></div> `);
          if (group.entries && group.entries.length > 0) {
            $$payload.out.push("<!--[-->");
            $$payload.out.push(`<div class="detail-stats svelte-o5ood3"><div class="stat svelte-o5ood3"><span class="svelte-o5ood3">Entries:</span> <span class="svelte-o5ood3">${escape_html(group.entries.length)}</span></div> <div class="stat svelte-o5ood3"><span class="svelte-o5ood3">Average:</span> <span class="svelte-o5ood3">${escape_html(formatNumber(group.totalFuel / group.entries.length))}L</span></div> `);
            {
              $$payload.out.push("<!--[!-->");
            }
            $$payload.out.push(`<!--]--></div>`);
          } else {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]--></div>`);
        }
        $$payload.out.push(`<!--]--></div></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      if (reportData.analysis && reportType === "variance") ;
      else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></div>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  pop();
}
const CACHE_TTL = {
  FUEL_DATA: 5 * 60 * 1e3,
  // 5 minutes
  TANK_DATA: 10 * 60 * 1e3,
  // 10 minutes
  HISTORY: 2 * 60 * 1e3
  // 2 minutes
};
const initialState = {
  fuelData: /* @__PURE__ */ new Map(),
  tankData: /* @__PURE__ */ new Map(),
  history: null,
  isLoading: /* @__PURE__ */ new Set()
};
const reconciliationCache = writable(initialState);
function createCacheKey(startDate, endDate) {
  return `${startDate}_${endDate}`;
}
function isExpired(entry) {
  return Date.now() > entry.expires;
}
function createCacheEntry(data, ttl) {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expires: now + ttl
  };
}
const cacheActions = {
  // Fuel data caching
  getFuelData(startDate, endDate) {
    let result = null;
    reconciliationCache.update((state) => {
      const key = createCacheKey(startDate, endDate);
      const entry = state.fuelData.get(key);
      if (entry && !isExpired(entry)) {
        result = entry.data;
      }
      return state;
    });
    return result;
  },
  setFuelData(startDate, endDate, data) {
    reconciliationCache.update((state) => {
      const key = createCacheKey(startDate, endDate);
      state.fuelData.set(key, createCacheEntry(data, CACHE_TTL.FUEL_DATA));
      return state;
    });
  },
  // Tank data caching
  getTankData(date) {
    let result = null;
    reconciliationCache.update((state) => {
      const entry = state.tankData.get(date);
      if (entry && !isExpired(entry)) {
        result = entry.data;
      }
      return state;
    });
    return result;
  },
  setTankData(date, data) {
    reconciliationCache.update((state) => {
      state.tankData.set(date, createCacheEntry(data, CACHE_TTL.TANK_DATA));
      return state;
    });
  },
  // History caching
  getHistory() {
    let result = null;
    reconciliationCache.update((state) => {
      if (state.history && !isExpired(state.history)) {
        result = state.history.data;
      }
      return state;
    });
    return result;
  },
  setHistory(data) {
    reconciliationCache.update((state) => {
      state.history = createCacheEntry(data, CACHE_TTL.HISTORY);
      return state;
    });
  },
  // Loading state management
  setLoading(key, loading) {
    reconciliationCache.update((state) => {
      if (loading) {
        state.isLoading.add(key);
      } else {
        state.isLoading.delete(key);
      }
      return state;
    });
  },
  isLoading(key) {
    let result = false;
    reconciliationCache.update((state) => {
      result = state.isLoading.has(key);
      return state;
    });
    return result;
  },
  // Cache invalidation
  invalidateFuelData(startDate, endDate) {
    reconciliationCache.update((state) => {
      if (startDate && endDate) {
        const key = createCacheKey(startDate, endDate);
        state.fuelData.delete(key);
      } else {
        state.fuelData.clear();
      }
      return state;
    });
  },
  invalidateTankData(date) {
    reconciliationCache.update((state) => {
      if (date) {
        state.tankData.delete(date);
      } else {
        state.tankData.clear();
      }
      return state;
    });
  },
  invalidateHistory() {
    reconciliationCache.update((state) => {
      state.history = null;
      return state;
    });
  },
  // Clear all cache
  clearAll() {
    reconciliationCache.set(initialState);
  },
  // Cleanup expired entries
  cleanup() {
    reconciliationCache.update((state) => {
      for (const [key, entry] of state.fuelData.entries()) {
        if (isExpired(entry)) {
          state.fuelData.delete(key);
        }
      }
      for (const [key, entry] of state.tankData.entries()) {
        if (isExpired(entry)) {
          state.tankData.delete(key);
        }
      }
      if (state.history && isExpired(state.history)) {
        state.history = null;
      }
      return state;
    });
  }
};
derived(
  reconciliationCache,
  ($cache) => $cache.fuelData
);
derived(
  reconciliationCache,
  ($cache) => $cache.tankData
);
derived(
  reconciliationCache,
  ($cache) => $cache.history
);
derived(
  reconciliationCache,
  ($cache) => $cache.isLoading
);
derived(
  reconciliationCache,
  ($cache) => ({
    fuelDataEntries: $cache.fuelData.size,
    tankDataEntries: $cache.tankData.size,
    hasHistory: !!$cache.history,
    loadingOperations: $cache.isLoading.size
  })
);
if (typeof window !== "undefined") {
  setInterval(() => {
    cacheActions.cleanup();
  }, 5 * 60 * 1e3);
}
function _page($$payload, $$props) {
  push();
  let selectedRange = "week";
  let startDate = "";
  let endDate = "";
  let fuelData = null;
  let tankData = null;
  let error = "";
  let reconciliationHistory = [];
  let historyLoading = false;
  let showFuelEditor = false;
  let showTankEditor = false;
  let showReporting = false;
  const datePresets = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 Days" },
    { value: "thisWeek", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "custom", label: "Custom Range" }
  ];
  async function performFuelReconciliation() {
    return;
  }
  async function performTankReconciliation() {
    return;
  }
  function formatNumber(num) {
    if (num === null || num === void 0) return "-";
    return new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
  }
  function getVarianceClass(variance, threshold = 1) {
    const abs = Math.abs(variance || 0);
    if (abs <= threshold) return "good";
    if (abs <= threshold * 3) return "warning";
    return "alert";
  }
  function getTankVarianceClass(percentage) {
    const abs = Math.abs(percentage || 0);
    if (abs <= 2) return "good";
    if (abs <= 5) return "warning";
    return "alert";
  }
  function getConfidenceScore(variance, type = "fuel") {
    if (type === "fuel") {
      const abs = Math.abs(0);
      if (abs <= 1) return { score: 95, label: "Very High" };
      if (abs <= 3) return { score: 80, label: "High" };
      if (abs <= 10) return { score: 60, label: "Medium" };
      return { score: 30, label: "Low" };
    } else {
      const abs = Math.abs(0);
      if (abs <= 2) return { score: 95, label: "Very High" };
      if (abs <= 5) return { score: 75, label: "High" };
      if (abs <= 10) return { score: 50, label: "Medium" };
      return { score: 25, label: "Low" };
    }
  }
  function getConfidenceClass(score) {
    if (score >= 90) return "confidence-very-high";
    if (score >= 75) return "confidence-high";
    if (score >= 50) return "confidence-medium";
    return "confidence-low";
  }
  async function loadReconciliationHistory() {
    historyLoading = true;
    error = "";
    try {
      await supabaseService.init();
      const result = await supabaseService.getReconciliationHistory(50);
      if (result.error) {
        error = result.error;
      } else {
        reconciliationHistory = result.data || [];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load reconciliation history";
    }
    historyLoading = false;
  }
  const bowserDifference = 0;
  const fuelVariance = 0;
  const tankVariancePercentage = 0;
  const fuelConfidence = getConfidenceScore(fuelVariance, "fuel");
  const tankConfidence = getConfidenceScore(tankVariancePercentage, "tank");
  const each_array = ensure_array_like(datePresets);
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Reconciliations - FarmTrack</title>`;
  });
  $$payload.out.push(`<div class="reconciliation-container svelte-srfny5"><div class="header svelte-srfny5"><h1 class="svelte-srfny5">Reconciliations</h1> <p class="svelte-srfny5">Fuel usage and tank level reconciliation with flexible date ranges</p></div> <div class="date-section svelte-srfny5"><h2 class="svelte-srfny5">Date Range</h2> <div class="date-presets svelte-srfny5"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let preset = each_array[$$index];
    $$payload.out.push(`<button${attr_class("preset-btn svelte-srfny5", void 0, { "active": selectedRange === preset.value })}>${escape_html(preset.label)}</button>`);
  }
  $$payload.out.push(`<!--]--></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="selected-range svelte-srfny5"><strong>Selected Period:</strong> ${escape_html(startDate)} ${escape_html("")}</div></div> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-message svelte-srfny5"><span class="error-icon svelte-srfny5">⚠️</span> <span>${escape_html(error)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="reconciliation-sections svelte-srfny5"><div class="reconciliation-card svelte-srfny5"><div class="card-header svelte-srfny5"><div class="header-content svelte-srfny5"><h3 class="svelte-srfny5">Fuel Reconciliation</h3> <p class="svelte-srfny5">Compare fuel dispensed vs bowser readings</p></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <div class="card-content svelte-srfny5"><div class="metrics-preview svelte-srfny5"><div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Fuel Dispensed</span> <span class="metric-value svelte-srfny5">${escape_html(formatNumber(fuelData?.fuelDispensed))}L</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Bowser Difference</span> <span class="metric-value svelte-srfny5">${escape_html(formatNumber(bowserDifference))}L</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Variance</span> <span${attr_class(`metric-value variance ${stringify(getVarianceClass(fuelVariance))}`, "svelte-srfny5")}>${escape_html(Math.abs(fuelVariance) < 0.1 ? "0" : "+" + fuelVariance.toFixed(1))}L</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Confidence</span> <span${attr_class(`metric-value confidence ${stringify(getConfidenceClass(fuelConfidence.score))}`, "svelte-srfny5")}>${escape_html(fuelConfidence.label)} (${escape_html(fuelConfidence.score)}%)</span></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="reconcile-actions svelte-srfny5">`);
  Button($$payload, {
    variant: "primary",
    onclick: performFuelReconciliation,
    disabled: !fuelData,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html("Reconcile Fuel Usage")}`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    onclick: () => {
      console.log("Edit Entries clicked");
      showFuelEditor = true;
    },
    disabled: !startDate,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Edit Entries`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    onclick: () => {
      console.log("Generate Report clicked");
      showReporting = true;
    },
    disabled: !startDate,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Generate Report`);
    }
  });
  $$payload.out.push(`<!----></div></div></div> <div class="reconciliation-card svelte-srfny5"><div class="card-header svelte-srfny5"><div class="header-content svelte-srfny5"><h3 class="svelte-srfny5">Tank Reconciliation</h3> <p class="svelte-srfny5">Compare tank levels vs dipstick readings</p></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <div class="card-content svelte-srfny5"><div class="metrics-preview svelte-srfny5"><div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Calculated Level</span> <span class="metric-value svelte-srfny5">${escape_html(formatNumber(tankData?.tankCalculated))}L</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Measured Level</span> <span class="metric-value svelte-srfny5">${escape_html(formatNumber(tankData?.tankMeasured))}L</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Variance</span> <span${attr_class(`metric-value variance ${stringify(getTankVarianceClass(tankVariancePercentage))}`, "svelte-srfny5")}>${escape_html(Math.abs(tankVariancePercentage) < 0.1 ? "0" : "+" + tankVariancePercentage.toFixed(1))}%</span></div> <div class="metric svelte-srfny5"><span class="metric-label svelte-srfny5">Confidence</span> <span${attr_class(`metric-value confidence ${stringify(getConfidenceClass(tankConfidence.score))}`, "svelte-srfny5")}>${escape_html(tankConfidence.label)} (${escape_html(tankConfidence.score)}%)</span></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="reconcile-actions svelte-srfny5">`);
  Button($$payload, {
    variant: "secondary",
    onclick: performTankReconciliation,
    disabled: !tankData,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html("Reconcile Tank Levels")}`);
    }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    onclick: () => showTankEditor = true,
    disabled: !endDate,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->Adjust Levels`);
    }
  });
  $$payload.out.push(`<!----></div></div></div></div> <div class="history-section svelte-srfny5"><div class="section-header svelte-srfny5"><h2 class="svelte-srfny5">Reconciliation History</h2> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    onclick: loadReconciliationHistory,
    disabled: historyLoading,
    children: ($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html(historyLoading ? "Loading..." : "Refresh")}`);
    }
  });
  $$payload.out.push(`<!----></div> `);
  if (historyLoading) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="loading svelte-srfny5">Loading reconciliation history...</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (reconciliationHistory.length > 0) {
      $$payload.out.push("<!--[-->");
      const fuelRecords = reconciliationHistory.filter((r) => r.type === "fuel");
      const tankRecords = reconciliationHistory.filter((r) => r.type === "tank");
      if (fuelRecords.length > 0) {
        $$payload.out.push("<!--[-->");
        const each_array_1 = ensure_array_like(fuelRecords);
        $$payload.out.push(`<div class="table-section svelte-srfny5"><h3 class="svelte-srfny5">Fuel Reconciliation</h3> <div class="table-container svelte-srfny5"><table class="history-table svelte-srfny5"><thead><tr><th class="svelte-srfny5">Date</th><th class="svelte-srfny5">Dispensed</th><th class="svelte-srfny5">Open</th><th class="svelte-srfny5">Close</th><th class="svelte-srfny5">Diff</th><th class="svelte-srfny5">Var</th></tr></thead><tbody class="svelte-srfny5"><!--[-->`);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let record = each_array_1[$$index_1];
          $$payload.out.push(`<tr class="svelte-srfny5"><td class="svelte-srfny5">${escape_html(new Date(record.date).toLocaleDateString("en-ZA"))} `);
          if (record.start_date && record.end_date) {
            $$payload.out.push("<!--[-->");
            $$payload.out.push(`<div class="date-range svelte-srfny5">(${escape_html(record.start_date)} to ${escape_html(record.end_date)})</div>`);
          } else {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]--></td><td class="svelte-srfny5">${escape_html(formatNumber(record.fuel_dispensed))}L</td><td class="svelte-srfny5">${escape_html(formatNumber(record.bowser_start || 0))}L</td><td class="svelte-srfny5">${escape_html(formatNumber(record.bowser_end || 0))}L</td><td class="svelte-srfny5">${escape_html(formatNumber((record.bowser_end || 0) - (record.bowser_start || 0)))}L</td><td${attr_class(`variance ${stringify(getVarianceClass(Math.abs(record.fuel_dispensed - record.fuel_received)))}`, "svelte-srfny5")}>${escape_html(Math.abs(record.fuel_dispensed - record.fuel_received) < 0.1 ? "0" : (record.fuel_dispensed - record.fuel_received >= 0 ? "+" : "") + (record.fuel_dispensed - record.fuel_received).toFixed(1))}L</td></tr>`);
        }
        $$payload.out.push(`<!--]--></tbody></table></div></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--> `);
      if (tankRecords.length > 0) {
        $$payload.out.push("<!--[-->");
        const each_array_2 = ensure_array_like(tankRecords);
        $$payload.out.push(`<div class="table-section svelte-srfny5"><h3 class="svelte-srfny5">Tank Reconciliation</h3> <div class="table-container svelte-srfny5"><table class="history-table svelte-srfny5"><thead><tr><th class="svelte-srfny5">Date</th><th class="svelte-srfny5">Dip Level</th><th class="svelte-srfny5">Level</th><th class="svelte-srfny5">Difference (L)</th></tr></thead><tbody class="svelte-srfny5"><!--[-->`);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let record = each_array_2[$$index_2];
          $$payload.out.push(`<tr class="svelte-srfny5"><td class="svelte-srfny5">${escape_html(new Date(record.date).toLocaleDateString("en-ZA"))}</td><td class="svelte-srfny5">${escape_html(formatNumber(record.measured_level))}L</td><td class="svelte-srfny5">${escape_html(formatNumber(record.calculated_level))}L</td><td${attr_class(`variance ${stringify(getTankVarianceClass(Math.abs((record.calculated_level - record.measured_level) / 24e3 * 100)))}`, "svelte-srfny5")}>${escape_html(Math.abs(record.calculated_level - record.measured_level) < 0.1 ? "0" : (record.calculated_level - record.measured_level >= 0 ? "+" : "") + (record.calculated_level - record.measured_level).toFixed(1))}L</td></tr>`);
        }
        $$payload.out.push(`<!--]--></tbody></table></div></div>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`<div class="history-placeholder svelte-srfny5"><p>No reconciliation history found</p></div>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div> `);
  if (showFuelEditor) {
    $$payload.out.push("<!--[-->");
    InlineFuelEditor($$payload, {
      startDate,
      endDate,
      onclose: () => showFuelEditor = false
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (showTankEditor) {
    $$payload.out.push("<!--[-->");
    TankLevelAdjustment($$payload, {
      date: endDate,
      onclose: () => showTankEditor = false
    });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (showReporting) {
    $$payload.out.push("<!--[-->");
    ReportingFramework($$payload, { startDate, endDate, onclose: () => showReporting = false });
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
