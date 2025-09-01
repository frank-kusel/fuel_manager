// Shared PDF Export Service
// Provides unified PDF generation functionality for different report types

import supabaseService from './supabase';

export interface PDFExportOptions {
	title: string;
	period: string;
	data: any;
	includeReconciliationStatus?: boolean;
	includeSignatureLine?: boolean;
	reportType?: 'fuel-entries' | 'reconciliation' | 'variance' | 'efficiency';
}

export interface ReconciliationStatus {
	month: string;
	fuelReconciled: boolean;
	tankReconciled: boolean;
	fuelReconciliationDate?: string;
	tankReconciliationDate?: string;
	lastFuelVariance?: number;
	lastTankVariance?: number;
}

export class PDFExportService {
	
	/**
	 * Check reconciliation status for a given month
	 */
	static async getReconciliationStatus(month: string): Promise<ReconciliationStatus> {
		try {
			await supabaseService.init();
			
			// Parse month (expected format: "2024-08" or "August 2024")
			const [year, monthNum] = month.includes('-') 
				? month.split('-') 
				: [month.split(' ')[1], String(new Date(month + ' 1, 2024').getMonth() + 1).padStart(2, '0')];
			
			const startDate = `${year}-${monthNum}-01`;
			const endDate = `${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}`;
			
			// Check fuel reconciliations
			const fuelReconciliations = await supabaseService.query(() =>
				supabaseService.ensureInitialized()
					.from('fuel_reconciliations')
					.select('*')
					.gte('start_date', startDate)
					.lte('end_date', endDate)
					.order('created_at', { ascending: false })
					.limit(1)
			);
			
			// Check tank reconciliations (legacy monthly_reconciliations or tank-specific)
			const tankReconciliations = await supabaseService.query(() =>
				supabaseService.ensureInitialized()
					.from('tank_reconciliations')
					.select('*')
					.gte('reconciliation_date', startDate)
					.lte('reconciliation_date', endDate)
					.order('created_at', { ascending: false })
					.limit(1)
			);
			
			const fuelRecord = fuelReconciliations.data?.[0];
			const tankRecord = tankReconciliations.data?.[0];
			
			return {
				month: month,
				fuelReconciled: !!fuelRecord,
				tankReconciled: !!tankRecord,
				fuelReconciliationDate: fuelRecord?.created_at?.split('T')[0],
				tankReconciliationDate: tankRecord?.created_at?.split('T')[0],
				lastFuelVariance: fuelRecord?.fuel_variance,
				lastTankVariance: tankRecord?.tank_variance_litres
			};
			
		} catch (err) {
			console.error('Error checking reconciliation status:', err);
			return {
				month: month,
				fuelReconciled: false,
				tankReconciled: false
			};
		}
	}
	
	/**
	 * Generate PDF content HTML
	 */
	static generatePDFContent(options: PDFExportOptions, reconciliationStatus?: ReconciliationStatus): string {
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
		
		// Add reconciliation status if requested
		if (includeReconciliationStatus && reconciliationStatus) {
			content += `
				<div class="reconciliation-status">
					<h3>Reconciliation Status for ${reconciliationStatus.month}</h3>
					<div class="status-grid">
						<div class="status-item">
							<span>Fuel Reconciliation:</span>
							<span class="status-badge ${reconciliationStatus.fuelReconciled ? 'status-reconciled' : 'status-pending'}">
								${reconciliationStatus.fuelReconciled ? 'Completed' : 'Pending'}
							</span>
						</div>
						<div class="status-item">
							<span>Tank Reconciliation:</span>
							<span class="status-badge ${reconciliationStatus.tankReconciled ? 'status-reconciled' : 'status-pending'}">
								${reconciliationStatus.tankReconciled ? 'Completed' : 'Pending'}
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
		
		// Add report-specific content based on type
		content += this.generateReportContent(data, reportType || 'fuel-entries');
		
		// Add signature line if requested
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
		
		// Add generation info
		content += `
			<div class="generated-info">
				Generated on ${new Date().toLocaleString()} by FarmTrack Fuel Management System
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
	private static generateReportContent(data: any, reportType: string): string {
		switch (reportType) {
			case 'fuel-entries':
				return this.generateFuelEntriesContent(data);
			case 'reconciliation':
				return this.generateReconciliationContent(data);
			case 'variance':
				return this.generateVarianceContent(data);
			case 'efficiency':
				return this.generateEfficiencyContent(data);
			default:
				return this.generateGenericContent(data);
		}
	}
	
	private static generateFuelEntriesContent(data: any[]): string {
		if (!Array.isArray(data) || data.length === 0) {
			return '<div style="text-align: center; padding: 40px; color: #666;">No data available</div>';
		}
		
		const totalFuel = data.reduce((sum, entry) => sum + (entry.litres_dispensed || 0), 0);
		const avgFuel = totalFuel / data.length;
		const uniqueVehicles = new Set(data.map(entry => entry.vehicle_id)).size;
		
		let content = `
			<div class="summary-grid">
				<div class="summary-card">
					<h4>Total Fuel Dispensed</h4>
					<div class="value">${totalFuel.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L</div>
				</div>
				<div class="summary-card">
					<h4>Total Entries</h4>
					<div class="value">${data.length}</div>
				</div>
				<div class="summary-card">
					<h4>Average per Entry</h4>
					<div class="value">${avgFuel.toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L</div>
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
		
		data.forEach(entry => {
			content += `
				<tr>
					<td>${new Date(entry.entry_date + 'T' + (entry.time || '00:00')).toLocaleDateString('en-ZA')}</td>
					<td>${entry.vehicles?.code || 'N/A'} - ${entry.vehicles?.name || ''}</td>
					<td>${entry.drivers?.name || 'N/A'}</td>
					<td style="text-align: right; font-weight: 600;">${(entry.litres_dispensed || 0).toLocaleString('en-ZA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
					<td>${entry.activities?.name || 'N/A'}</td>
					<td>${entry.fields?.name || entry.zones?.name || 'N/A'}</td>
				</tr>
			`;
		});
		
		content += `
				</tbody>
			</table>
		`;
		
		return content;
	}
	
	private static generateReconciliationContent(data: any): string {
		// Implementation for reconciliation report content
		return '<div>Reconciliation report content will be implemented</div>';
	}
	
	private static generateVarianceContent(data: any): string {
		// Implementation for variance report content  
		return '<div>Variance report content will be implemented</div>';
	}
	
	private static generateEfficiencyContent(data: any): string {
		// Implementation for efficiency report content
		return '<div>Efficiency report content will be implemented</div>';
	}
	
	private static generateGenericContent(data: any): string {
		return `<div><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
	}
	
	/**
	 * Export to PDF using print dialog
	 */
	static async exportToPDF(options: PDFExportOptions): Promise<void> {
		try {
			let reconciliationStatus: ReconciliationStatus | undefined;
			
			if (options.includeReconciliationStatus) {
				// Extract month from period - this could be improved based on your period format
				const monthMatch = options.period.match(/(\w+\s+\d{4}|\d{4}-\d{2})/);
				if (monthMatch) {
					reconciliationStatus = await this.getReconciliationStatus(monthMatch[1]);
				}
			}
			
			const htmlContent = this.generatePDFContent(options, reconciliationStatus);
			
			const printWindow = window.open('', '_blank');
			if (!printWindow) {
				throw new Error('Please allow popups to export PDF');
			}
			
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();
			
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 500);
			
		} catch (err) {
			console.error('PDF export failed:', err);
			throw new Error('Failed to export PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}
	
	/**
	 * Export to Excel using XLSX
	 */
	static async exportToExcel(options: PDFExportOptions): Promise<void> {
		try {
			const XLSX = await import('xlsx');
			
			const wb = XLSX.utils.book_new();
			
			// Summary sheet with reconciliation status
			const summaryData = [];
			summaryData.push([options.title]);
			summaryData.push([options.period]);
			summaryData.push([]);
			
			if (options.includeReconciliationStatus) {
				const monthMatch = options.period.match(/(\w+\s+\d{4}|\d{4}-\d{2})/);
				if (monthMatch) {
					const reconciliationStatus = await this.getReconciliationStatus(monthMatch[1]);
					summaryData.push(['Reconciliation Status']);
					summaryData.push(['Fuel Reconciled', reconciliationStatus.fuelReconciled ? 'Yes' : 'No']);
					summaryData.push(['Tank Reconciled', reconciliationStatus.tankReconciled ? 'Yes' : 'No']);
					if (reconciliationStatus.fuelReconciliationDate) {
						summaryData.push(['Fuel Reconciled On', reconciliationStatus.fuelReconciliationDate]);
					}
					if (reconciliationStatus.tankReconciliationDate) {
						summaryData.push(['Tank Reconciled On', reconciliationStatus.tankReconciliationDate]);
					}
					summaryData.push([]);
				}
			}
			
			const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
			XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
			
			// Data sheet
			if (Array.isArray(options.data) && options.data.length > 0) {
				const ws = XLSX.utils.json_to_sheet(options.data);
				XLSX.utils.book_append_sheet(wb, ws, 'Data');
			}
			
			// Generate filename
			const filename = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
			
			// Write file
			XLSX.writeFile(wb, filename);
			
		} catch (err) {
			console.error('Excel export failed:', err);
			throw new Error('Failed to export Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}
}