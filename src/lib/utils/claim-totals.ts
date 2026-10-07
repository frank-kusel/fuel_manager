/**
 * The claim for a period, from fuel entries and classifier results.
 *
 * Before this, the same grouping lived three times — the Audit page's claim
 * card, the Actros card (which re-queried its own entries) and the claim
 * export — each with its own key format for the monthly adjustments.
 *
 * Grouping is by vehicle AND month because a classifier result is a monthly
 * fact: a period spanning months applies each month's own percentage, and a
 * month with no result excludes that month's litres (conservatively), never
 * the whole period's.
 */

import type { DieselClaimMethod, VehicleMonthlyClaimAdjustment } from '$lib/types';
import { calculateDieselClaim } from './diesel-claim';

export interface ClaimEntry {
	vehicleId: string;
	/** YYYY-MM-DD */
	date: string;
	litres: number;
	/** The entry's activity is marked claimable. */
	eligible: boolean;
	method: DieselClaimMethod;
}

export type ClaimAdjustment = Pick<
	VehicleMonthlyClaimAdjustment,
	| 'vehicle_id'
	| 'claim_month'
	| 'classifier_measured_litres'
	| 'classifier_claimable_litres'
	| 'claimable_percentage'
>;

export interface VehicleClaim {
	vehicleId: string;
	method: DieselClaimMethod;
	totalLitres: number;
	/** Litres on claimable activities, before any classifier share. */
	baseEligibleLitres: number;
	claimableLitres: number;
	/** YYYY-MM months with classifier litres but no classifier result. */
	missingMonths: string[];
}

export interface ClaimSummary {
	totalLitres: number;
	claimableLitres: number;
	nonClaimableLitres: number;
	/** Litres on claimable activities that a missing classifier result excluded. */
	excludedLitres: number;
	/** Vehicle-months with no classifier result. */
	missingAdjustments: number;
	byVehicle: Map<string, VehicleClaim>;
}

function adjustmentKey(vehicleId: string, month: string): string {
	return `${vehicleId}|${month.slice(0, 7)}`;
}

export function summariseClaim(
	entries: ClaimEntry[],
	adjustments: ClaimAdjustment[] = []
): ClaimSummary {
	const adjustmentByVehicleMonth = new Map(
		adjustments.map((a) => [adjustmentKey(a.vehicle_id, a.claim_month), a])
	);

	const groups = new Map<
		string,
		{ vehicleId: string; month: string; method: DieselClaimMethod; total: number; eligible: number }
	>();
	for (const entry of entries) {
		const month = entry.date.slice(0, 7);
		const key = adjustmentKey(entry.vehicleId, month);
		const group = groups.get(key) ?? {
			vehicleId: entry.vehicleId,
			month,
			method: entry.method,
			total: 0,
			eligible: 0
		};
		group.total += entry.litres;
		if (entry.eligible) group.eligible += entry.litres;
		groups.set(key, group);
	}

	const byVehicle = new Map<string, VehicleClaim>();
	let totalLitres = 0;
	let claimableLitres = 0;
	let excludedLitres = 0;
	let missingAdjustments = 0;

	for (const group of groups.values()) {
		const result = calculateDieselClaim({
			totalLitres: group.total,
			baseEligibleLitres: group.eligible,
			method: group.method,
			adjustment: adjustmentByVehicleMonth.get(adjustmentKey(group.vehicleId, group.month))
		});

		const vehicle = byVehicle.get(group.vehicleId) ?? {
			vehicleId: group.vehicleId,
			method: group.method,
			totalLitres: 0,
			baseEligibleLitres: 0,
			claimableLitres: 0,
			missingMonths: []
		};
		vehicle.totalLitres += result.totalLitres;
		vehicle.baseEligibleLitres += result.baseEligibleLitres;
		vehicle.claimableLitres += result.claimableLitres;
		if (result.missingAdjustment) {
			vehicle.missingMonths.push(group.month);
			missingAdjustments++;
			excludedLitres += result.baseEligibleLitres;
		}
		byVehicle.set(group.vehicleId, vehicle);

		totalLitres += result.totalLitres;
		claimableLitres += result.claimableLitres;
	}

	for (const vehicle of byVehicle.values()) vehicle.missingMonths.sort();

	return {
		totalLitres,
		claimableLitres,
		nonClaimableLitres: totalLitres - claimableLitres,
		excludedLitres,
		missingAdjustments,
		byVehicle
	};
}
