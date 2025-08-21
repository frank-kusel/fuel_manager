<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	interface Props {
		type: 'line' | 'bar' | 'pie' | 'doughnut';
		data: any;
		options?: any;
		height?: string;
	}
	
	let { type, data, options = {}, height = '300px' }: Props = $props();
	
	let canvas: HTMLCanvasElement;
	let chart: any;
	
	onMount(() => {
		if (browser) {
			// For now, we'll use a simple canvas implementation
			// In production, you'd want to integrate Chart.js or another charting library
			drawChart();
		}
		
		return () => {
			if (chart) {
				// Cleanup if using a charting library
			}
		};
	});
	
	function drawChart() {
		if (!canvas) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		// Simple chart rendering (placeholder)
		// In production, integrate with Chart.js:
		// npm install chart.js
		// import Chart from 'chart.js/auto';
		// chart = new Chart(ctx, { type, data, options });
		
		// For now, let's draw a simple representation
		const width = canvas.width;
		const height = canvas.height;
		
		// Clear canvas
		ctx.clearRect(0, 0, width, height);
		
		// Draw axes
		ctx.strokeStyle = '#e5e7eb';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(40, height - 40);
		ctx.lineTo(width - 20, height - 40);
		ctx.moveTo(40, 20);
		ctx.lineTo(40, height - 40);
		ctx.stroke();
		
		if (type === 'line' && data.datasets?.[0]?.data) {
			drawLineChart(ctx, width, height);
		} else if (type === 'bar' && data.datasets?.[0]?.data) {
			drawBarChart(ctx, width, height);
		} else if ((type === 'doughnut' || type === 'pie') && data.datasets?.[0]?.data) {
			drawDoughnutChart(ctx, width, height);
		}
	}
	
	function drawLineChart(ctx: CanvasRenderingContext2D, width: number, height: number) {
		const dataset = data.datasets[0];
		const values = dataset.data;
		const maxValue = Math.max(...values);
		const minValue = Math.min(...values);
		const range = maxValue - minValue || 1;
		
		const chartWidth = width - 60;
		const chartHeight = height - 60;
		const stepX = chartWidth / (values.length - 1 || 1);
		
		// Draw line
		ctx.strokeStyle = dataset.borderColor || '#3b82f6';
		ctx.lineWidth = 2;
		ctx.beginPath();
		
		values.forEach((value: number, index: number) => {
			const x = 40 + index * stepX;
			const y = height - 40 - ((value - minValue) / range) * chartHeight;
			
			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		
		ctx.stroke();
		
		// Draw points
		ctx.fillStyle = dataset.borderColor || '#3b82f6';
		values.forEach((value: number, index: number) => {
			const x = 40 + index * stepX;
			const y = height - 40 - ((value - minValue) / range) * chartHeight;
			
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fill();
		});
	}
	
	function drawBarChart(ctx: CanvasRenderingContext2D, width: number, height: number) {
		const dataset = data.datasets[0];
		const values = dataset.data;
		const maxValue = Math.max(...values);
		
		const chartWidth = width - 60;
		const chartHeight = height - 60;
		const barWidth = chartWidth / values.length * 0.7;
		const stepX = chartWidth / values.length;
		
		ctx.fillStyle = dataset.backgroundColor || '#22c55e';
		
		values.forEach((value: number, index: number) => {
			const barHeight = (value / maxValue) * chartHeight;
			const x = 40 + index * stepX + (stepX - barWidth) / 2;
			const y = height - 40 - barHeight;
			
			ctx.fillRect(x, y, barWidth, barHeight);
		});
	}
	
	function drawDoughnutChart(ctx: CanvasRenderingContext2D, width: number, height: number) {
		const dataset = data.datasets[0];
		const values = dataset.data;
		const total = values.reduce((sum: number, val: number) => sum + val, 0);
		
		const centerX = width / 2;
		const centerY = height / 2;
		const radius = Math.min(width, height) / 3;
		const innerRadius = type === 'doughnut' ? radius * 0.5 : 0;
		
		let currentAngle = -Math.PI / 2;
		const colors = dataset.backgroundColor || [
			'#3b82f6', '#22c55e', '#fbbf24', '#ef4444', '#a855f7',
			'#06b6d4', '#f97316', '#ec4899', '#6366f1', '#84cc16'
		];
		
		values.forEach((value: number, index: number) => {
			const sliceAngle = (value / total) * Math.PI * 2;
			
			// Draw slice
			ctx.fillStyle = colors[index % colors.length];
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
			if (innerRadius > 0) {
				ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
			} else {
				ctx.lineTo(centerX, centerY);
			}
			ctx.closePath();
			ctx.fill();
			
			// Draw border
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 2;
			ctx.stroke();
			
			currentAngle += sliceAngle;
		});
	}
	
	$effect(() => {
		// Redraw when data changes
		if (browser && canvas) {
			drawChart();
		}
	});
</script>

<div class="relative" style="height: {height}">
	<canvas 
		bind:this={canvas}
		width="600"
		height="300"
		class="w-full h-full"
	></canvas>
	
	{#if !data.datasets?.[0]?.data?.length}
		<div class="absolute inset-0 flex items-center justify-center">
			<p class="text-gray-500">No data available</p>
		</div>
	{/if}
</div>