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
import {
	calculateClassifierVariance,
	calculateDieselClaim,
	roundClaimLitres
} from '$lib/utils/diesel-claim';

// ---------------------------------------------------------------------------
// Ledger-style export palette
// Strictly black/white/grey with exactly two semantic exceptions:
//   RED   = fuel/tank removals (litres dispensed / fuel out / negative adjustments)
//   GREEN = fuel in (deliveries / refills / positive adjustments)
// ---------------------------------------------------------------------------
const XL_RED = 'B91C1C';
const XL_HEADER_FILL = 'F5F5F4';
const XL_HAIRLINE = 'D6D3D1';

const PDF_RED: [number, number, number] = [185, 28, 28];
const PDF_GREEN: [number, number, number] = [21, 128, 61];
const PDF_GREY: [number, number, number] = [120, 113, 108];
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

interface LedgerColumnStyle {
	numFmt?: string;
	halign?: 'left' | 'right' | 'center';
	fontColor?: string;
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

			if (opts.titleRows.includes(r)) {
				// Title row: larger bold black, no fill
				cell.s = {
					font: { bold: true, sz: 14, color: { rgb: '000000' } },
					alignment: { horizontal: 'left', vertical: 'center' }
				};
			} else if (opts.headerRows.includes(r)) {
				// Headers: bold black on very light grey, thin bottom border
				cell.s = {
					font: { bold: true, sz: 10, color: { rgb: '000000' } },
					fill: { patternType: 'solid', fgColor: { rgb: XL_HEADER_FILL } },
					border: {
						...xlHairlineBorder,
						bottom: { style: 'thin', color: { rgb: 'A8A29E' } }
					},
					alignment: { horizontal: 'center', vertical: 'center' }
				};
			} else if (r >= opts.dataStartRow) {
				// Body: black text, hairline grey borders
				const colStyle = columnStyles[c] || {};
				const style: any = {
					font: { sz: 10, color: { rgb: colStyle.fontColor || '000000' } },
					border: xlHairlineBorder,
					alignment: { horizontal: colStyle.halign || 'left', vertical: 'center' }
				};
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
	vehicleId: string;
	code: string;
	name: string;
	registration: string;
	category: string;
	distance: number | string;
	fuel: number;
	baseEligibleFuel: number;
	claimableFuel: number;
	nonClaimableFuel: number;
	claimablePercentage: number | null;
	claimBasis: string;
	missingAdjustment: boolean;
	consumption: number | string;
	unit: string;
}

export interface MonthlyClaimDetailData {
	vehicleCode: string;
	vehicleName: string;
	activityName: string;
	activityEligible: boolean;
	totalFuel: number;
	claimablePercentage: number | null;
	claimableFuel: number;
	nonClaimableFuel: number;
	claimBasis: string;
}

export interface MonthlyClaimExportData {
	summary: MonthlySummaryData[];
	details: MonthlyClaimDetailData[];
	adjustments: VehicleMonthlyClaimAdjustment[];
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

	// Fetch monthly vehicle summary data
	async getMonthlySummaryForExport(
		year: number,
		month: number,
		supabaseService: MonthlyClaimDataService
	): Promise<ApiResponse<MonthlyClaimExportData>> {
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();

			// Get start and end dates for the month (using UTC to avoid timezone issues)
			const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
			const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

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
				supabaseService.getVehicleMonthlyClaimAdjustments(startDate, startDate)
			]);

			if (result.error) return { data: null, error: result.error.message };
			if (adjustmentsResult.error) return { data: null, error: adjustmentsResult.error };
			const adjustments = adjustmentsResult.data || [];
			const adjustmentByVehicle = new Map(adjustments.map((item) => [item.vehicle_id, item]));

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

			const details: MonthlyClaimDetailData[] = [];
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

					const adjustment = adjustmentByVehicle.get(summary.vehicleId);
					const claim = calculateDieselClaim({
						totalLitres: summary.totalFuel,
						baseEligibleLitres: summary.baseEligibleFuel,
						method: summary.claimMethod,
						adjustment
					});
					if (claim.missingAdjustment)
						warnings.push(
							`${summary.code}: monthly classifier result missing; all litres excluded.`
						);
					for (const activity of summary.activities.values()) {
						const activityClaim = calculateDieselClaim({
							totalLitres: activity.litres,
							baseEligibleLitres: activity.eligible ? activity.litres : 0,
							method: summary.claimMethod,
							adjustment
						});
						if (!activity.reviewed)
							warnings.push(`${activity.name}: activity eligibility has not been reviewed.`);
						const detailTotal = roundClaimLitres(activityClaim.totalLitres);
						const detailClaimable = roundClaimLitres(activityClaim.claimableLitres);
						details.push({
							vehicleCode: summary.code,
							vehicleName: summary.name,
							activityName: activity.name,
							activityEligible: activity.eligible,
							totalFuel: detailTotal,
							claimablePercentage: activityClaim.claimablePercentage,
							claimableFuel: detailClaimable,
							nonClaimableFuel: roundClaimLitres(detailTotal - detailClaimable),
							claimBasis: activity.eligible
								? activityClaim.claimBasis
								: 'Activity marked non-claimable'
						});
					}

					const roundedTotal = roundClaimLitres(claim.totalLitres);
					const roundedClaimable = roundClaimLitres(claim.claimableLitres);
					return {
						vehicleId: summary.vehicleId,
						code: summary.code,
						name: summary.name,
						registration: summary.registration,
						// Vehicle types in the DB carry emoji (e.g. "6 - Vehicle 🛻")
						// which jsPDF's Helvetica cannot render — glyph widths go
						// wrong and the text prints stretched/truncated. Strip to
						// printable ASCII for documents.
						category: cleanDocText(summary.type),
						distance: distance,
						fuel: roundedTotal,
						baseEligibleFuel: roundClaimLitres(claim.baseEligibleLitres),
						claimableFuel: roundedClaimable,
						nonClaimableFuel: roundClaimLitres(roundedTotal - roundedClaimable),
						claimablePercentage: claim.claimablePercentage,
						claimBasis: claim.claimBasis,
						missingAdjustment: claim.missingAdjustment,
						consumption: consumption,
						unit: unit
					};
				})
				.sort((a, b) => a.code.localeCompare(b.code)); // Sort by vehicle code

			return {
				data: {
					summary: summaryData,
					details: details.sort(
						(a, b) =>
							a.vehicleCode.localeCompare(b.vehicleCode) ||
							a.activityName.localeCompare(b.activityName)
					),
					adjustments,
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

	// Generate monthly summary Excel file
	async generateMonthlySummaryExcel(
		report: MonthlyClaimExportData,
		year: number,
		month: number,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			const data = report.summary;
			const workbook = XLSX.utils.book_new();

			// Format month name
			const monthNames = [
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
			const monthName = monthNames[month - 1];

			// Create header data
			const headerData = [
				[`Monthly Fuel and Diesel Claim Summary - ${companyName} - ${monthName} ${year}`],
				[],
				[
					'Code',
					'Name',
					'Category',
					'Distance',
					'Total Fuel',
					'Claimable',
					'Non-claimable',
					'Consumption',
					'Unit',
					'Claim Basis'
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
				row.unit,
				row.claimBasis
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
				{ wch: 8 },
				{ wch: 38 }
			];

			// Merge cells for main header
			worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

			// Clean-ledger styling: monochrome, hairline borders,
			// red for fuel consumed (fuel out of the tank)
			applyLedgerStyles(worksheet, {
				titleRows: [0],
				headerRows: [2],
				dataStartRow: 3,
				rowCount: worksheetData.length,
				colCount: 10,
				columnStyles: {
					3: { numFmt: '#,##0.00', halign: 'right' },
					4: { numFmt: '#,##0.00', halign: 'right', fontColor: XL_RED },
					5: { numFmt: '#,##0.00', halign: 'right' },
					6: { numFmt: '#,##0.00', halign: 'right' },
					7: { numFmt: '#,##0.00', halign: 'right' },
					8: { halign: 'center' }
				}
			});

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');

			const detailRows: Array<Array<string | number>> = [
				['Diesel Claim Detail'],
				['Period', `${monthName} ${year}`],
				...report.warnings.map((warning) => ['Warning', warning]),
				[]
			];
			for (const adjustment of report.adjustments) {
				const vehicle = data.find((row) => row.vehicleId === adjustment.vehicle_id);
				const variance = calculateClassifierVariance(
					vehicle?.fuel || 0,
					adjustment.classifier_measured_litres
				);
				detailRows.push(
					[
						'Classifier vehicle',
						vehicle ? `${vehicle.code} - ${vehicle.name}` : adjustment.vehicle_id
					],
					['Classifier measured litres', adjustment.classifier_measured_litres],
					['Classifier claimable litres', adjustment.classifier_claimable_litres],
					['Classifier percentage', adjustment.claimable_percentage / 100],
					['Fuel Manager variance litres', roundClaimLitres(variance.litres)],
					['Fuel Manager variance percentage', variance.percentage / 100],
					['Source reference', adjustment.source_reference || ''],
					['Notes', adjustment.notes || ''],
					[]
				);
			}
			const detailHeaderRow = detailRows.length;
			detailRows.push(
				[
					'Vehicle',
					'Vehicle Name',
					'Activity',
					'Activity Eligible',
					'Total Fuel',
					'Classifier %',
					'Claimable',
					'Non-claimable',
					'Claim Basis'
				],
				...report.details.map((row) => [
					row.vehicleCode,
					row.vehicleName,
					row.activityName,
					row.activityEligible ? 'Yes' : 'No',
					row.totalFuel,
					row.claimablePercentage === null ? '' : row.claimablePercentage / 100,
					row.claimableFuel,
					row.nonClaimableFuel,
					row.claimBasis
				])
			);
			const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
			detailSheet['!cols'] = [
				{ wch: 10 },
				{ wch: 24 },
				{ wch: 28 },
				{ wch: 17 },
				{ wch: 12 },
				{ wch: 13 },
				{ wch: 12 },
				{ wch: 14 },
				{ wch: 38 }
			];
			applyLedgerStyles(detailSheet, {
				titleRows: [0],
				headerRows: [detailHeaderRow],
				dataStartRow: detailHeaderRow + 1,
				rowCount: detailRows.length,
				colCount: 9,
				columnStyles: {
					4: { numFmt: '#,##0.00', halign: 'right' },
					5: { numFmt: '0.00%', halign: 'right' },
					6: { numFmt: '#,##0.00', halign: 'right' },
					7: { numFmt: '#,##0.00', halign: 'right' }
				}
			});
			for (let row = 0; row < detailHeaderRow; row++) {
				const label = (detailSheet as any)[XLSX.utils.encode_cell({ r: row, c: 0 })];
				const value = (detailSheet as any)[XLSX.utils.encode_cell({ r: row, c: 1 })];
				if (
					label?.v === 'Classifier percentage' ||
					label?.v === 'Fuel Manager variance percentage'
				) {
					if (value) value.z = '0.00%';
				}
			}
			XLSX.utils.book_append_sheet(workbook, detailSheet, 'Claim Detail');

			// Generate filename
			const filename = `Monthly_Vehicle_Summary_${year}_${month.toString().padStart(2, '0')}.xlsx`;

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

	// Generate monthly summary PDF file
	async generateMonthlySummaryPDF(
		report: MonthlyClaimExportData,
		year: number,
		month: number,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			const data = report.summary;
			// Create new PDF document
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.width;
			const pageHeight = pdf.internal.pageSize.height;

			// Format month name
			const monthNames = [
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
			const monthName = monthNames[month - 1];

			// Calculate total fuel consumption
			const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
			const totalClaimable = data.reduce((sum, vehicle) => sum + vehicle.claimableFuel, 0);

			// Minimal journal-style header: bold black title, small grey subtitle, hairline rule
			const marginX = 20;
			pdf.setFontSize(16);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text('Monthly Fuel and Diesel Claim Report', marginX, 24);

			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(companyName, marginX, 31);
			pdf.text(`${monthName} ${year}`, marginX, 36.5);

			pdf.setDrawColor(...PDF_HAIRLINE);
			pdf.setLineWidth(0.2);
			pdf.line(marginX, 41, pageWidth - marginX, 41);

			// Summary statistics at the top
			pdf.setFontSize(9);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text('Summary Statistics', marginX, 49);

			pdf.setFont('helvetica', 'normal');
			pdf.text(`Total Active Vehicles: ${data.length}`, marginX, 55);
			pdf.text(`Total Fuel Consumption: ${totalFuel.toFixed(2)} Litres`, marginX, 60);
			pdf.text(
				`Claimable: ${totalClaimable.toFixed(2)} L | Non-claimable: ${(totalFuel - totalClaimable).toFixed(2)} L`,
				marginX,
				65
			);

			// Table with separate name and registration columns
			const tableStartY = 73;
			const tableData = data.map((vehicle) => [
				vehicle.code,
				vehicle.name,
				vehicle.fuel.toFixed(2),
				vehicle.claimableFuel.toFixed(2),
				vehicle.nonClaimableFuel.toFixed(2),
				vehicle.claimBasis
			]);

			tableData.push([
				'',
				'TOTAL',
				`${totalFuel.toFixed(2)}`,
				`${totalClaimable.toFixed(2)}`,
				`${(totalFuel - totalClaimable).toFixed(2)}`,
				''
			]);

			// Minimal ledger table: white header, grey hairline grid, tabular right-aligned numerals
			autoTable(pdf, {
				startY: tableStartY,
				head: [
					['Vehicle', 'Name', 'Total (L)', 'Claimable (L)', 'Non-claimable (L)', 'Claim Basis']
				],
				body: tableData,
				theme: 'grid',
				styles: {
					fontSize: 9,
					cellPadding: 1.5,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1,
					font: 'helvetica',
					textColor: [0, 0, 0],
					minCellHeight: 3
				},
				headStyles: {
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					fontSize: 9,
					halign: 'center',
					minCellHeight: 4,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1
				},
				columnStyles: {
					0: { halign: 'center' },
					1: { halign: 'left' },
					2: { halign: 'right' },
					3: { halign: 'right' },
					4: { halign: 'right' },
					5: { halign: 'left', cellWidth: 42 }
				},
				didParseCell: function (data: any) {
					if (data.section !== 'body') return;
					// Style the subtotal row (last row): bold, no fill.
					// The Fuel column stays black — red is reserved for tank
					// MOVEMENTS in the reconciliation, so it keeps its meaning.
					if (data.row.index === tableData.length - 1) {
						data.cell.styles.fontStyle = 'bold';
					}
				},
				// Let autoTable calculate column widths automatically for full page width
				margin: { left: marginX, right: marginX },
				didDrawPage: (data: any) => {
					// Footer
					pdf.setFontSize(8);
					pdf.setFont('helvetica', 'normal');
					pdf.setTextColor(...PDF_GREY);
					const printDate = new Date().toLocaleDateString('en-ZA', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit'
					});
					pdf.text(`Generated: ${printDate}`, marginX, pageHeight - 10);
					pdf.setTextColor(0, 0, 0);
				}
			});

			// Efficiency calculation footnote
			const finalY = (pdf as any).lastAutoTable.finalY + 8;

			pdf.setFontSize(8);
			pdf.setFont('helvetica', 'italic');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(
				'* Claimable plus non-claimable litres reconcile to total fuel recorded.',
				marginX,
				finalY
			);
			pdf.setTextColor(0, 0, 0);

			// Generate filename and download
			const filename = `Fuel_Analysis_Report_${year}_${month.toString().padStart(2, '0')}.pdf`;
			pdf.save(filename);
		} catch (error) {
			console.error('Failed to generate monthly summary PDF file:', error);
			throw new Error('Failed to generate monthly summary PDF file');
		}
	}

	// Monthly summary export method
	async exportMonthlySummary(
		year: number,
		month: number,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch data
			const result = await this.getMonthlySummaryForExport(year, month, supabaseService);

			if (result.error || !result.data) {
				return { success: false, error: result.error || 'No data found' };
			}

			// Generate and download Excel file
			await this.generateMonthlySummaryExcel(result.data, year, month, companyName);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Monthly summary export failed'
			};
		}
	}

	// Monthly summary PDF export method
	async exportMonthlySummaryPDF(
		year: number,
		month: number,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch data
			const result = await this.getMonthlySummaryForExport(year, month, supabaseService);

			if (result.error || !result.data) {
				return { success: false, error: result.error || 'No data found' };
			}

			// Generate and download PDF file
			await this.generateMonthlySummaryPDF(result.data, year, month, companyName);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Monthly summary PDF export failed'
			};
		}
	}

	// Enhanced monthly summary PDF export with reconciliation data
	async exportMonthlySummaryPDFWithReconciliation(
		year: number,
		month: number,
		supabaseService: any,
		companyName?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fetch vehicle data
			const vehicleResult = await this.getMonthlySummaryForExport(year, month, supabaseService);

			if (vehicleResult.error || !vehicleResult.data) {
				return { success: false, error: vehicleResult.error || 'No vehicle data found' };
			}

			// Format month name
			const monthNames = [
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
			const monthName = monthNames[month - 1];

			// Fetch reconciliation data for the month
			const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
			const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

			// Calculate previous month's last day for opening level
			const prevMonth = month === 1 ? 12 : month - 1;
			const prevYear = month === 1 ? year - 1 : year;
			// Use month index (0-11) for Date constructor: prevMonth is month NUMBER (1-12), so use it directly as the NEXT month's index
			const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
			const prevMonthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDayOfPrevMonth).padStart(2, '0')}`;

			let reconciliationData = {
				fuelDispensed: 0,
				bowserStart: 0,
				bowserEnd: 0,
				tankStartCalculated: 0,
				tankEndCalculated: 0,
				lastDipReading: 0,
				tankActivities: [],
				reconciled: false
			};

			try {
				// Performance optimization: Execute all reconciliation queries in parallel
				const [
					fuelReconResult,
					tankStartReconResult,
					tankEndReconResult,
					dipReadingResult,
					tankActivitiesResult
				] = await Promise.all([
					// Fuel reconciliation data
					supabaseService.getDateRangeReconciliationData(monthStart, monthEnd),

					// Tank reconciliation data for opening level (previous month's closing)
					supabaseService.query(() =>
						supabaseService
							.ensureInitialized()
							.from('tank_reconciliations')
							.select('*')
							.eq('reconciliation_date', prevMonthEnd)
							.maybeSingle()
					),

					// Tank reconciliation data for month end (closing level)
					supabaseService.query(() =>
						supabaseService
							.ensureInitialized()
							.from('tank_reconciliations')
							.select('*')
							.eq('reconciliation_date', monthEnd)
							.maybeSingle()
					),

					// Actual dip reading from tank_readings table (last reading of the month)
					supabaseService.query(() =>
						supabaseService
							.ensureInitialized()
							.from('tank_readings')
							.select('*')
							.gte('reading_date', monthStart)
							.lte('reading_date', monthEnd)
							.order('reading_date', { ascending: false })
							.limit(1)
							.maybeSingle()
					),

					// Tank activities (refills and adjustments) for the month
					supabaseService.query(() =>
						supabaseService
							.ensureInitialized()
							.from('tank_refills')
							.select('delivery_date, litres_added, invoice_number')
							.gte('delivery_date', monthStart)
							.lte('delivery_date', monthEnd)
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
				}

				if (tankEndReconResult.data) {
					reconciliationData.tankEndCalculated = tankEndReconResult.data.calculated_level || 0;
				}

				if (dipReadingResult.data) {
					reconciliationData.lastDipReading = dipReadingResult.data.reading_value || 0;
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
				year,
				month,
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
		year: number,
		month: number,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			const data = report.summary;
			// Create new PDF document
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.width;
			const pageHeight = pdf.internal.pageSize.height;

			// Format month name
			const monthNames = [
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
			const monthName = monthNames[month - 1];

			// Calculate previous month's last day for opening level
			const prevMonth = month === 1 ? 12 : month - 1;
			const prevYear = month === 1 ? year - 1 : year;
			const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

			// Calculate total fuel consumption
			const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
			const totalClaimable = data.reduce((sum, vehicle) => sum + vehicle.claimableFuel, 0);

			// Minimal journal-style header: bold black title, small grey subtitle, hairline rule
			const marginX = 20;
			pdf.setFontSize(16);
			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text('Monthly Fuel and Diesel Claim Report', marginX, 18);

			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(companyName, marginX, 25);
			pdf.text(`${monthName} ${year}`, marginX, 30.5);
			pdf.setTextColor(0, 0, 0);

			pdf.setDrawColor(...PDF_HAIRLINE);
			pdf.setLineWidth(0.2);
			pdf.line(marginX, 35, pageWidth - marginX, 35);

			// Calculate variables needed for the new reconciliation sections below
			const bowserDifference = reconciliationData.bowserEnd - reconciliationData.bowserStart;
			const fuelVariance = bowserDifference - reconciliationData.fuelDispensed;
			const labelX = marginX;
			const valueX = 80;
			const detailsX = 135;

			pdf.setFontSize(9);
			pdf.setFont('helvetica', 'normal');
			pdf.text(`Total fuel: ${totalFuel.toFixed(2)} L`, marginX, 42);
			pdf.text(`Claimable: ${totalClaimable.toFixed(2)} L`, 82, 42);
			pdf.text(`Non-claimable: ${(totalFuel - totalClaimable).toFixed(2)} L`, 138, 42);

			const claimTableData = data.map((vehicle) => [
				vehicle.code,
				vehicle.name,
				vehicle.fuel.toFixed(2),
				vehicle.claimableFuel.toFixed(2),
				vehicle.nonClaimableFuel.toFixed(2),
				vehicle.claimBasis
			]);
			claimTableData.push([
				'',
				'TOTAL',
				totalFuel.toFixed(2),
				totalClaimable.toFixed(2),
				(totalFuel - totalClaimable).toFixed(2),
				''
			]);
			autoTable(pdf, {
				startY: 48,
				head: [
					['Vehicle', 'Name', 'Total (L)', 'Claimable (L)', 'Non-claimable (L)', 'Claim Basis']
				],
				body: claimTableData,
				theme: 'grid',
				styles: {
					fontSize: 8,
					cellPadding: 1.5,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1,
					font: 'helvetica',
					textColor: [0, 0, 0],
					minCellHeight: 3
				},
				headStyles: {
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					fontSize: 9,
					halign: 'center',
					minCellHeight: 4,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1
				},
				columnStyles: {
					0: { halign: 'center', cellWidth: 15 },
					1: { halign: 'left', cellWidth: 36 },
					2: { halign: 'right', cellWidth: 20 },
					3: { halign: 'right', cellWidth: 23 },
					4: { halign: 'right', cellWidth: 27 },
					5: { halign: 'left' }
				},
				didParseCell: function (data: any) {
					if (data.section === 'body' && data.row.index === claimTableData.length - 1) {
						data.cell.styles.fontStyle = 'bold';
					}
				},
				margin: { left: marginX, right: marginX }
			});

			let claimNoteY = ((pdf as any).lastAutoTable.finalY || 90) + 7;
			for (const adjustment of report.adjustments) {
				const vehicle = data.find((row) => row.vehicleId === adjustment.vehicle_id);
				const variance = calculateClassifierVariance(
					vehicle?.fuel || 0,
					adjustment.classifier_measured_litres
				);
				if (claimNoteY > pageHeight - 35) {
					pdf.addPage();
					claimNoteY = 20;
				}
				pdf.setFontSize(9);
				pdf.setFont('helvetica', 'bold');
				pdf.text(`${vehicle?.code || 'Classifier vehicle'} calculation`, marginX, claimNoteY);
				claimNoteY += 5;
				pdf.setFont('helvetica', 'normal');
				pdf.text(
					`${adjustment.classifier_claimable_litres.toFixed(2)} L / ${adjustment.classifier_measured_litres.toFixed(2)} L = ${adjustment.claimable_percentage.toFixed(2)}%`,
					marginX,
					claimNoteY
				);
				claimNoteY += 4;
				pdf.setTextColor(
					...(variance.exceedsThreshold ? ([160, 94, 16] as [number, number, number]) : PDF_GREY)
				);
				pdf.text(
					`Fuel Manager vs telematics: ${variance.litres >= 0 ? '+' : ''}${variance.litres.toFixed(2)} L (${variance.percentage >= 0 ? '+' : ''}${variance.percentage.toFixed(1)}%)`,
					marginX,
					claimNoteY
				);
				pdf.setTextColor(0, 0, 0);
				claimNoteY += 4;
				if (adjustment.source_reference) {
					pdf.setTextColor(...PDF_GREY);
					pdf.text(`Source: ${cleanDocText(adjustment.source_reference)}`, marginX, claimNoteY);
					pdf.setTextColor(0, 0, 0);
					claimNoteY += 4;
				}
			}
			for (const warning of report.warnings) {
				if (claimNoteY > pageHeight - 25) {
					pdf.addPage();
					claimNoteY = 20;
				}
				pdf.setFontSize(8);
				pdf.setTextColor(160, 94, 16);
				const lines = pdf.splitTextToSize(
					`Warning: ${cleanDocText(warning)}`,
					pageWidth - marginX * 2
				);
				pdf.text(lines, marginX, claimNoteY);
				claimNoteY += lines.length * 3.5 + 1;
			}
			pdf.setTextColor(0, 0, 0);

			pdf.addPage();
			pdf.setFontSize(12);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Vehicle Consumption Detail', marginX, 20);
			const consumptionTable = data.map((vehicle) => [
				vehicle.code,
				vehicle.name,
				vehicle.registration || '—',
				vehicle.category,
				vehicle.distance === '' ? '—' : vehicle.distance.toString(),
				vehicle.fuel.toFixed(2),
				vehicle.consumption === '' ? '—' : vehicle.consumption.toString(),
				vehicle.unit || '—'
			]);
			autoTable(pdf, {
				startY: 26,
				head: [
					[
						'Vehicle',
						'Name',
						'Registration',
						'Classification',
						'Distance',
						'Fuel (L)',
						'Efficiency*',
						'Unit'
					]
				],
				body: consumptionTable,
				theme: 'grid',
				styles: {
					fontSize: 8,
					cellPadding: 1.4,
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1,
					textColor: [0, 0, 0]
				},
				headStyles: {
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					lineColor: PDF_HAIRLINE,
					lineWidth: 0.1
				},
				columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
				margin: { left: marginX, right: marginX }
			});
			const tableEndY = (pdf as any).lastAutoTable.finalY || 80;
			let reconciliationY = tableEndY + 15;

			// Page-break guard: the reconciliation block previously ran into the
			// fixed-position footer (or off the page) when the table was long.
			const ensureRoom = (needed = 8) => {
				if (reconciliationY + needed > pageHeight - 18) {
					pdf.addPage();
					reconciliationY = 20;
					pdf.setFontSize(9);
					pdf.setFont('helvetica', 'normal');
					pdf.setTextColor(0, 0, 0);
				}
			};

			// Add footnote about efficiency.
			pdf.setFontSize(8);
			pdf.setFont('helvetica', 'italic');
			pdf.setTextColor(...PDF_GREY);
			pdf.text('* Efficiency: l/100km or l/hr', marginX, tableEndY + 5);
			pdf.setTextColor(0, 0, 0);

			// RECONCILIATION SECTIONS MOVED HERE - after table
			ensureRoom(36);
			pdf.setFontSize(11);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Fuel Reconciliation', marginX, reconciliationY);

			reconciliationY += 6;
			pdf.setFontSize(9);
			pdf.setFont('helvetica', 'normal');

			pdf.text('Fuel Dispensed:', labelX, reconciliationY);
			pdf.setTextColor(...PDF_RED); // fuel out
			pdf.text(
				`${reconciliationData.fuelDispensed.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			const bowserOpeningDate = `1 ${monthName} ${year}`;
			const bowserClosingDate = `${new Date(year, month, 0).getDate()} ${monthName} ${year}`;

			pdf.text('Bowser Opening:', labelX, reconciliationY);
			pdf.text(
				`${reconciliationData.bowserStart.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setTextColor(...PDF_GREY);
			pdf.text(`(${bowserOpeningDate})`, detailsX, reconciliationY);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			pdf.text('Bowser Closing:', labelX, reconciliationY);
			pdf.text(
				`${reconciliationData.bowserEnd.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setTextColor(...PDF_GREY);
			pdf.text(`(${bowserClosingDate})`, detailsX, reconciliationY);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			pdf.text('Bowser Difference:', labelX, reconciliationY);
			pdf.text(
				`${bowserDifference.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			reconciliationY += 4;

			pdf.text('Fuel Variance:', labelX, reconciliationY);
			pdf.text(`${fuelVariance.toFixed(1)}L`, valueX, reconciliationY);

			reconciliationY += 10;

			// Tank Reconciliation Section
			ensureRoom(40);
			pdf.setFontSize(11);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Tank Reconciliation', marginX, reconciliationY);

			reconciliationY += 4;
			pdf.setFontSize(9);
			pdf.setFont('helvetica', 'normal');

			// Show opening balance as first day of current month (value comes from previous month's closing)
			const openingDate = `1 ${monthName} ${year}`;

			pdf.setFont('helvetica', 'bold');
			pdf.text('Opening Balance:', labelX, reconciliationY);
			pdf.text(
				`${reconciliationData.tankStartCalculated.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(`(${openingDate})`, detailsX, reconciliationY);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			// Tank Activities with improved formatting
			if (reconciliationData.tankActivities.length > 0) {
				let totalAdditions = 0;
				reconciliationData.tankActivities.forEach(
					(activity: { delivery_date: string; litres_added?: number; invoice_number?: string }) => {
						ensureRoom();
						const activityDate = new Date(activity.delivery_date).toLocaleDateString('en-ZA', {
							day: 'numeric',
							month: 'short'
						});
						const amount = activity.litres_added || 0;
						totalAdditions += amount;
						const sign = amount >= 0 ? '+' : '';
						const invoiceText = activity.invoice_number || 'Adjustment';

						pdf.text(`• ${activityDate}:`, labelX + 5, reconciliationY);
						// Deliveries/refills (fuel in) -> green; negative adjustments (fuel out) -> red
						if (amount >= 0) {
							pdf.setTextColor(...PDF_GREEN);
						} else {
							pdf.setTextColor(...PDF_RED);
						}
						pdf.text(
							`${sign}${amount.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
							valueX,
							reconciliationY
						);
						pdf.setTextColor(...PDF_GREY);
						pdf.text(`(${invoiceText})`, detailsX, reconciliationY);
						pdf.setTextColor(0, 0, 0);
						reconciliationY += 4;
					}
				);

				pdf.setFont('helvetica', 'bold');
				pdf.text('Total Additions:', labelX, reconciliationY);
				pdf.setTextColor(...PDF_GREEN); // fuel in
				pdf.text(
					`+${totalAdditions.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
					valueX,
					reconciliationY
				);
				pdf.setTextColor(0, 0, 0);
				pdf.setFont('helvetica', 'normal');
				reconciliationY += 4;
			}

			// Total Drawings (fuel dispensed)
			ensureRoom(28);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Total Drawings:', labelX, reconciliationY);
			pdf.setTextColor(...PDF_RED); // fuel out
			pdf.text(
				`-${reconciliationData.fuelDispensed.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setTextColor(0, 0, 0);
			pdf.setFont('helvetica', 'normal');
			reconciliationY += 4;

			// Expected vs Actual calculation
			const totalTankAdditions = reconciliationData.tankActivities.reduce(
				(sum: number, activity: { litres_added?: number }) => sum + (activity.litres_added || 0),
				0
			);
			const expectedLevel =
				reconciliationData.tankStartCalculated -
				reconciliationData.fuelDispensed +
				totalTankAdditions;

			const calculationFormula = `(${reconciliationData.tankStartCalculated.toLocaleString('en-ZA', { minimumFractionDigits: 1 })} - ${reconciliationData.fuelDispensed.toLocaleString('en-ZA', { minimumFractionDigits: 1 })} + ${totalTankAdditions.toLocaleString('en-ZA', { minimumFractionDigits: 1 })})`;
			pdf.setFont('helvetica', 'bold');
			pdf.text('Closing Balance:', labelX, reconciliationY);
			pdf.text(
				`${expectedLevel.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`,
				valueX,
				reconciliationY
			);
			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(calculationFormula, detailsX, reconciliationY);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			const lastDayOfMonth = new Date(year, month, 0).getDate();
			const actualReadingDate = `${lastDayOfMonth} ${monthName} ${year}`;
			// A zero dip reading almost always means "no dip taken for this
			// month" — printing 0,0L reads as an empty tank. Show a dash and
			// say so; the variance is then meaningless too.
			const hasDip = (reconciliationData.lastDipReading || 0) > 0;
			pdf.text('Actual Reading:', labelX, reconciliationY);
			pdf.text(
				hasDip
					? `${reconciliationData.lastDipReading.toLocaleString('en-ZA', { minimumFractionDigits: 1 })}L`
					: '—',
				valueX,
				reconciliationY
			);
			pdf.setTextColor(...PDF_GREY);
			pdf.text(
				hasDip ? `(${actualReadingDate})` : '(no dip recorded for month end)',
				detailsX,
				reconciliationY
			);
			pdf.setTextColor(0, 0, 0);
			reconciliationY += 4;

			// Tank variance - simplified with alignment
			const tankVariance = expectedLevel - reconciliationData.lastDipReading;
			pdf.text('Tank Variance:', labelX, reconciliationY);
			pdf.text(hasDip ? `${tankVariance.toFixed(1)}L` : '—', valueX, reconciliationY);

			let footerY = reconciliationY + 15;

			// Report generation timestamp
			pdf.setFontSize(7);
			pdf.setFont('helvetica', 'italic');
			pdf.setTextColor(...PDF_GREY);
			pdf.text(`Report generated on ${new Date().toLocaleString()}`, marginX, pageHeight - 10);

			// Save the PDF
			const fileName = `Monthly_Fuel_Report_${monthName}_${year}.pdf`;
			pdf.save(fileName);
		} catch (error) {
			console.error('PDF generation error:', error);
			throw new Error('Failed to generate PDF report');
		}
	}

	// Helper method to format date range
	formatDateRange(monthName: string, year: number): string {
		const daysInMonth = new Date(
			year,
			new Date(`${monthName} 1, ${year}`).getMonth() + 1,
			0
		).getDate();
		return `${monthName.slice(0, 3)} 1 - ${daysInMonth}, ${year}`;
	}
}

export default new ExportService();
