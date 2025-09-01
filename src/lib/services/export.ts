import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ApiResponse, FuelEntry } from '$lib/types';

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
	consumption: number | string;
	unit: string;
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
				.select(`
					*,
					vehicles:vehicle_id(code, name),
					drivers:driver_id(employee_code, name),
					activities:activity_id(code, name),
					fields:field_id(code, name),
					zones:zone_id(code, name),
					bowsers:bowser_id(code, name)
				`)
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
					if (entry.odometer_end && entry.odometer_start && entry.odometer_end > entry.odometer_start) {
						hrsKm = entry.odometer_end - entry.odometer_start;
					} else if (entry.hours_worked) {
						// Fallback to hours worked if no valid odometer readings
						hrsKm = entry.hours_worked;
					} else if (entry.distance_km) {
						// Fallback to distance_km if available
						hrsKm = entry.distance_km;
					}

					return {
						date: this.formatDate(entry.entry_date),
						vehicle: entry.vehicles.code || 'N/A',
						field: entry.fields?.code || entry.zones?.code || 'N/A',
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
				['Date', 'Vehicle', 'Activity Details', '', 'Fuel Consp', '', '', 'Fuel Store', '', 'Other', ''],
				['Date', 'Vehicle', 'Field', 'Activity', 'Fuel', 'HrsKm', 'Odo. End', 'Store', 'Issue No.', 'Tons', 'Driver']
			];
			
			// Add data rows
			const dataRows = data.map(row => [
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
				{ wch: 8 },  // Fuel
				{ wch: 8 },  // HrsKm
				{ wch: 10 }, // Odo. End
				{ wch: 10 }, // Store
				{ wch: 10 }, // Issue No.
				{ wch: 8 },  // Tons
				{ wch: 8 }   // Driver
			];

			// Merge cells for main header
			worksheet['!merges'] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Main header
				{ s: { r: 2, c: 2 }, e: { r: 2, c: 3 } }, // Activity Details
				{ s: { r: 2, c: 4 }, e: { r: 2, c: 6 } }, // Fuel Consp
				{ s: { r: 2, c: 7 }, e: { r: 2, c: 8 } }, // Fuel Store
				{ s: { r: 2, c: 9 }, e: { r: 2, c: 10 } }  // Other
			];

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
		supabaseService: any
	): Promise<ApiResponse<MonthlySummaryData[]>> {
		try {
			await supabaseService.init();
			const client = supabaseService.getClient();
			
			// Get start and end dates for the month (using UTC to avoid timezone issues)
			const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
			const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];
			
			// Fetch fuel entries with vehicle data for the month
			const result = await client
				.from('fuel_entries')
				.select(`
					*,
					vehicles:vehicle_id(id, code, name, type, odometer_unit, registration)
				`)
				.gte('entry_date', startDate)
				.lte('entry_date', endDate)
				.order('entry_date', { ascending: true })
				.order('time', { ascending: true });

			if (result.error) {
				return { data: null, error: result.error.message };
			}

			// Group data by vehicle and calculate summaries
			const vehicleSummaries = new Map<string, {
				code: string;
				name: string;
				type: string;
				registration: string;
				odometerUnit: string;
				totalFuel: number;
				firstOdometer: number | null;
				lastOdometer: number | null;
				totalHours: number;
				hasOdometerData: boolean;
				hasHoursData: boolean;
				entries: any[];
			}>();

			result.data.forEach((entry: any) => {
				const vehicleId = entry.vehicle_id;
				const vehicle = entry.vehicles;
				
				if (!vehicle) return;
				
				const key = vehicleId;
				if (!vehicleSummaries.has(key)) {
					vehicleSummaries.set(key, {
						code: vehicle.code || 'N/A',
						name: vehicle.name || 'Unknown',
						type: vehicle.type || 'Other',
						registration: vehicle.registration || '',
						odometerUnit: vehicle.odometer_unit || null, // Keep null instead of defaulting to 'km'
						totalFuel: 0,
						firstOdometer: null,
						lastOdometer: null,
						totalHours: 0,
						hasOdometerData: false,
						hasHoursData: false,
						entries: []
					});
				}

				const summary = vehicleSummaries.get(key)!;
				summary.entries.push(entry);
				summary.totalFuel += entry.litres_dispensed || 0;
				
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

			// Transform to export format
			const summaryData: MonthlySummaryData[] = Array.from(vehicleSummaries.values())
				.filter(summary => summary.totalFuel > 0) // Only include vehicles with fuel consumption
				.map(summary => {
					let distance: number | string = '';
					let consumption: number | string = '';
					let unit = '';
					
					// Only calculate if there is an odometer_unit (not null, not undefined, not empty)
					if (summary.odometerUnit !== null && summary.odometerUnit !== undefined && summary.odometerUnit.trim() !== '') {
						unit = summary.odometerUnit;
						
						// Calculate distance based on odometer difference
						if (summary.hasOdometerData && summary.firstOdometer !== null && summary.lastOdometer !== null) {
							const odometerDifference = summary.lastOdometer - summary.firstOdometer;
							if (odometerDifference > 0) {
								distance = Math.round(odometerDifference * 100) / 100; // 2 decimal places
								
								// Calculate consumption: fuel / distance
								// If unit is km, multiply by 100 to get L/100km
								if (unit.toLowerCase() === 'km') {
									consumption = Math.round((summary.totalFuel / (odometerDifference / 100)) * 100) / 100; // L/100km, 2 decimal places
								} else {
									consumption = Math.round((summary.totalFuel / odometerDifference) * 100) / 100; // L per unit, 2 decimal places
								}
							} else {
								// No movement - show 0.00 distance and no consumption
								distance = 0.00;
								consumption = '';
							}
						} else {
							// No odometer data - show empty distance and no consumption
							distance = '';
							consumption = '';
						}
					}
					// If no odometer_unit, distance, consumption, and unit remain empty

					return {
						code: summary.code,
						name: summary.name,
						registration: summary.registration,
						category: summary.type, // Use type directly from supabase
						distance: distance,
						fuel: Math.round(summary.totalFuel * 100) / 100, // 2 decimal places
						consumption: consumption,
						unit: unit
					};
				})
				.sort((a, b) => a.code.localeCompare(b.code)); // Sort by vehicle code

			return { data: summaryData, error: null };
			
		} catch (error) {
			return { 
				data: null, 
				error: error instanceof Error ? error.message : 'Failed to fetch monthly summary data' 
			};
		}
	}


	// Generate monthly summary Excel file
	async generateMonthlySummaryExcel(
		data: MonthlySummaryData[],
		year: number,
		month: number,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			// Create new workbook
			const workbook = XLSX.utils.book_new();
			
			// Format month name
			const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
				'July', 'August', 'September', 'October', 'November', 'December'];
			const monthName = monthNames[month - 1];
			
			// Create header data
			const headerData = [
				[`Monthly Vehicle Summary - ${companyName} - ${monthName} ${year}`],
				[],
				['Code', 'Name', 'Category', 'Distance', 'Fuel', 'Consumption', 'Unit']
			];
			
			// Add data rows
			const dataRows = data.map(row => [
				row.code,
				row.name,
				row.category,
				row.distance,
				row.fuel,
				row.consumption,
				row.unit
			]);

			// Combine header and data
			const worksheetData = [...headerData, ...dataRows];
			
			// Create worksheet
			const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
			
			// Set column widths
			worksheet['!cols'] = [
				{ wch: 8 },  // Code
				{ wch: 25 }, // Name
				{ wch: 15 }, // Category
				{ wch: 10 }, // Distance
				{ wch: 10 }, // Fuel
				{ wch: 12 }, // Consumption
				{ wch: 8 }   // Unit
			];

			// Merge cells for main header
			worksheet['!merges'] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } // Main header
			];

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');
			
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
		data: MonthlySummaryData[],
		year: number,
		month: number,
		companyName: string = 'KCT Farming (Pty) Ltd'
	): Promise<void> {
		try {
			// Create new PDF document
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageWidth = pdf.internal.pageSize.width;
			const pageHeight = pdf.internal.pageSize.height;
			
			// Format month name
			const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
				'July', 'August', 'September', 'October', 'November', 'December'];
			const monthName = monthNames[month - 1];
			
			// Calculate total fuel consumption
			const totalFuel = data.reduce((sum, vehicle) => sum + vehicle.fuel, 0);
			const averageFuel = data.length > 0 ? totalFuel / data.length : 0;
			
			// Professional journal-style header
			pdf.setFontSize(18);
			pdf.setFont('times', 'bold');
			pdf.text('Monthly Fuel Consumption Report', pageWidth / 2, 25, { align: 'center' });
			
			pdf.setFontSize(14);
			pdf.setFont('times', 'normal');
			pdf.text(companyName, pageWidth / 2, 33, { align: 'center' });
			
			pdf.setFontSize(12);
			pdf.setFont('times', 'italic');
			pdf.text(`${monthName} ${year}`, pageWidth / 2, 40, { align: 'center' });
			
			// Summary statistics at the top
			pdf.setFontSize(10);
			pdf.setFont('times', 'bold');
			pdf.text('Summary Statistics', 15, 52);
			
			pdf.setFontSize(9);
			pdf.setFont('times', 'normal');
			pdf.text(`Total Active Vehicles: ${data.length}`, 15, 60);
			pdf.text(`Total Fuel Consumption: ${totalFuel.toFixed(2)} Litres`, 15, 66);
			
			// Professional table with registration after name
			const tableStartY = 78;
			const tableData = data.map(vehicle => [
				vehicle.code,
				vehicle.name + (vehicle.registration ? ` (${vehicle.registration})` : ''),
				vehicle.category,
				vehicle.distance === '' ? '—' : vehicle.distance.toString(),
				vehicle.fuel.toFixed(2),
				vehicle.consumption === '' ? '—' : vehicle.consumption.toString(),
				vehicle.unit || '—'
			]);
			
			// Add subtotal row
			tableData.push([
				'',
				'',
				'',
				'',
				`${totalFuel.toFixed(2)}`,
				'',
				''
			]);

			// Scientific journal table style with flexible width
			autoTable(pdf, {
				startY: tableStartY,
				head: [['Vehicle ID', 'Vehicle Name (Registration)', 'Classification', 'Distance', 'Fuel (L)', 'Efficiency*', 'Unit']],
				body: tableData,
				theme: 'grid',
				styles: {
					fontSize: 8,
					cellPadding: 2,
					lineColor: [200, 200, 200],
					lineWidth: 0.1,
					font: 'times',
					textColor: [0, 0, 0]
				},
				headStyles: {
					fillColor: [255, 255, 255],
					textColor: [0, 0, 0],
					fontStyle: 'bold',
					fontSize: 8,
					halign: 'center'
				},
				columnStyles: {
					0: { halign: 'center' }, // Code
					1: { halign: 'left' }, // Name + Registration (flexible)
					2: { halign: 'center' }, // Type
					3: { halign: 'right' }, // Distance
					4: { halign: 'right' }, // Fuel
					5: { halign: 'right' }, // Consumption
					6: { halign: 'center' } // Unit
				},
				didParseCell: function (data: any) {
					// Style the subtotal row (last row)
					if (data.row.index === tableData.length - 1) {
						data.cell.styles.fontStyle = 'bold';
						data.cell.styles.fillColor = [240, 240, 240];
					}
				},
				// Let autoTable calculate column widths automatically for full page width
				margin: { left: 15, right: 15 },
				didDrawPage: (data: any) => {
					// Professional footer
					pdf.setFontSize(8);
					pdf.setFont('times', 'normal');
					const printDate = new Date().toLocaleDateString('en-ZA', { 
						year: 'numeric', 
						month: '2-digit', 
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit'
					});
					pdf.text(`Generated: ${printDate}`, 15, pageHeight - 10);
				}
			});

			// Efficiency calculation footnote
			const finalY = (pdf as any).lastAutoTable.finalY + 8;
			
			pdf.setFontSize(8);
			pdf.setFont('times', 'italic');
			pdf.text('* Efficiency calculated as L/100km or L/hr depending on the unit', 15, finalY);
			
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
}

export default new ExportService();