import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ApiResponse,
	DieselClaimMethod,
	FuelEntry,
	VehicleMonthlyClaimAdjustment
} from '$lib/types';
import { calculateDieselClaim, roundClaimLitres } from '$lib/utils/diesel-claim';

// ---------------------------------------------------------------------------
// Ledger-style export palette
// Strictly black/white/grey with exactly two semantic exceptions:
//   RED   = fuel/tank removals (litres dispensed / fuel out / negative adjustments)
//   GREEN = fuel in (deliveries / refills / positive adjustments)
// ---------------------------------------------------------------------------
const XL_RED = 'B91C1C';
const XL_CLAIM_GREEN = '2F7D4F';
const XL_NONCLAIM_RED = '9B5555';
const XL_KEY_FILL = 'F1F1EF';
const XL_HEADER_FILL = 'F5F5F4';
const XL_HAIRLINE = 'D6D3D1';

const PDF_RED: [number, number, number] = [185, 28, 28];
const PDF_GREEN: [number, number, number] = [21, 128, 61];
const PDF_CLAIM_GREEN: [number, number, number] = [47, 125, 79];
const PDF_NONCLAIM_RED: [number, number, number] = [155, 85, 85];
const PDF_GREY: [number, number, number] = [120, 113, 108];
const PDF_AMBER: [number, number, number] = [160, 94, 16];

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

interface ClaimPeriodLabel {
	title: string;
	subtitle: string;
	fileSlug: string;
	isFullMonth: boolean;
}

// "June 2026" for a whole calendar month, "1 Mar – 17 Jul 2026" otherwise.
function claimPeriodLabel(startDate: string, endDate: string): ClaimPeriodLabel {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	const lastOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
	const isFullMonth =
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === 1 &&
		end.getDate() === lastOfEndMonth;
	if (isFullMonth) {
		const monthName = MONTH_NAMES[start.getMonth()];
		return {
			title: `${monthName} ${start.getFullYear()}`,
			subtitle: `1–${end.getDate()} ${monthName} ${start.getFullYear()}`,
			fileSlug: `${monthName}_${start.getFullYear()}`,
			isFullMonth
		};
	}
	const dayMonth = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
	const sameYear = start.getFullYear() === end.getFullYear();
	const title = `${dayMonth(start)}${sameYear ? '' : ` ${start.getFullYear()}`} – ${dayMonth(end)} ${end.getFullYear()}`;
	return { title, subtitle: title, fileSlug: `${startDate}_to_${endDate}`, isFullMonth };
}

const monthKeyLabel = (monthKey: string) =>
	`${MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;

const isoDayBefore = (isoDate: string) => {
	const d = new Date(`${isoDate}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().split('T')[0];
};
const PDF_HAIRLINE: [number, number, number] = [214, 211, 209];

const xlHairlineBorder = {
	top: { style: 'thin', color: { rgb: XL_HAIRLINE } },
	bottom: { style: 'thin', color: { rgb: XL_HAIRLINE } },
	left: { style: 'thin', color: { rgb: XL_HAIRLINE } },
	right: { style: 'thin', color: { rgb: XL_HAIRLINE } }
};

/**
 * Strip emoji / non-printable-ASCII from text destined for generated
 * documents. jsPDF's built-in Helvetica cannot render emoji or multibyte
 * symbols — glyph widths miscalculate and text prints stretched or
 * truncated (e.g. the vehicle type "6 - Vehicle 🛻").
 */
function cleanDocText(text: string | null | undefined): string {
	return (text || '')
		.replace(/[^\x20-\x7E]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function cleanVehicleCategory(text: string | null | undefined): string {
	return cleanDocText(text).replace(/^\d+\s*-\s*/, '');
}

interface LedgerColumnStyle {
	numFmt?: string;
	halign?: 'left' | 'right' | 'center';
	fontColor?: string;
	fillColor?: string;
	bold?: boolean;
}

// Apply the clean-ledger cell styles to a worksheet built with aoa_to_sheet.
// Styling only — never touches cell values, merges, or layout.
function applyLedgerStyles(
	worksheet: XLSX.WorkSheet,
	opts: {
		titleRows: number[];
		headerRows: number[];
		dataStartRow: number;
		rowCount: number;
		colCount: number;
		columnStyles?: Record<number, LedgerColumnStyle>;
	}
): void {
	const columnStyles = opts.columnStyles || {};

	for (let r = 0; r < opts.rowCount; r++) {
		for (let c = 0; c < opts.colCount; c++) {
			const addr = XLSX.utils.encode_cell({ r, c });
			const cell: any = (worksheet as any)[addr];
			if (!cell) continue;
			const colStyle = columnStyles[c] || {};

			if (opts.titleRows.includes(r)) {
				// Title row: larger bold black, no fill
				cell.s = {
					font: { bold: true, sz: 14, color: { rgb: '000000' } },
					alignment: { horizontal: 'left', vertical: 'center' }
				};
			} else if (opts.headerRows.includes(r)) {
				// Headers: bold black on very light grey, thin bottom border
				cell.s = {
					font: { bold: true, sz: 10, color: { rgb: colStyle.fontColor || '000000' } },
					fill: {
						patternType: 'solid',
						fgColor: { rgb: colStyle.fillColor || XL_HEADER_FILL }
					},
					border: {
						...xlHairlineBorder,
						bottom: { style: 'thin', color: { rgb: 'A8A29E' } }
					},
					alignment: { horizontal: 'center', vertical: 'center' }
				};
			} else if (r >= opts.dataStartRow) {
				// Body: black text, hairline grey borders
				const style: any = {
					font: {
						bold: colStyle.bold || false,
						sz: 10,
						color: { rgb: colStyle.fontColor || '000000' }
					},
					border: xlHairlineBorder,
					alignment: { horizontal: colStyle.halign || 'left', vertical: 'center' }
				};
				if (colStyle.fillColor) {
					style.fill = { patternType: 'solid', fgColor: { rgb: colStyle.fillColor } };
				}
				if (colStyle.numFmt && typeof cell.v === 'number') {
					style.numFmt = colStyle.numFmt;
				}
				cell.s = style;
			}
		}
	}
}

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
	interface jsPDF {
		autoTable: typeof autoTable;
		lastAutoTable: {
			finalY: number;
		};
	}
}

export interface ExportData {
	date: string;
	vehicle: string;
	field: string;
	activity: string;
	fuel: number;
	hrsKm: number;
	odoEnd: number;
	store: string;
	issueNo: number;
	tons: number;
	driver: string;
}

export interface MonthlySummaryData {
	code: string;
	name: string;
	registration: string;
	category: string;
	distance: number | string;
	fuel: number;
	claimableFuel: number;
	nonClaimableFuel: number;
	consumption: number | string;
	unit: string;
}

export interface MonthlyClaimExportData {
	summary: MonthlySummaryData[];
	warnings: string[];
}

interface MonthlyClaimDataService {
	init(): Promise<void>;
	getClient(): SupabaseClient;
	getVehicleMonthlyClaimAdjustments(
		startMonth?: string,
		endMonth?: string
	): Promise<ApiResponse<VehicleMonthlyClaimAdjustment[]>>;
}

class ExportService {
	// Fetch fuel entries data for export with date range
	async getFuelEntriesForExport(
		startDate: string,
		endDate: string,
		supabaseService: any
	): Promise<ApiResponse<ExportData[]>> {
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();

			// Fetch fuel entries with all related data
			const result = await client
				.from('fuel_entries')
				.select(
					`
					*,
					vehicles:vehicle_id(code, name),
					drivers:driver_id(employee_code, name),
					activities:activity_id(code, name),
					fields:field_id(code, name),
					zones:zone_id(code, name),
					bowsers:bowser_id(code, name),
					fuel_entry_fields(
						fields(code, name)
					)
				`
				)
				.is('deleted_at', null)
				.gte('entry_date', startDate)
				.lte('entry_date', endDate)
				.order('entry_date', { ascending: true })
				.order('time', { ascending: true });

			if (result.error) {
				return { data: null, error: result.error.message };
			}

			// Transform data to match Excel format - filter out entries without valid vehicles
			const exportData: ExportData[] = result.data
				.filter((entry: any) => entry.vehicles) // Only include entries with valid vehicle relationships
				.map((entry: any) => {
					// Calculate distance from odometer readings
					let hrsKm = 0;
					if (
						entry.odometer_end &&
						entry.odometer_start &&
						entry.odometer_end > entry.odometer_start
					) {
						hrsKm = entry.odometer_end - entry.odometer_start;
					} else if (entry.hours_worked) {
						// Fallback to hours worked if no valid odometer readings
						hrsKm = entry.hours_worked;
					} else if (entry.distance_km) {
						// Fallback to distance_km if available
						hrsKm = entry.distance_km;
					}

					// Get field names - handle both multi-field (junction table) and single field (legacy)
					let fieldNames = 'N/A';
					if (entry.fuel_entry_fields && entry.fuel_entry_fields.length > 0) {
						// Multi-field entries - join with comma
						fieldNames = entry.fuel_entry_fields
							.map((fef: any) => fef.fields?.name || fef.fields?.code || '')
							.filter((name: string) => name !== '')
							.join(', ');
					} else if (entry.fields?.name) {
						// Single field entry (legacy)
						fieldNames = entry.fields.name;
					} else if (entry.zones?.name) {
						// Zone entry
						fieldNames = entry.zones.name;
					}

					return {
						date: this.formatDate(entry.entry_date),
						vehicle: entry.vehicles.code || 'N/A',
						field: fieldNames,
						activity: entry.activities?.code || 'N/A',
						fuel: entry.litres_dispensed || 0,
						hrsKm: hrsKm,
						odoEnd: entry.odometer_end || 0,
						store: entry.bowsers?.code || 'Tank A',
						issueNo: 0, // Default value as per your example
						tons: entry.tons_transported || 0,
						driver: entry.drivers?.employee_code || 'N/A'
					};
				});

			return { data: exportData, error: null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to fetch export data'
			};
		}
	}

	// Generate Excel file and trigger download
	async generateExcelFile(
		data: ExportData[],
		startDate: string,
		endDate: string,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			// Create new workbook
			const workbook = XLSX.utils.book_new();

			// Format date range for header
			const formattedStartDate = this.formatDate(startDate);
			const formattedEndDate = this.formatDate(endDate);
			const dateRange = `(${formattedStartDate}-${formattedEndDate})`;

			// Create header data
			const headerData = [
				[`Vehicle Daily Capture Sheet (Estate - ${companyName}) - ${dateRange}`],
				[],
				[
					'Date',
					'Vehicle',
					'Activity Details',
					'',
					'Fuel Consp',
					'',
					'',
					'Fuel Store',
					'',
					'Other',
					''
				],
				[
					'Date',
					'Vehicle',
					'Field',
					'Activity',
					'Fuel',
					'HrsKm',
					'Odo. End',
					'Store',
					'Issue No.',
					'Tons',
					'Driver'
				]
			];

			// Add data rows
			const dataRows = data.map((row) => [
				row.date,
				row.vehicle,
				row.field,
				row.activity,
				row.fuel,
				row.hrsKm,
				row.odoEnd,
				row.store,
				row.issueNo,
				row.tons,
				row.driver
			]);

			// Combine header and data
			const worksheetData = [...headerData, ...dataRows];

			// Create worksheet
			const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

			// Set column widths
			worksheet['!cols'] = [
				{ wch: 12 }, // Date
				{ wch: 10 }, // Vehicle
				{ wch: 10 }, // Field
				{ wch: 10 }, // Activity
				{ wch: 8 }, // Fuel
				{ wch: 8 }, // HrsKm
				{ wch: 10 }, // Odo. End
				{ wch: 10 }, // Store
				{ wch: 10 }, // Issue No.
				{ wch: 8 }, // Tons
				{ wch: 8 } // Driver
			];

			// Merge cells for main header
			worksheet['!merges'] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Main header
				{ s: { r: 2, c: 2 }, e: { r: 2, c: 3 } }, // Activity Details
				{ s: { r: 2, c: 4 }, e: { r: 2, c: 6 } }, // Fuel Consp
				{ s: { r: 2, c: 7 }, e: { r: 2, c: 8 } }, // Fuel Store
				{ s: { r: 2, c: 9 }, e: { r: 2, c: 10 } } // Other
			];

			// Clean-ledger styling: monochrome, hairline borders,
			// red for fuel dispensed (fuel out of the tank)
			applyLedgerStyles(worksheet, {
				titleRows: [0],
				headerRows: [2, 3],
				dataStartRow: 4,
				rowCount: worksheetData.length,
				colCount: 11,
				columnStyles: {
					4: { numFmt: '#,##0.0', halign: 'right', fontColor: XL_RED }, // Fuel (litres dispensed = fuel out)
					5: { numFmt: '#,##0.0', halign: 'right' }, // HrsKm
					6: { numFmt: '#,##0', halign: 'right' }, // Odo. End
					8: { numFmt: '0', halign: 'right' }, // Issue No.
					9: { numFmt: '#,##0.0', halign: 'right' } // Tons
				}
			});
			for (let column = 0; column < 10; column++) {
				const cell: any = (worksheet as any)[
					XLSX.utils.encode_cell({ r: worksheetData.length - 1, c: column })
				];
				if (cell) cell.s = { ...cell.s, font: { ...(cell.s?.font || {}), bold: true } };
			}

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehicle Daily Capture');

			// Generate filename
			const filename = `Vehicle_Daily_Capture_${startDate}_to_${endDate}.xlsx`;

			// Write and download file
			XLSX.writeFile(workbook, filename);
		} catch (error) {
			console.error('Failed to generate Excel file:', error);
			throw new Error('Failed to generate Excel file');
		}
	}

	// Helper method to format dates consistently
	private formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
	}

	// Fetch per-vehicle claim summary data for an arbitrary date range
	async getClaimSummaryForExport(
		startDate: string,
		endDate: string,
		supabaseService: MonthlyClaimDataService
	): Promise<ApiResponse<MonthlyClaimExportData>> {
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();

			const [result, adjustmentsResult] = await Promise.all([
				client
					.from('fuel_entries')
					.select(
						`
						*,
						vehicles:vehicle_id(id, code, name, type, odometer_unit, registration, diesel_claim_method),
						activities:activity_id(id, name, diesel_claim_eligible, diesel_claim_reviewed_at)
					`
					)
					.is('deleted_at', null)
					.gte('entry_date', startDate)
					.lte('entry_date', endDate)
					.order('entry_date', { ascending: true })
					.order('time', { ascending: true }),
				supabaseService.getVehicleMonthlyClaimAdjustments(
					`${startDate.slice(0, 7)}-01`,
					`${endDate.slice(0, 7)}-01`
				)
			]);

			if (result.error) return { data: null, error: result.error.message };
			if (adjustmentsResult.error) return { data: null, error: adjustmentsResult.error };
			const adjustments = adjustmentsResult.data || [];
			// Classifier percentages are monthly facts: key by vehicle AND month so
			// a multi-month period applies each month's own percentage.
			const adjustmentByVehicleMonth = new Map(
				adjustments.map((item) => [`${item.vehicle_id}|${String(item.claim_month).slice(0, 7)}`, item])
			);

			// Group data by vehicle and calculate summaries
			const vehicleSummaries = new Map<
				string,
				{
					vehicleId: string;
					code: string;
					name: string;
					type: string;
					registration: string;
					odometerUnit: string | null;
					claimMethod: DieselClaimMethod;
					totalFuel: number;
					baseEligibleFuel: number;
					firstOdometer: number | null;
					lastOdometer: number | null;
					totalHours: number;
					hasOdometerData: boolean;
					hasHoursData: boolean;
					months: Map<string, { total: number; eligible: number }>;
					activities: Map<
						string,
						{ name: string; eligible: boolean; reviewed: boolean; litres: number }
					>;
				}
			>();

			(result.data || []).forEach((entry: any) => {
				const vehicleId = entry.vehicle_id;
				const vehicle = Array.isArray(entry.vehicles) ? entry.vehicles[0] : entry.vehicles;
				const activity = Array.isArray(entry.activities) ? entry.activities[0] : entry.activities;

				if (!vehicle) return;

				const key = vehicleId;
				if (!vehicleSummaries.has(key)) {
					vehicleSummaries.set(key, {
						vehicleId,
						code: vehicle.code || 'N/A',
						name: vehicle.name || 'Unknown',
						type: vehicle.type || 'Other',
						registration: vehicle.registration || '',
						odometerUnit: vehicle.odometer_unit || null,
						claimMethod: vehicle.diesel_claim_method || 'activity_only',
						totalFuel: 0,
						baseEligibleFuel: 0,
						firstOdometer: null,
						lastOdometer: null,
						totalHours: 0,
						hasOdometerData: false,
						hasHoursData: false,
						months: new Map(),
						activities: new Map()
					});
				}

				const summary = vehicleSummaries.get(key)!;
				const litres = Number(entry.litres_dispensed || 0);
				const activityEligible = activity?.diesel_claim_eligible === true;
				summary.totalFuel += litres;
				if (activityEligible) summary.baseEligibleFuel += litres;
				const activityKey = activity?.id || 'unknown';
				const activitySummary = summary.activities.get(activityKey) || {
					name: activity?.name || 'Unknown / unassigned',
					eligible: activityEligible,
					reviewed: !!activity?.diesel_claim_reviewed_at,
					litres: 0
				};
				activitySummary.litres += litres;
				summary.activities.set(activityKey, activitySummary);

				const monthKey = String(entry.entry_date).slice(0, 7);
				const monthTotals = summary.months.get(monthKey) || { total: 0, eligible: 0 };
				monthTotals.total += litres;
				if (activityEligible) monthTotals.eligible += litres;
				summary.months.set(monthKey, monthTotals);

				// Track odometer readings to get month start and end
				if (entry.odometer_start && entry.odometer_start > 0) {
					if (summary.firstOdometer === null || entry.odometer_start < summary.firstOdometer) {
						summary.firstOdometer = entry.odometer_start;
					}
					summary.hasOdometerData = true;
				}

				if (entry.odometer_end && entry.odometer_end > 0) {
					if (summary.lastOdometer === null || entry.odometer_end > summary.lastOdometer) {
						summary.lastOdometer = entry.odometer_end;
					}
					summary.hasOdometerData = true;
				}

				if (entry.hours_worked && entry.hours_worked > 0) {
					summary.totalHours += entry.hours_worked;
					summary.hasHoursData = true;
				}
			});

			const warnings: string[] = [];
			const summaryData: MonthlySummaryData[] = Array.from(vehicleSummaries.values())
				.filter((summary) => summary.totalFuel > 0) // Only include vehicles with fuel consumption
				.map((summary) => {
					let distance: number | string = '';
					let consumption: number | string = '';
					let unit = '';

					// Only calculate if there is an odometer_unit (not null, not undefined, not empty)
					if (summary.odometerUnit?.trim()) {
						unit = summary.odometerUnit;

						// Calculate distance based on odometer difference
						if (
							summary.hasOdometerData &&
							summary.firstOdometer !== null &&
							summary.lastOdometer !== null
						) {
							const odometerDifference = summary.lastOdometer - summary.firstOdometer;
							if (odometerDifference > 0) {
								distance = Math.round(odometerDifference * 100) / 100; // 2 decimal places

								// Calculate consumption: fuel / distance
								// If unit is km, multiply by 100 to get L/100km
								if (unit.toLowerCase() === 'km') {
									consumption =
										Math.round((summary.totalFuel / (odometerDifference / 100)) * 100) / 100; // L/100km, 2 decimal places
								} else {
									consumption = Math.round((summary.totalFuel / odometerDifference) * 100) / 100; // L per unit, 2 decimal places
								}
							} else {
								// No movement - show 0.00 distance and no consumption
								distance = 0.0;
								consumption = '';
							}
						} else {
							// No odometer data - show empty distance and no consumption
							distance = '';
							consumption = '';
						}
					}
					// If no odometer_unit, distance, consumption, and unit remain empty

					// Classifier vehicles get each month's own percentage; a period
					// spanning months is the sum of its monthly claims.
					let claimableLitres = 0;
					if (summary.claimMethod === 'monthly_classifier') {
						for (const [monthKey, monthTotals] of summary.months) {
							const claim = calculateDieselClaim({
								totalLitres: monthTotals.total,
								baseEligibleLitres: monthTotals.eligible,
								method: summary.claimMethod,
								adjustment: adjustmentByVehicleMonth.get(`${summary.vehicleId}|${monthKey}`)
							});
							if (claim.missingAdjustment)
								warnings.push(
									`${summary.code}: classifier result missing for ${monthKeyLabel(monthKey)}; that month's litres excluded.`
								);
							claimableLitres += claim.claimableLitres;
						}
					} else {
						claimableLitres = calculateDieselClaim({
							totalLitres: summary.totalFuel,
							baseEligibleLitres: summary.baseEligibleFuel,
							method: summary.claimMethod
						}).claimableLitres;
					}
					for (const activity of summary.activities.values()) {
						if (!activity.reviewed)
							warnings.push(`${activity.name}: activity eligibility has not been reviewed.`);
					}

					const roundedTotal = roundClaimLitres(summary.totalFuel);
					const roundedClaimable = roundClaimLitres(claimableLitres);
					return {
						code: summary.code,
						name: summary.name,
						registration: summary.registration,
						// Vehicle types in the DB carry emoji (e.g. "6 - Vehicle 🛻")
						// which jsPDF's Helvetica cannot render — glyph widths go
						// wrong and the text prints stretched/truncated. Strip to
						// printable ASCII for documents.
						category: cleanVehicleCategory(summary.type),
						distance: distance,
						fuel: roundedTotal,
						claimableFuel: roundedClaimable,
						nonClaimableFuel: roundClaimLitres(roundedTotal - roundedClaimable),
						consumption: consumption,
						unit: unit
					};
				})
				.sort((a, b) => a.code.localeCompare(b.code)); // Sort by vehicle code

			return {
				data: {
					summary: summaryData,
					warnings: [...new Set(warnings)]
				},
				error: null
			};
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to fetch monthly summary data'
			};
		}
	}

	// Generate claim summary Excel file
	async generateMonthlySummaryExcel(
		report: MonthlyClaimExportData,
		startDate: string,
		endDate: string,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			const data = report.summary;
			const workbook = XLSX.utils.book_new();
			const label = claimPeriodLabel(startDate, endDate);

			// Create header data
			const headerData = [
				[`Fuel and Diesel Claim Summary - ${companyName} - ${label.title}`],
				report.warnings.length > 0
					? ['Attention: claim data needs review on the Audit page before submission.']
					: [],
				[
					'Code',
					'Name',
					'Category',
					'Distance',
					'Total Fuel',
					'Claimable',
					'Non-claimable',
					'Consumption',
					'Unit'
				]
			];

			// Add data rows
			const dataRows = data.map((row) => [
				row.code,
				row.name,
				row.category,
				row.distance,
				row.fuel,
				row.claimableFuel,
				row.nonClaimableFuel,
				row.consumption,
				row.unit
			]);
			const totals = data.reduce(
				(acc, row) => ({
					total: acc.total + row.fuel,
					claimable: acc.claimable + row.claimableFuel
				}),
				{ total: 0, claimable: 0 }
			);
			dataRows.push([
				'',
				'TOTAL',
				'',
				'',
				roundClaimLitres(totals.total),
				roundClaimLitres(totals.claimable),
				roundClaimLitres(totals.total - totals.claimable),
				'',
				''
			]);

			// Combine header and data
			const worksheetData = [...headerData, ...dataRows];

			// Create worksheet
			const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

			// Set column widths
			worksheet['!cols'] = [
				{ wch: 8 },
				{ wch: 24 },
				{ wch: 15 },
				{ wch: 10 },
				{ wch: 12 },
				{ wch: 12 },
				{ wch: 14 },
				{ wch: 12 },
				{ wch: 8 }
			];

			// Merge cells for main header
			worksheet['!merges'] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
				{ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
			];

			// Clean-ledger styling: monochrome, hairline borders,
			// red for fuel consumed (fuel out of the tank)
			applyLedgerStyles(worksheet, {
				titleRows: [0],
				headerRows: [2],
				dataStartRow: 3,
				rowCount: worksheetData.length,
				colCount: 9,
				columnStyles: {
					3: { numFmt: '#,##0.00', halign: 'right' },
					4: { numFmt: '#,##0.00', halign: 'right', fillColor: XL_KEY_FILL },
					5: {
						numFmt: '#,##0.00',
						halign: 'right',
						fontColor: XL_CLAIM_GREEN,
						fillColor: XL_KEY_FILL,
						bold: true
					},
					6: {
						numFmt: '#,##0.00',
						halign: 'right',
						fontColor: XL_NONCLAIM_RED,
						fillColor: XL_KEY_FILL
					},
					7: { numFmt: '#,##0.00', halign: 'right' },
					8: { halign: 'center' }
				}
			});

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Claim Summary');

			// Generate filename
			const filename = `Vehicle_Claim_Summary_${label.fileSlug}.xlsx`;

			// Write and download file
			XLSX.writeFile(workbook, filename);
		} catch (error) {
			console.error('Failed to generate monthly summary Excel file:', error);
			throw new Error('Failed to generate monthly summary Excel file');
		}
	}

	// Main export method that handles the complete flow
	async exportToExcel(
		startDate: string,
		endDate: string,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch data
			const result = await this.getFuelEntriesForExport(startDate, endDate, supabaseService);

			if (result.error || !result.data) {
				return { success: false, error: result.error || 'No data found' };
			}

			// Generate and download Excel file
			await this.generateExcelFile(result.data, startDate, endDate, companyName);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Export failed'
			};
		}
	}

	// Claim summary Excel export (whole month or custom period)
	async exportClaimSummary(
		startDate: string,
		endDate: string,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch data
			const result = await this.getClaimSummaryForExport(startDate, endDate, supabaseService);

			if (result.error || !result.data) {
				return { success: false, error: result.error || 'No data found' };
			}

			// Generate and download Excel file
			await this.generateMonthlySummaryExcel(result.data, startDate, endDate, companyName);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Monthly summary export failed'
			};
		}
	}

	// Claim summary PDF export with reconciliation (whole month or custom period)
	async exportClaimSummaryPDF(
		startDate: string,
		endDate: string,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch vehicle data
			const vehicleResult = await this.getClaimSummaryForExport(startDate, endDate, supabaseService);

			if (vehicleResult.error || !vehicleResult.data) {
				return { success: false, error: vehicleResult.error || 'No vehicle data found' };
			}

			// Opening balances come from the day before the period starts
			const dayBeforeStart = isoDayBefore(startDate);

			let reconciliationData = {
				fuelDispensed: 0,
				bowserStart: 0,
				bowserEnd: 0,
				tankStartCalculated: 0,
				tankStartDate: null as string | null,
				lastDipReading: 0,
				lastDipDate: null as string | null,
				tankActivities: [],
				reconciled: false
			};

			try {
				// Performance optimization: Execute all reconciliation queries in parallel
				const [fuelReconResult, tankStartReconResult, dipReadingResult, tankActivitiesResult] =
					await Promise.all([
						// Fuel reconciliation data
						supabaseService.getDateRangeReconciliationData(startDate, endDate),

						// Opening tank level: latest close on or before the day
						// before the period starts (month-end closes exist, so a
						// mid-month start falls back to the nearest earlier close)
						supabaseService.query(() =>
							supabaseService
								.ensureInitialized()
								.from('tank_reconciliations')
								.select('*')
								.lte('reconciliation_date', dayBeforeStart)
								.order('reconciliation_date', { ascending: false })
								.limit(1)
								.maybeSingle()
						),

						// Actual dip reading from tank_readings table (last reading in the period)
						supabaseService.query(() =>
							supabaseService
								.ensureInitialized()
								.from('tank_readings')
								.select('*')
								.gte('reading_date', startDate)
								.lte('reading_date', endDate)
								.order('reading_date', { ascending: false })
								.limit(1)
								.maybeSingle()
						),

						// Tank activities (refills and adjustments) for the period
						supabaseService.query(() =>
							supabaseService
								.ensureInitialized()
								.from('tank_refills')
								.select('delivery_date, litres_added, invoice_number')
								.gte('delivery_date', startDate)
								.lte('delivery_date', endDate)
								.order('delivery_date', { ascending: true })
						)
					]);

				// Process results
				if (fuelReconResult.data) {
					reconciliationData.fuelDispensed = fuelReconResult.data.fuelDispensed || 0;
					reconciliationData.bowserStart = fuelReconResult.data.bowserStart || 0;
					reconciliationData.bowserEnd = fuelReconResult.data.bowserEnd || 0;
				}

				if (tankStartReconResult.data) {
					reconciliationData.tankStartCalculated = tankStartReconResult.data.calculated_level || 0;
					reconciliationData.tankStartDate = tankStartReconResult.data.reconciliation_date || null;
				}

				if (dipReadingResult.data) {
					reconciliationData.lastDipReading = dipReadingResult.data.reading_value || 0;
					reconciliationData.lastDipDate = dipReadingResult.data.reading_date || null;
				}

				if (tankActivitiesResult.data) {
					reconciliationData.tankActivities = tankActivitiesResult.data || [];
				}
			} catch (reconError) {
				console.warn('Could not fetch reconciliation data:', reconError);
			}

			// Generate enhanced PDF with reconciliation data
			await this.generateMonthlySummaryPDFWithReconciliation(
				vehicleResult.data,
				reconciliationData,
				startDate,
				endDate,
				companyName
			);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Enhanced PDF export failed'
			};
		}
	}

	// Generate enhanced monthly summary PDF with reconciliation data (journal style)
	async generateMonthlySummaryPDFWithReconciliation(
		report: MonthlyClaimExportData,
		reconciliationData: any,
		startDate: string,
		endDate: string,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			const data = report.summary;
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.width;
			const pageHeight = pdf.internal.pageSize.height;

			const label = claimPeriodLabel(startDate, endDate);
			const dayMonth = (iso: string) => {
				const d = new Date(`${iso}T00:00:00`);
				return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
			};

			const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
			const totalClaimable = data.reduce((sum, vehicle) => sum + vehicle.claimableFuel, 0);
			const totalNonClaimable = totalFuel - totalClaimable;
			const claimShare = totalFuel > 0 ? totalClaimable / totalFuel : 0;

			// One locale for the whole document (en-ZA: space thousands, comma
			// decimals) — the reconciliation panels already use it, and a claim
			// document that formats the same litres two ways reads as sloppy.
			const n2 = (value: number) =>
				value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			const n1max = (value: number) => value.toLocaleString('en-ZA', { maximumFractionDigits: 1 });

			const marginX = 16;
			const contentW = pageWidth - marginX * 2;

			// ---- Header ----
			pdf.setFontSize(20);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text(label.title, marginX, 19);

			pdf.setFontSize(8.5);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(
				`${label.isFullMonth ? 'Monthly fuel and diesel claim report' : 'Fuel and diesel claim report'} · ${label.subtitle}`,
				marginX,
				26
			);
			pdf.text(companyName, pageWidth - marginX, 26, { align: 'right' });
			pdf.setTextColor(0, 0, 0);

			pdf.setDrawColor(...PDF_HAIRLINE);
			pdf.setLineWidth(0.2);
			pdf.line(marginX, 31, pageWidth - marginX, 31);

			// ---- KPI band: the three numbers the reader came for ----
			const kpis: Array<{ label: string; value: string; color: [number, number, number] }> = [
				{ label: 'TOTAL FUEL', value: `${n2(totalFuel)} L`, color: [0, 0, 0] },
				{ label: 'CLAIMABLE', value: `${n2(totalClaimable)} L`, color: PDF_CLAIM_GREEN },
				{ label: 'NON-CLAIMABLE', value: `${n2(totalNonClaimable)} L`, color: PDF_NONCLAIM_RED }
			];
			const kpiW = contentW / 3;
			kpis.forEach((kpi, i) => {
				const x = marginX + i * kpiW;
				pdf.setFontSize(6.5);
				pdf.setFont('helvetica', 'normal');
				pdf.setTextColor(...PDF_GREY);
				pdf.text(kpi.label, x, 37.5, { charSpace: 0.5 });
				pdf.setFontSize(15);
				pdf.setFont('helvetica', 'bold');
				pdf.setTextColor(...kpi.color);
				pdf.text(kpi.value, x, 44);
			});
			pdf.setTextColor(0, 0, 0);

			// Claim share bar — the at-a-glance proportion
			const barY = 47.5;
			const barH = 2.2;
			pdf.setFillColor(236, 223, 223);
			pdf.rect(marginX, barY, contentW, barH, 'F');
			pdf.setFillColor(...PDF_CLAIM_GREEN);
			pdf.rect(marginX, barY, contentW * claimShare, barH, 'F');
			pdf.setDrawColor(...PDF_HAIRLINE);
			pdf.setLineWidth(0.15);
			pdf.rect(marginX, barY, contentW, barH);
			pdf.setFontSize(6.5);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(
				`${(claimShare * 100).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}% of total fuel is claimable`,
				pageWidth - marginX,
				barY + barH + 3.4,
				{ align: 'right' }
			);
			pdf.setTextColor(0, 0, 0);

			// ---- Vehicle ledger ----
			// Usage and efficiency carry their unit in the cell, so the reader
			// never has to cross-reference a Unit column six columns away.
			const usageCell = (vehicle: MonthlySummaryData) =>
				vehicle.distance === '' || vehicle.distance === null
					? '—'
					: `${n1max(Number(vehicle.distance))} ${vehicle.unit || ''}`.trim();
			const efficiencyCell = (vehicle: MonthlySummaryData) =>
				vehicle.consumption === '' || vehicle.consumption === null
					? '—'
					: `${Number(vehicle.consumption).toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${
							vehicle.unit === 'km' ? 'L/100km' : 'L/hr'
						}`;

			const consumptionTable = data.map((vehicle) => [
				vehicle.code,
				vehicle.name,
				vehicle.registration || '—',
				vehicle.category,
				usageCell(vehicle),
				n2(vehicle.fuel),
				vehicle.claimableFuel === 0 ? '—' : n2(vehicle.claimableFuel),
				vehicle.nonClaimableFuel === 0 ? '—' : n2(vehicle.nonClaimableFuel),
				efficiencyCell(vehicle)
			]);
			consumptionTable.push([
				'',
				'TOTAL',
				'',
				'',
				'',
				n2(totalFuel),
				n2(totalClaimable),
				n2(totalNonClaimable),
				''
			]);

			autoTable(pdf, {
				startY: 55,
				head: [
					[
						'Vehicle',
						'Name',
						'Registration',
						'Category',
						'Usage',
						'Total (L)',
						'Claimable',
						'Non-claim.',
						'Efficiency'
					]
				],
				body: consumptionTable,
				theme: 'grid',
				styles: {
					fontSize: data.length > 25 ? 6 : 7,
					cellPadding: data.length > 25 ? 0.55 : 0.9,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1,
					font: 'helvetica',
					textColor: [0, 0, 0],
					minCellHeight: 3,
					overflow: 'linebreak',
					valign: 'middle'
				},
				headStyles: {
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1,
					fontSize: 6.5
				},
				columnStyles: {
					0: { halign: 'center', cellWidth: 12 },
					1: { halign: 'left', cellWidth: 30, overflow: 'linebreak' },
					2: { halign: 'center', cellWidth: 20 },
					3: { halign: 'left', cellWidth: 22, overflow: 'linebreak' },
					4: { halign: 'right', cellWidth: 20 },
					5: { halign: 'right', cellWidth: 18 },
					6: { halign: 'right', cellWidth: 18 },
					7: { halign: 'right', cellWidth: 18 },
					8: { halign: 'right', cellWidth: 20 }
				},
				didParseCell: function (cell: any) {
					const isTotalRow = cell.section === 'body' && cell.row.index === consumptionTable.length - 1;
					if ([5, 6, 7].includes(cell.column.index)) {
						cell.cell.styles.fillColor =
							cell.section === 'head' ? [238, 238, 235] : [247, 247, 245];
					}
					// Colour only carries meaning where litres exist: zeros are
					// muted dashes so red/green never shouts about nothing.
					const muted = cell.cell.text?.[0] === '—';
					if (cell.column.index === 6) {
						cell.cell.styles.textColor = muted ? PDF_GREY : PDF_CLAIM_GREEN;
						if (cell.section === 'body' && !muted) cell.cell.styles.fontStyle = 'bold';
					}
					if (cell.column.index === 7) {
						cell.cell.styles.textColor = muted ? PDF_GREY : PDF_NONCLAIM_RED;
					}
					if (isTotalRow) {
						cell.cell.styles.fontStyle = 'bold';
					}
				},
				didDrawCell: function (cell: any) {
					// Heavier rule above the TOTAL row — the ledger "double line".
					if (cell.section === 'body' && cell.row.index === consumptionTable.length - 1) {
						pdf.setDrawColor(120, 113, 108);
						pdf.setLineWidth(0.35);
						pdf.line(cell.cell.x, cell.cell.y, cell.cell.x + cell.cell.width, cell.cell.y);
					}
				},
				margin: { left: marginX, right: marginX }
			});
			const tableEndY = (pdf as any).lastAutoTable.finalY || 80;

			// ---- Claim basis notes (classifier adjustments, unreviewed activities) ----
			let cursorY = tableEndY + 6;
			if (report.warnings.length > 0) {
				pdf.setFontSize(7.5);
				pdf.setFont('helvetica', 'bold');
				pdf.setTextColor(0, 0, 0);
				pdf.text('Claim basis notes', marginX, cursorY);
				cursorY += 4;
				pdf.setFontSize(6.8);
				pdf.setFont('helvetica', 'normal');
				pdf.setTextColor(...PDF_AMBER);
				for (const warning of report.warnings) {
					const lines = pdf.splitTextToSize(`•  ${warning}`, contentW - 2);
					pdf.text(lines, marginX + 1, cursorY);
					cursorY += lines.length * 3.2 + 1;
				}
				pdf.setTextColor(0, 0, 0);
				cursorY += 2;
			}

			// ---- Monthly reconciliation ----
			const bowserDifference = reconciliationData.bowserEnd - reconciliationData.bowserStart;
			const fuelVariance = bowserDifference - reconciliationData.fuelDispensed;
			const totalTankAdditions = reconciliationData.tankActivities.reduce(
				(sum: number, activity: { litres_added?: number }) => sum + (activity.litres_added || 0),
				0
			);
			const expectedLevel =
				reconciliationData.tankStartCalculated -
				reconciliationData.fuelDispensed +
				totalTankAdditions;
			const hasDip = (reconciliationData.lastDipReading || 0) > 0;
			const tankVariance = expectedLevel - reconciliationData.lastDipReading;
			const tankOpenLabel = dayMonth(reconciliationData.tankStartDate || isoDayBefore(startDate));
			const dipLabel = reconciliationData.lastDipDate
				? `Actual dip (${dayMonth(reconciliationData.lastDipDate)})`
				: 'Actual dip';
			const formatLitresValue = (value: number) =>
				`${value.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
			const formatSignedLitres = (value: number) =>
				`${value > 0 ? '+' : ''}${value.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
			// A variance is only alarming relative to the volume it sits on:
			// 3 L on a 9 000 L month is meter noise, not a red flag.
			const variancePct = (variance: number, base: number) =>
				base > 0 ? Math.abs(100 * variance / base) : 0;
			const formatVariance = (variance: number, base: number) =>
				`${formatSignedLitres(variance)}  (${variancePct(variance, base).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}%)`;
			const varianceColor = (variance: number, base: number): [number, number, number] =>
				variancePct(variance, base) > 0.5 ? PDF_NONCLAIM_RED : PDF_GREY;

			type ReconciliationRow = {
				label: string;
				value: string;
				color?: [number, number, number];
				bold?: boolean;
			};

			const deliveryRows = reconciliationData.tankActivities.length;
			const reconciliationHeight = 53 + (deliveryRows > 0 ? 10 + deliveryRows * 4 : 0);
			let reconciliationY = cursorY + 5;
			if (reconciliationY + reconciliationHeight > pageHeight - 20) {
				pdf.addPage();
				reconciliationY = 18;
			}

			pdf.setFontSize(9.5);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text('Monthly reconciliation', marginX, reconciliationY);
			pdf.setFontSize(6.5);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text('Meter continuity and storage balance', pageWidth - marginX, reconciliationY, {
				align: 'right'
			});

			const panelGap = 6;
			const panelWidth = (pageWidth - marginX * 2 - panelGap) / 2;
			const tankPanelX = marginX + panelWidth + panelGap;
			const panelTop = reconciliationY + 4;
			const panelHeight = 41;
			const drawPanel = (
				x: number,
				y: number,
				width: number,
				title: string,
				rows: ReconciliationRow[]
			) => {
				pdf.setFillColor(250, 250, 249);
				pdf.setDrawColor(...PDF_HAIRLINE);
				pdf.setLineWidth(0.15);
				pdf.roundedRect(x, y, width, panelHeight, 1.5, 1.5, 'FD');
				pdf.setFontSize(8.5);
				pdf.setFont('helvetica', 'bold');
				pdf.setTextColor(0, 0, 0);
				pdf.text(title, x + 3, y + 6);

				rows.forEach((row, index) => {
					const rowY = y + 12 + index * 4.5;
					pdf.setFontSize(7.2);
					pdf.setFont('helvetica', 'normal');
					pdf.setTextColor(...PDF_GREY);
					pdf.text(row.label, x + 3, rowY);
					pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
					pdf.setTextColor(...(row.color || ([45, 45, 45] as [number, number, number])));
					pdf.text(row.value, x + width - 3, rowY, { align: 'right' });
				});
			};

			drawPanel(marginX, panelTop, panelWidth, 'Bowser readings', [
				{
					label: `Opening meter (${dayMonth(startDate)})`,
					value: formatLitresValue(reconciliationData.bowserStart)
				},
				{
					label: `Closing meter (${dayMonth(endDate)})`,
					value: formatLitresValue(reconciliationData.bowserEnd)
				},
				{ label: 'Meter movement', value: formatLitresValue(bowserDifference), bold: true },
				{
					label: 'Recorded dispensed',
					value: formatLitresValue(reconciliationData.fuelDispensed),
					color: PDF_RED
				},
				{
					label: 'Difference',
					value: formatVariance(fuelVariance, reconciliationData.fuelDispensed),
					color: varianceColor(fuelVariance, reconciliationData.fuelDispensed),
					bold: true
				}
			]);

			drawPanel(tankPanelX, panelTop, panelWidth, 'Tank balance', [
				{
					label: `Opening balance (${tankOpenLabel})`,
					value: formatLitresValue(reconciliationData.tankStartCalculated)
				},
				{
					label: 'Deliveries / adjustments',
					value: formatSignedLitres(totalTankAdditions),
					color: totalTankAdditions >= 0 ? PDF_GREEN : PDF_RED
				},
				{
					label: 'Fuel dispensed',
					value: `-${formatLitresValue(reconciliationData.fuelDispensed)}`,
					color: PDF_RED
				},
				{ label: 'Expected closing', value: formatLitresValue(expectedLevel), bold: true },
				{
					label: dipLabel,
					value: hasDip ? formatLitresValue(reconciliationData.lastDipReading) : 'Not recorded',
					color: hasDip ? undefined : PDF_NONCLAIM_RED
				},
				{
					label: 'Variance',
					value: hasDip ? formatVariance(tankVariance, expectedLevel) : '—',
					color: hasDip ? varianceColor(tankVariance, expectedLevel) : PDF_GREY,
					bold: true
				}
			]);

			// ---- Deliveries and adjustments: full width, invoice references ----
			if (deliveryRows > 0) {
				const deliveriesY = panelTop + panelHeight + 8;
				pdf.setFontSize(7.5);
				pdf.setFont('helvetica', 'bold');
				pdf.setTextColor(0, 0, 0);
				pdf.text('Deliveries and adjustments', marginX, deliveriesY);

				reconciliationData.tankActivities.forEach(
					(
						activity: { delivery_date: string; litres_added?: number; invoice_number?: string },
						index: number
					) => {
						const amount = activity.litres_added || 0;
						const activityDate = new Date(activity.delivery_date).toLocaleDateString('en-ZA', {
							day: 'numeric',
							month: 'short'
						});
						const y = deliveriesY + 5 + index * 4;
						const reference = cleanDocText(activity.invoice_number || 'Adjustment');
						pdf.setFontSize(6.8);
						pdf.setFont('helvetica', 'normal');
						pdf.setTextColor(...PDF_GREY);
						pdf.text(activityDate, marginX + 1, y);
						pdf.setFont('helvetica', 'bold');
						pdf.setTextColor(...(amount >= 0 ? PDF_GREEN : PDF_RED));
						pdf.text(formatSignedLitres(amount), marginX + 34, y, { align: 'right' });
						pdf.setFont('helvetica', 'normal');
						pdf.setTextColor(60, 60, 60);
						pdf.text(reference, marginX + 40, y);
					}
				);
			}

			// ---- Footer band on every page ----
			const generatedAt = new Date().toLocaleString('en-ZA', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
			const pageCount = pdf.getNumberOfPages();
			for (let i = 1; i <= pageCount; i++) {
				pdf.setPage(i);
				pdf.setDrawColor(...PDF_HAIRLINE);
				pdf.setLineWidth(0.2);
				pdf.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
				pdf.setFontSize(6.8);
				pdf.setFont('helvetica', 'normal');
				pdf.setTextColor(...PDF_GREY);
				pdf.text(`${companyName} — diesel claim working paper · ${label.title}`, marginX, pageHeight - 9);
				pdf.text(`Generated ${generatedAt} · Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 9, {
					align: 'right'
				});
			}

			// Save the PDF
			const fileName = `Fuel_Claim_Report_${label.fileSlug}.pdf`;
			pdf.save(fileName);
		} catch (error) {
			console.error('PDF generation error:', error);
			throw new Error('Failed to generate PDF report');
		}
	}

}

export default new ExportService();
