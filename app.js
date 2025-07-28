// --- Supabase config fetched from Netlify function ---
async function getSupabaseConfig() {
  const res = await fetch('/.netlify/functions/config');
  if (!res.ok) throw new Error('Failed to load Supabase config');
  return res.json();
}

(async () => {
  try {
    const config = await getSupabaseConfig();
    const supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    window.supabaseClient = supabase; // For debugging/global access if needed

    // Fleet Manager - Minimal design with enhanced functionality
    class FleetManager {
    constructor() {
        this.currentVehicle = null;
        this.currentDriver = null;
        this.currentStep = 'vehicle';
        this.selectedVehicleRow = null;
        this.selectedDriverRow = null;
        this.init();
    }

    async init() {
        console.log('Initializing Fleet Manager with Supabase...');
        
        // Show fuel entry section immediately
        this.showSection('fuel-entry');
        this.showStep('vehicle');
        this.setDefaultDate();
        
        // Test Supabase connection
        await this.testSupabaseConnection();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data from Supabase
        await this.loadInitialData();
        console.log('Initial data loaded successfully from Supabase');
        
        console.log('Fleet Manager initialization complete');
    }

    async testSupabaseConnection() {
        try {
            const { data, error } = await supabase.from('vehicles').select('count', { count: 'exact' });
            if (error) {
                console.error('Supabase connection error:', error);
                alert('Unable to connect to database. Please check your internet connection.');
                return false;
            }
            console.log('Supabase connection successful');
            return true;
        } catch (error) {
            console.error('Supabase connection failed:', error);
            alert('Database connection failed. The application may not work properly.');
            return false;
        }
    }

    async loadInitialData() {
        await this.renderVehicles();
        await this.renderDrivers();
        await this.renderVehicleManagement();
        await this.renderDriverManagement();
        await this.updateDashboard();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation - with null checks
        const navElements = [
            { id: 'nav-fuel-entry', section: 'fuel-entry' },
            { id: 'nav-dashboard', section: 'dashboard' },
            { id: 'nav-vehicles', section: 'vehicles' },
            { id: 'nav-drivers', section: 'drivers' }
        ];
        
        navElements.forEach(({ id, section }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => this.showSection(section));
            } else {
                console.error(`Navigation element ${id} not found`);
            }
        });

        // Step navigation - with null checks
        const stepElements = [
            { id: 'back-to-vehicle', action: () => this.showStep('vehicle') },
            { id: 'back-to-driver', action: () => this.showStep('driver') },
            { id: 'back-to-activity', action: () => this.showStep('activity') },
            { id: 'back-to-fuel-data', action: () => this.showStep('fuel-data') },
            { id: 'next-to-fuel', action: () => this.nextToFuelData() },
            { id: 'next-to-review', action: () => this.nextToReview() },
            { id: 'save-fuel-record', action: () => this.saveFuelRecord() }
        ];
        
        stepElements.forEach(({ id, action }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', action);
            } else {
                console.error(`Step navigation element ${id} not found`);
            }
        });

        // Form handling - with null checks
        const cancelEntry = document.getElementById('cancel-entry');
        
        if (cancelEntry) {
            cancelEntry.addEventListener('click', () => this.cancelFuelEntry());
        } else {
            console.error('Cancel entry button not found');
        }

        // Vehicle management
        document.getElementById('add-vehicle').addEventListener('click', () => this.showVehicleModal());
        document.getElementById('vehicle-form').addEventListener('submit', (e) => this.handleVehicleFormSubmit(e));
        document.getElementById('close-vehicle-modal').addEventListener('click', () => this.hideVehicleModal());
        document.getElementById('cancel-vehicle').addEventListener('click', () => this.hideVehicleModal());

        // Driver management
        document.getElementById('add-driver').addEventListener('click', () => this.showDriverModal());
        document.getElementById('driver-form').addEventListener('submit', (e) => this.handleDriverFormSubmit(e));
        document.getElementById('close-driver-modal').addEventListener('click', () => this.hideDriverModal());
        document.getElementById('cancel-driver').addEventListener('click', () => this.hideDriverModal());

        // Fuel consumption calculation and gauge broken functionality
        document.getElementById('odo-start').addEventListener('input', () => this.calculateConsumption());
        document.getElementById('odo-end').addEventListener('input', () => this.calculateConsumption());
        document.getElementById('litres-used').addEventListener('input', () => this.calculateConsumption());
        document.getElementById('gauge-broken').addEventListener('change', () => this.handleGaugeBroken());

        // Export functionality
        document.getElementById('export-monthly').addEventListener('click', () => this.exportMonthlyReport());
        document.getElementById('export-annual').addEventListener('click', () => this.exportAnnualReport());
        document.getElementById('export-canepro').addEventListener('click', () => this.exportCaneProFormat());

        // Modal backdrop clicks
        document.getElementById('vehicle-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideVehicleModal();
        });
        document.getElementById('driver-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideDriverModal();
        });
    }

    showSection(section) {
        console.log(`Switching to section: ${section}`);
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const navBtn = document.getElementById(`nav-${section}`);
        if (navBtn) {
            navBtn.classList.add('active');
        } else {
            console.error(`Navigation button nav-${section} not found`);
        }

        // Show section
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
            console.log(`Section ${section} is now active`);
        } else {
            console.error(`Section ${section}-section not found`);
        }

        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'vehicles') {
            this.renderVehicleManagement();
        } else if (section === 'drivers') {
            this.renderDriverManagement();
        } else if (section === 'fuel-entry') {
            // Ensure vehicles are rendered for fuel entry
            this.renderVehicles();
            this.renderDrivers();
        }
    }

    showStep(step) {
        console.log(`Switching to step: ${step}`);
        
        // First check if fuel-entry section is active
        const fuelEntrySection = document.getElementById('fuel-entry-section');
        if (!fuelEntrySection || !fuelEntrySection.classList.contains('active')) {
            console.warn('Fuel entry section not active, ensuring it is shown');
            this.showSection('fuel-entry');
        }
        
        // Hide all steps
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            console.log(`Hiding step: ${s.id}`);
        });
        
        // Show target step
        const stepElement = document.getElementById(`step-${step}`);
        if (stepElement) {
            stepElement.classList.add('active');
            console.log(`Step ${step} is now active and visible`);
            
            // Force a reflow to ensure visibility
            stepElement.offsetHeight;
            
            // Check if step is actually visible
            const computedStyle = window.getComputedStyle(stepElement);
            console.log(`Step ${step} display: ${computedStyle.display}`);
            console.log(`Step ${step} classes: ${stepElement.className}`);
            
            // Force display if needed
            if (computedStyle.display === 'none') {
                console.warn(`Step ${step} still hidden, forcing display`);
                stepElement.style.display = 'block';
            }
        } else {
            console.error(`Step step-${step} not found`);
            return;
        }
        
        this.currentStep = step;
        
        // Clear selections when going back
        if (step === 'vehicle') {
            this.currentVehicle = null;
            this.currentDriver = null;
            this.selectedVehicleRow = null;
            this.selectedDriverRow = null;
        } else if (step === 'driver') {
            this.currentDriver = null;
            this.selectedDriverRow = null;
        }
    }

    getVehicleTypeIcon(type) {
        const icons = {
            'tractor': '🚜',
            'bakkie': '🚙',
            'truck': '🚛',
            'loader': '🏗️',
            'utility': '🚐',
            'other': '🚗'
        };
        return icons[type] || icons['other'];
    }

    async renderVehicles() {
        try {
            const vehicles = await this.fetchVehiclesFromSupabase();
            if (!vehicles) {
                console.error('Failed to fetch vehicles from Supabase');
                return;
            }

            const tableBody = document.getElementById('vehicle-table-body');
            tableBody.innerHTML = vehicles.map(vehicle => {
                return `
                <tr class="clickable vehicle-type-${vehicle.type}" data-id="${vehicle.id}">
                    <td><span class="vehicle-code-colored">${vehicle.code}</span></td>
                    <td>${vehicle.name}</td>
                    <td>${vehicle.registration}</td>
                </tr>
            `;
        }).join('');

        // Remove any existing event listeners to prevent duplicates
        const newTableBody = tableBody.cloneNode(true);
        tableBody.parentNode.replaceChild(newTableBody, tableBody);

        // Add click handlers for vehicle selection
        newTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.id) {
                // Remove previous selection
                if (this.selectedVehicleRow) {
                    this.selectedVehicleRow.classList.remove('selected');
                }
                
                // Select new row
                row.classList.add('selected');
                this.selectedVehicleRow = row;
                
                const vehicleId = parseInt(row.dataset.id);
                this.selectVehicle(vehicleId);
            }
        });
        } catch (error) {
            console.error('Error rendering vehicles:', error);
            const tableBody = document.getElementById('vehicle-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading vehicles. Please refresh the page.</td></tr>';
            }
        }
    }

    async renderDrivers() {
        try {
            const drivers = await this.fetchDriversFromSupabase();
            if (!drivers) {
                console.error('Failed to fetch drivers from Supabase');
                return;
            }

            const tableBody = document.getElementById('driver-table-body');
        tableBody.innerHTML = drivers.map(driver => `
            <tr class="clickable" data-id="${driver.id}">
                <td><strong>${driver.code}</strong></td>
                <td>${driver.name}</td>
                <td>${driver.license_number || 'N/A'}</td>
                <td>${driver.phone || 'N/A'}</td>
            </tr>
        `).join('');

        // Remove any existing event listeners to prevent duplicates
        const newTableBody = tableBody.cloneNode(true);
        tableBody.parentNode.replaceChild(newTableBody, tableBody);

        // Add click handlers for driver selection
        newTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.id) {
                // Remove previous selection
                if (this.selectedDriverRow) {
                    this.selectedDriverRow.classList.remove('selected');
                }
                
                // Select new row
                row.classList.add('selected');
                this.selectedDriverRow = row;
                
                const driverId = parseInt(row.dataset.id);
                this.selectDriver(driverId);
            }
        });
        } catch (error) {
            console.error('Error rendering drivers:', error);
            const tableBody = document.getElementById('driver-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading drivers. Please refresh the page.</td></tr>';
            }
        }
    }

    async selectVehicle(vehicleId) {
        console.log(`Selecting vehicle with ID: ${vehicleId}`);
        
        try {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
                
            if (error) {
                console.error('Error selecting vehicle:', error);
                alert('Error selecting vehicle. Please try again.');
                return;
            }
            
            this.currentVehicle = vehicle;
            console.log('Vehicle selected:', this.currentVehicle);
                
                const vehicleInfoElement = document.getElementById('selected-vehicle-info');
                if (vehicleInfoElement) {
                    vehicleInfoElement.innerHTML = `
                        <strong>${this.currentVehicle.code}</strong> - ${this.currentVehicle.name}<br>
                        <small>${this.currentVehicle.registration}</small>
                    `;
                } else {
                    console.error('selected-vehicle-info element not found');
                }
                
                // Ensure drivers are rendered before showing driver step
                this.renderDrivers().then(() => {
                    this.showStep('driver');
                });
                
        } catch (error) {
            console.error('Error selecting vehicle:', error);
            alert('Error selecting vehicle. Please try again.');
        }
    }

    async selectDriver(driverId) {
        console.log(`Selecting driver with ID: ${driverId}`);
        
        if (!this.currentVehicle) {
            console.error('No vehicle selected');
            alert('Please select a vehicle first.');
            this.showStep('vehicle');
            return;
        }
        
        try {
            const { data: driver, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('id', driverId)
                .single();
                
            if (error) {
                console.error('Error selecting driver:', error);
                alert('Error selecting driver. Please try again.');
                return;
            }
            
            this.currentDriver = driver;
            console.log('Driver selected:', this.currentDriver);
            
            const driverInfoElement = document.getElementById('selected-driver-info');
            if (driverInfoElement) {
                driverInfoElement.innerHTML = `
                    <strong>${this.currentDriver.code}</strong> - ${this.currentDriver.name}<br>
                    <small>${this.currentDriver.license_number || 'No license on file'}</small>
                `;
            } else {
                console.error('selected-driver-info element not found');
            }
            
            // Set default odometer start value to last reading
            try {
                const { data: lastRecord, error: odoError } = await supabase
                    .from('fuel_entries')
                    .select('odo_end')
                    .eq('vehicle_id', this.currentVehicle.id)
                    .eq('gauge_broken', false)
                    .order('date', { ascending: false })
                    .limit(1)
                    .single();
                    
                if (!odoError && lastRecord) {
                    const odoStartElement = document.getElementById('odo-start');
                    if (odoStartElement) {
                        odoStartElement.value = lastRecord.odo_end;
                    }
                }
            } catch (odoError) {
                console.warn('Could not set default odometer value:', odoError);
            }
            
            this.showStep('activity');
            
        } catch (error) {
            console.error('Error selecting driver:', error);
            alert('Error selecting driver. Please try again.');
        }
    }

    nextToFuelData() {
        const activity = document.getElementById('activity').value;
        const fieldName = document.getElementById('field-name').value;
        
        if (!activity) {
            alert('Please select an activity.');
            return;
        }
        
        if (!fieldName) {
            alert('Please select a field/location.');
            return;
        }
        
        // Update selected activity info
        const activityInfoElement = document.getElementById('selected-activity-info');
        if (activityInfoElement) {
            activityInfoElement.innerHTML = `
                <strong>${activity.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong><br>
                <small>Location: ${fieldName}</small>
            `;
        }
        
        // Update vehicle info for fuel data step
        const vehicleInfo2Element = document.getElementById('selected-vehicle-info-2');
        if (vehicleInfo2Element && this.currentVehicle) {
            vehicleInfo2Element.innerHTML = `
                <strong>${this.currentVehicle.code}</strong> - ${this.currentVehicle.name}<br>
                <small>${this.currentVehicle.registration}</small>
            `;
        }
        
        this.showStep('fuel-data');
    }

    nextToReview() {
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        
        if (isNaN(odoStart) || odoStart < 0) {
            alert('Please enter a valid odometer start reading.');
            return;
        }
        
        if (!gaugeBroken && (isNaN(odoEnd) || odoEnd < 0)) {
            alert('Please enter a valid odometer end reading.');
            return;
        }
        
        if (isNaN(litresUsed) || litresUsed <= 0) {
            alert('Please enter a valid fuel amount.');
            return;
        }
        
        if (!gaugeBroken && odoEnd < odoStart) {
            alert('End odometer reading cannot be less than start reading.');
            return;
        }
        
        this.generateReviewSummary();
        this.showStep('review');
    }

    generateReviewSummary() {
        const activity = document.getElementById('activity').value;
        const fieldName = document.getElementById('field-name').value;
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        const fuelConsumption = document.getElementById('fuel-consumption').value;
        
        const distance = gaugeBroken ? 0 : (odoEnd - odoStart);
        
        const reviewSummary = document.getElementById('review-summary');
        if (reviewSummary) {
            reviewSummary.innerHTML = `
                <div class="review-card">
                    <h3>Record Summary</h3>
                    <div class="review-row">
                        <span class="review-label">Vehicle:</span>
                        <span>${this.currentVehicle.code} - ${this.currentVehicle.name}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Driver:</span>
                        <span>${this.currentDriver.code} - ${this.currentDriver.name}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Activity:</span>
                        <span>${activity.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Location:</span>
                        <span>${fieldName}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Odometer Start:</span>
                        <span>${odoStart.toFixed(1)} km</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Odometer End:</span>
                        <span>${gaugeBroken ? 'N/A (gauge broken)' : odoEnd.toFixed(1) + ' km'}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Distance:</span>
                        <span>${gaugeBroken ? 'N/A (gauge broken)' : distance.toFixed(1) + ' km'}</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Fuel Used:</span>
                        <span>${litresUsed.toFixed(2)} L</span>
                    </div>
                    <div class="review-row">
                        <span class="review-label">Consumption:</span>
                        <span>${fuelConsumption || 'N/A'}</span>
                    </div>
                </div>
            `;
        }
    }

    calculateConsumption() {
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        const consumptionElement = document.getElementById('fuel-consumption');
        
        if (gaugeBroken || isNaN(odoStart) || isNaN(odoEnd) || isNaN(litresUsed) || odoEnd <= odoStart) {
            consumptionElement.value = gaugeBroken ? 'N/A (gauge broken)' : '';
            return;
        }
        
        const distance = odoEnd - odoStart;
        if (distance > 0) {
            const consumption = (litresUsed / distance) * 100;
            consumptionElement.value = consumption.toFixed(2) + ' L/100km';
        } else {
            consumptionElement.value = '';
        }
    }

    handleGaugeBroken() {
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        const odoEndElement = document.getElementById('odo-end');
        const odoStartElement = document.getElementById('odo-start');
        
        if (gaugeBroken) {
            odoEndElement.value = odoStartElement.value;
            odoEndElement.disabled = true;
        } else {
            odoEndElement.disabled = false;
        }
        
        this.calculateConsumption();
    }

    async saveFuelRecord() {
        try {
            const activity = document.getElementById('activity').value;
            const fieldName = document.getElementById('field-name').value;
            const odoStart = parseFloat(document.getElementById('odo-start').value);
            const odoEnd = parseFloat(document.getElementById('odo-end').value);
            const litresUsed = parseFloat(document.getElementById('litres-used').value);
            const gaugeBroken = document.getElementById('gauge-broken').checked;
            const date = document.getElementById('date').value;
            const needsReview = document.getElementById('needs-review').checked;
            
            if (!date) {
                alert('Please select a date.');
                return;
            }
            
            const distance = gaugeBroken ? 0 : (odoEnd - odoStart);
            const consumption = distance > 0 ? (litresUsed / distance) * 100 : 0;
            
            const fuelEntry = {
                vehicle_id: this.currentVehicle.id,
                driver_id: this.currentDriver.id,
                date: date,
                activity: activity,
                field_name: fieldName,
                odo_start: odoStart,
                odo_end: gaugeBroken ? odoStart : odoEnd,
                litres_used: litresUsed,
                distance: distance,
                consumption: consumption,
                gauge_broken: gaugeBroken,
                needs_review: needsReview
            };
            
            const { data, error } = await supabase
                .from('fuel_entries')
                .insert([fuelEntry])
                .select();
                
            if (error) {
                console.error('Error saving fuel record:', error);
                alert('Error saving fuel record. Please try again.');
                return;
            }
            
            console.log('Fuel record saved successfully:', data);
            alert('Fuel record saved successfully!');
            
            // Reset form and go back to vehicle selection
            this.resetFuelEntryForm();
            this.showStep('vehicle');
            
            // Refresh data
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Error saving fuel record:', error);
            alert('Error saving fuel record. Please try again.');
        }
    }

    resetFuelEntryForm() {
        // Clear form fields
        document.getElementById('activity').value = '';
        document.getElementById('field-name').value = '';
        document.getElementById('odo-start').value = '';
        document.getElementById('odo-end').value = '';
        document.getElementById('litres-used').value = '';
        document.getElementById('fuel-consumption').value = '';
        document.getElementById('gauge-broken').checked = false;
        document.getElementById('needs-review').checked = false;
        
        // Enable odo end field in case it was disabled
        document.getElementById('odo-end').disabled = false;
        
        // Clear selections
        this.currentVehicle = null;
        this.currentDriver = null;
        this.selectedVehicleRow = null;
        this.selectedDriverRow = null;
        
        // Clear selected row styling
        document.querySelectorAll('.selected').forEach(row => row.classList.remove('selected'));
        
        // Clear info displays
        const infoElements = ['selected-vehicle-info', 'selected-driver-info', 'selected-activity-info', 'selected-vehicle-info-2'];
        infoElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = '';
        });
        
        // Set default date
        this.setDefaultDate();
    }

    cancelFuelEntry() {
        if (confirm('Are you sure you want to cancel this fuel entry? All data will be lost.')) {
            this.resetFuelEntryForm();
            this.showStep('vehicle');
        }
    }

    setDefaultDate() {
        const dateElement = document.getElementById('date');
        if (dateElement) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateElement.value = formattedDate;
        }
    }

    // --- SUPABASE CRUD METHODS ---
    async fetchVehiclesFromSupabase() {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('code', { ascending: true });
        if (error) {
            console.error('Error fetching vehicles:', error);
            return [];
        }
        return data;
    }

    async fetchDriversFromSupabase() {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .order('code', { ascending: true });
        if (error) {
            console.error('Error fetching drivers:', error);
            return [];
        }
        return data;
    }

    async fetchFuelEntriesFromSupabase() {
        const { data, error } = await supabase
            .from('fuel_entries')
            .select('*')
            .order('date', { ascending: false });
        if (error) {
            console.error('Error fetching fuel entries:', error);
            return [];
        }
        return data;
    }

    // Vehicle Management Methods
    async renderVehicleManagement() {
        try {
            const vehicles = await this.fetchVehiclesFromSupabase();
            const tableBody = document.getElementById('vehicles-management-body');
            
            if (!tableBody) {
                console.error('Vehicle management table body not found');
                return;
            }

            if (vehicles.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No vehicles found. Add a vehicle to get started.</td></tr>';
                return;
            }

            const vehiclesWithStats = await Promise.all(
                vehicles.map(async (vehicle) => {
                    const { data: records, error } = await supabase
                        .from('fuel_entries')
                        .select('*')
                        .eq('vehicle_id', vehicle.id);
                    
                    const recordCount = error ? 0 : records.length;
                    const lastRecord = records && records.length > 0 ? 
                        records.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
                    const currentOdo = lastRecord ? lastRecord.odo_end : (vehicle.current_odo || 0);

                    return { ...vehicle, recordCount, currentOdo };
                })
            );

            tableBody.innerHTML = vehiclesWithStats.map(vehicle => `
                <tr>
                    <td>${this.getVehicleTypeIcon(vehicle.type)}</td>
                    <td><strong>${vehicle.code}</strong></td>
                    <td>${vehicle.name}</td>
                    <td>${vehicle.make} ${vehicle.model} (${vehicle.year})</td>
                    <td>${vehicle.registration}</td>
                    <td>${vehicle.currentOdo.toFixed(1)} km</td>
                    <td><span class="badge">${vehicle.recordCount}</span></td>
                    <td>
                        <button class="btn btn-small btn-warning" onclick="app.editVehicle(${vehicle.id})">Edit</button>
                        <button class="btn btn-small btn-error" onclick="app.deleteVehicle(${vehicle.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error rendering vehicle management:', error);
            const tableBody = document.getElementById('vehicles-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading vehicles. Please refresh the page.</td></tr>';
            }
        }
    }

    // Driver Management Methods
    async renderDriverManagement() {
        try {
            const drivers = await this.fetchDriversFromSupabase();
            const tableBody = document.getElementById('drivers-management-body');
            
            if (!tableBody) {
                console.error('Driver management table body not found');
                return;
            }

            if (drivers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No drivers found. Add a driver to get started.</td></tr>';
                return;
            }

            const driversWithStats = await Promise.all(
                drivers.map(async (driver) => {
                    const { data: records, error } = await supabase
                        .from('fuel_entries')
                        .select('*')
                        .eq('driver_id', driver.id);
                    
                    const recordCount = error ? 0 : records.length;
                    return { ...driver, recordCount };
                })
            );

            tableBody.innerHTML = driversWithStats.map(driver => `
                <tr>
                    <td><strong>${driver.code}</strong></td>
                    <td>${driver.name}</td>
                    <td>${driver.license_number || 'N/A'}</td>
                    <td>${driver.phone || 'N/A'}</td>
                    <td>${driver.email || 'N/A'}</td>
                    <td><span class="badge">${driver.recordCount}</span></td>
                    <td>
                        <button class="btn btn-small btn-warning" onclick="app.editDriver(${driver.id})">Edit</button>
                        <button class="btn btn-small btn-error" onclick="app.deleteDriver(${driver.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error rendering driver management:', error);
            const tableBody = document.getElementById('drivers-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading drivers. Please refresh the page.</td></tr>';
            }
        }
    }

    // Vehicle Modal Methods
    showVehicleModal(vehicleId = null) {
        const modal = document.getElementById('vehicle-modal');
        const title = document.getElementById('vehicle-modal-title');
        const form = document.getElementById('vehicle-form');
        
        if (vehicleId) {
            title.textContent = 'Edit Vehicle';
            this.loadVehicleForEdit(vehicleId);
        } else {
            title.textContent = 'Add Vehicle';
            form.reset();
            document.getElementById('vehicle-id').value = '';
        }
        
        modal.classList.remove('hidden');
    }

    hideVehicleModal() {
        document.getElementById('vehicle-modal').classList.add('hidden');
        document.getElementById('vehicle-form').reset();
    }

    async loadVehicleForEdit(vehicleId) {
        try {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
                
            if (error) {
                console.error('Error loading vehicle for edit:', error);
                alert('Error loading vehicle data.');
                return;
            }
            
            // Populate form fields
            document.getElementById('vehicle-id').value = vehicle.id;
            document.getElementById('vehicle-code').value = vehicle.code;
            document.getElementById('vehicle-name').value = vehicle.name;
            document.getElementById('vehicle-make').value = vehicle.make;
            document.getElementById('vehicle-model').value = vehicle.model;
            document.getElementById('vehicle-year').value = vehicle.year;
            document.getElementById('vehicle-registration').value = vehicle.registration;
            document.getElementById('vehicle-type').value = vehicle.type;
            document.getElementById('vehicle-value').value = vehicle.value || '';
            document.getElementById('current-odo').value = vehicle.current_odo || '';
            document.getElementById('vehicle-description').value = vehicle.description || '';
            document.getElementById('license-details').value = vehicle.license_details || '';
        } catch (error) {
            console.error('Error loading vehicle for edit:', error);
            alert('Error loading vehicle data.');
        }
    }

    async handleVehicleFormSubmit(e) {
        e.preventDefault();
        
        const vehicleId = document.getElementById('vehicle-id').value;
        const vehicleData = {
            code: document.getElementById('vehicle-code').value,
            name: document.getElementById('vehicle-name').value,
            make: document.getElementById('vehicle-make').value,
            model: document.getElementById('vehicle-model').value,
            year: parseInt(document.getElementById('vehicle-year').value),
            registration: document.getElementById('vehicle-registration').value,
            type: document.getElementById('vehicle-type').value,
            value: parseFloat(document.getElementById('vehicle-value').value) || null,
            current_odo: parseFloat(document.getElementById('current-odo').value) || 0,
            description: document.getElementById('vehicle-description').value || null,
            license_details: document.getElementById('license-details').value || null
        };
        
        try {
            let error;
            if (vehicleId) {
                // Update existing vehicle
                const result = await supabase
                    .from('vehicles')
                    .update(vehicleData)
                    .eq('id', vehicleId);
                error = result.error;
            } else {
                // Insert new vehicle
                const result = await supabase
                    .from('vehicles')
                    .insert([vehicleData]);
                error = result.error;
            }
            
            if (error) {
                console.error('Error saving vehicle:', error);
                alert('Error saving vehicle: ' + error.message);
                return;
            }
            
            alert(vehicleId ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
            this.hideVehicleModal();
            await this.renderVehicleManagement();
            await this.renderVehicles(); // Refresh fuel entry vehicles list
            
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Error saving vehicle. Please try again.');
        }
    }

    async editVehicle(vehicleId) {
        this.showVehicleModal(vehicleId);
    }

    async deleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle? This will also delete all associated fuel records.')) {
            return;
        }
        
        try {
            // First delete associated fuel entries
            const { error: fuelError } = await supabase
                .from('fuel_entries')
                .delete()
                .eq('vehicle_id', vehicleId);
                
            if (fuelError) {
                console.error('Error deleting fuel entries:', fuelError);
                alert('Error deleting associated fuel records.');
                return;
            }
            
            // Then delete the vehicle
            const { error: vehicleError } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicleId);
                
            if (vehicleError) {
                console.error('Error deleting vehicle:', vehicleError);
                alert('Error deleting vehicle.');
                return;
            }
            
            alert('Vehicle and associated records deleted successfully!');
            await this.renderVehicleManagement();
            await this.renderVehicles(); // Refresh fuel entry vehicles list
            
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Error deleting vehicle. Please try again.');
        }
    }

    // Driver Modal Methods
    showDriverModal(driverId = null) {
        const modal = document.getElementById('driver-modal');
        const title = document.getElementById('driver-modal-title');
        const form = document.getElementById('driver-form');
        
        if (driverId) {
            title.textContent = 'Edit Driver';
            this.loadDriverForEdit(driverId);
        } else {
            title.textContent = 'Add Driver';
            form.reset();
            document.getElementById('driver-id').value = '';
        }
        
        modal.classList.remove('hidden');
    }

    hideDriverModal() {
        document.getElementById('driver-modal').classList.add('hidden');
        document.getElementById('driver-form').reset();
    }

    async loadDriverForEdit(driverId) {
        try {
            const { data: driver, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('id', driverId)
                .single();
                
            if (error) {
                console.error('Error loading driver for edit:', error);
                alert('Error loading driver data.');
                return;
            }
            
            // Populate form fields
            document.getElementById('driver-id').value = driver.id;
            document.getElementById('driver-code-input').value = driver.code;
            document.getElementById('driver-name-input').value = driver.name;
            document.getElementById('driver-license').value = driver.license_number || '';
            document.getElementById('driver-phone').value = driver.phone || '';
            document.getElementById('driver-email').value = driver.email || '';
            document.getElementById('driver-notes').value = driver.notes || '';
        } catch (error) {
            console.error('Error loading driver for edit:', error);
            alert('Error loading driver data.');
        }
    }

    async handleDriverFormSubmit(e) {
        e.preventDefault();
        
        const driverId = document.getElementById('driver-id').value;
        const driverData = {
            code: document.getElementById('driver-code-input').value,
            name: document.getElementById('driver-name-input').value,
            license_number: document.getElementById('driver-license').value || null,
            phone: document.getElementById('driver-phone').value || null,
            email: document.getElementById('driver-email').value || null,
            notes: document.getElementById('driver-notes').value || null
        };
        
        try {
            let error;
            if (driverId) {
                // Update existing driver
                const result = await supabase
                    .from('drivers')
                    .update(driverData)
                    .eq('id', driverId);
                error = result.error;
            } else {
                // Insert new driver
                const result = await supabase
                    .from('drivers')
                    .insert([driverData]);
                error = result.error;
            }
            
            if (error) {
                console.error('Error saving driver:', error);
                alert('Error saving driver: ' + error.message);
                return;
            }
            
            alert(driverId ? 'Driver updated successfully!' : 'Driver added successfully!');
            this.hideDriverModal();
            await this.renderDriverManagement();
            await this.renderDrivers(); // Refresh fuel entry drivers list
            
        } catch (error) {
            console.error('Error saving driver:', error);
            alert('Error saving driver. Please try again.');
        }
    }

    async editDriver(driverId) {
        this.showDriverModal(driverId);
    }

    async deleteDriver(driverId) {
        if (!confirm('Are you sure you want to delete this driver? This will also delete all associated fuel records.')) {
            return;
        }
        
        try {
            // First delete associated fuel entries
            const { error: fuelError } = await supabase
                .from('fuel_entries')
                .delete()
                .eq('driver_id', driverId);
                
            if (fuelError) {
                console.error('Error deleting fuel entries:', fuelError);
                alert('Error deleting associated fuel records.');
                return;
            }
            
            // Then delete the driver
            const { error: driverError } = await supabase
                .from('drivers')
                .delete()
                .eq('id', driverId);
                
            if (driverError) {
                console.error('Error deleting driver:', driverError);
                alert('Error deleting driver.');
                return;
            }
            
            alert('Driver and associated records deleted successfully!');
            await this.renderDriverManagement();
            await this.renderDrivers(); // Refresh fuel entry drivers list
            
        } catch (error) {
            console.error('Error deleting driver:', error);
            alert('Error deleting driver. Please try again.');
        }
    }

    // Dashboard Methods
    async updateDashboard() {
        await this.calculateStats();
        await this.renderVehicleSummary();
        await this.renderRecentRecords();
        await this.renderConsumptionChart();
        await this.renderActivityCalendar();
    }

    async calculateStats() {
        try {
            const { data: fuelEntries, error } = await supabase
                .from('fuel_entries')
                .select('*');
                
            if (error) {
                console.error('Error fetching fuel entries for stats:', error);
                return;
            }

            const totalFuel = fuelEntries.reduce((sum, entry) => sum + (entry.litres_used || 0), 0);
            const totalDistance = fuelEntries.reduce((sum, entry) => sum + (entry.distance || 0), 0);
            const avgConsumption = totalDistance > 0 ? (totalFuel / totalDistance) * 100 : 0;

            const { data: vehicles, error: vehicleError } = await supabase
                .from('vehicles')
                .select('id');
                
            const activeVehicles = vehicleError ? 0 : vehicles.length;

            document.getElementById('total-fuel').textContent = `${totalFuel.toFixed(1)} L`;
            document.getElementById('total-distance').textContent = `${totalDistance.toFixed(1)} km`;
            document.getElementById('avg-consumption').textContent = `${avgConsumption.toFixed(2)} L/100km`;
            document.getElementById('active-vehicles').textContent = activeVehicles;
        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    }

    async renderVehicleSummary() {
        try {
            const { data: fuelEntries, error } = await supabase
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, make, model, year, registration)
                `);
                
            if (error) {
                console.error('Error fetching fuel entries for vehicle summary:', error);
                return;
            }

            const vehicleStats = {};
            fuelEntries.forEach(entry => {
                if (!entry.vehicles) return;
                
                const vehicleKey = entry.vehicle_id;
                if (!vehicleStats[vehicleKey]) {
                    vehicleStats[vehicleKey] = {
                        vehicle: entry.vehicles,
                        totalFuel: 0,
                        totalDistance: 0,
                        recordCount: 0
                    };
                }
                
                vehicleStats[vehicleKey].totalFuel += entry.litres_used || 0;
                vehicleStats[vehicleKey].totalDistance += entry.distance || 0;
                vehicleStats[vehicleKey].recordCount++;
            });

            const summaryTable = document.getElementById('vehicle-summary-table');
            if (summaryTable) {
                const summaryHTML = Object.values(vehicleStats).map(stat => {
                    const avgConsumption = stat.totalDistance > 0 ? 
                        (stat.totalFuel / stat.totalDistance) * 100 : 0;
                    
                    return `
                        <div class="summary-row">
                            <div class="summary-vehicle">
                                <strong>${stat.vehicle.code}</strong> - ${stat.vehicle.name}
                            </div>
                            <div class="summary-stats">
                                <span>${stat.totalFuel.toFixed(1)}L</span>
                                <span>${stat.totalDistance.toFixed(1)}km</span>
                                <span>${avgConsumption.toFixed(2)}L/100km</span>
                                <span class="badge">${stat.recordCount}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                
                summaryTable.innerHTML = summaryHTML || '<p>No vehicle data available.</p>';
            }
        } catch (error) {
            console.error('Error rendering vehicle summary:', error);
        }
    }

    async renderRecentRecords() {
        try {
            const { data: recentEntries, error } = await supabase
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name),
                    drivers (code, name)
                `)
                .order('date', { ascending: false })
                .limit(10);
                
            if (error) {
                console.error('Error fetching recent records:', error);
                return;
            }

            const recentTable = document.getElementById('recent-records-table');
            if (recentTable) {
                if (recentEntries.length === 0) {
                    recentTable.innerHTML = '<p>No fuel records found.</p>';
                    return;
                }
                
                const tableHTML = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Vehicle</th>
                                <th>Driver</th>
                                <th>Activity</th>
                                <th>Fuel</th>
                                <th>Distance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentEntries.map(entry => `
                                <tr>
                                    <td>${new Date(entry.date).toLocaleDateString()}</td>
                                    <td>${entry.vehicles?.code || 'N/A'}</td>
                                    <td>${entry.drivers?.code || 'N/A'}</td>
                                    <td>${entry.activity?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</td>
                                    <td>${entry.litres_used?.toFixed(1) || 0}L</td>
                                    <td>${entry.distance?.toFixed(1) || 0}km</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                
                recentTable.innerHTML = tableHTML;
            }
        } catch (error) {
            console.error('Error rendering recent records:', error);
        }
    }

    async renderConsumptionChart() {
        // Placeholder for chart rendering - would implement with Chart.js or similar
        console.log('Chart rendering would be implemented here');
    }

    async renderActivityCalendar() {
        try {
            const { data: entries, error } = await supabase
                .from('fuel_entries')
                .select('date')
                .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                
            if (error) {
                console.error('Error fetching activity calendar data:', error);
                return;
            }

            const activityCounts = {};
            entries.forEach(entry => {
                const date = entry.date;
                activityCounts[date] = (activityCounts[date] || 0) + 1;
            });

            const calendarGrid = document.getElementById('activity-calendar-grid');
            if (calendarGrid) {
                // Generate last 90 days
                const days = [];
                for (let i = 89; i >= 0; i--) {
                    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                    const dateStr = date.toISOString().split('T')[0];
                    const count = activityCounts[dateStr] || 0;
                    
                    let level = 0;
                    if (count >= 7) level = 4;
                    else if (count >= 5) level = 3;
                    else if (count >= 3) level = 2;
                    else if (count >= 1) level = 1;
                    
                    days.push(`<div class="calendar-cell level-${level}" title="${dateStr}: ${count} records"></div>`);
                }
                
                calendarGrid.innerHTML = days.join('');
            }
        } catch (error) {
            console.error('Error rendering activity calendar:', error);
        }
    }

    // Export Methods
    async exportMonthlyReport() {
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
        
        await this.exportReport(startDate, endDate, 'monthly');
    }

    async exportAnnualReport() {
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), 0, 1).toISOString().split('T')[0];
        const endDate = new Date(currentDate.getFullYear(), 11, 31).toISOString().split('T')[0];
        
        await this.exportReport(startDate, endDate, 'annual');
    }

    async exportReport(startDate, endDate, reportType) {
        try {
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, make, model, year, registration),
                    drivers (code, name)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true });
                
            if (error) {
                console.error('Error fetching export data:', error);
                alert('Error fetching data for export.');
                return;
            }

            if (records.length === 0) {
                alert('No records found for the selected period.');
                return;
            }

            // Generate PDF using jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add company header
            doc.setFontSize(18);
            doc.text('KCT Farming Pty Ltd', 105, 20, { align: 'center' });
            
            doc.setFontSize(14);
            const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Fuel Report`;
            doc.text(reportTitle, 105, 30, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(`Period: ${startDate} to ${endDate}`, 105, 40, { align: 'center' });
            
            // Add table headers
            let yPosition = 60;
            doc.setFontSize(10);
            doc.text('Date', 10, yPosition);
            doc.text('Vehicle', 30, yPosition);
            doc.text('Driver', 60, yPosition);
            doc.text('Activity', 90, yPosition);
            doc.text('Fuel (L)', 130, yPosition);
            doc.text('Distance (km)', 160, yPosition);
            doc.text('Consumption', 190, yPosition);
            
            // Add data rows
            yPosition += 10;
            records.forEach(record => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.text(new Date(record.date).toLocaleDateString(), 10, yPosition);
                doc.text(record.vehicles?.code || 'N/A', 30, yPosition);
                doc.text(record.drivers?.code || 'N/A', 60, yPosition);
                doc.text((record.activity || '').replace('-', ' '), 90, yPosition);
                doc.text((record.litres_used || 0).toFixed(1), 130, yPosition);
                doc.text((record.distance || 0).toFixed(1), 160, yPosition);
                doc.text(record.distance > 0 ? ((record.litres_used / record.distance) * 100).toFixed(2) : 'N/A', 190, yPosition);
                
                yPosition += 8;
            });
            
            // Save the PDF
            const filename = `fuel-report-${reportType}-${startDate}-to-${endDate}.pdf`;
            doc.save(filename);

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report. Please try again.');
        }
    }

    async exportCaneProFormat() {
        try {
            // Get date range for current month
            const currentDate = new Date();
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, make, model, year, registration),
                    drivers (code, name)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true });
                
            if (error) {
                console.error('Error fetching CanePro export data:', error);
                alert('Error fetching data for CanePro export.');
                return;
            }

            if (records.length === 0) {
                alert('No records found for the current month.');
                return;
            }

            // Create Excel workbook using SheetJS
            const wb = XLSX.utils.book_new();
            const ws = {};
            
            // Set title with date range
            const reportTitle = `Daily Vehicle Capture ${startDate.replace(/-/g, '')} to ${endDate.replace(/-/g, '')}`;
            ws['A1'] = { v: reportTitle, t: 's' };
            
            // Set headers (row 3)
            ws['A3'] = { v: 'Date', t: 's' };
            ws['B3'] = { v: 'Vehicle', t: 's' };
            ws['C3'] = { v: 'Field', t: 's' };
            ws['D3'] = { v: 'Activity', t: 's' };
            ws['E3'] = { v: 'Fuel', t: 's' };
            ws['F3'] = { v: 'HrsKm', t: 's' };
            ws['G3'] = { v: 'Odo. End', t: 's' };
            ws['H3'] = { v: 'Store', t: 's' };
            ws['I3'] = { v: 'Issue No.', t: 's' };
            ws['J3'] = { v: 'Tons', t: 's' };
            ws['K3'] = { v: 'Driver', t: 's' };
            
            // Add data rows starting from row 4
            let rowIndex = 4;
            records.forEach(record => {
                const cellRow = rowIndex.toString();
                
                ws[`A${cellRow}`] = { v: new Date(record.date).toLocaleDateString(), t: 's' };
                ws[`B${cellRow}`] = { v: record.vehicles?.code || '', t: 's' };
                ws[`C${cellRow}`] = { v: record.field_name || '', t: 's' };
                ws[`D${cellRow}`] = { v: this.mapActivityToCode(record.activity), t: 's' };
                ws[`E${cellRow}`] = { v: record.litres_used || 0, t: 'n' };
                ws[`F${cellRow}`] = { v: record.distance || 0, t: 'n' };
                ws[`G${cellRow}`] = { v: record.odo_end || 0, t: 'n' };
                ws[`H${cellRow}`] = { v: '', t: 's' }; // Store - empty
                ws[`I${cellRow}`] = { v: '', t: 's' }; // Issue No. - empty
                ws[`J${cellRow}`] = { v: 0, t: 'n' }; // Tons - empty
                ws[`K${cellRow}`] = { v: record.drivers?.code || '', t: 's' };
                
                rowIndex++;
            });
            
            // Set worksheet range
            ws['!ref'] = `A1:K${rowIndex - 1}`;
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Capture');
            
            // Generate filename
            const filename = `DailyVehicleCapture_${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}.xls`;
            
            // Save file
            XLSX.writeFile(wb, filename);
            
        } catch (error) {
            console.error('Error generating CanePro export:', error);
            alert('Error generating CanePro export. Please try again.');
        }
    }

    mapActivityToCode(activity) {
        // Map activity types to codes like in the Excel file
        const activityMap = {
            'field-preparation': 'VG2',
            'harvesting': 'VC1', 
            'transport': 'M1',
            'maintenance': 'M2',
            'loading': 'M3',
            'delivery': 'M4',
            'site-visit': 'A1',
            'client-meeting': 'A2',
            'inspection': 'A3',
            'construction': 'C11b',
            'emergency': 'A9',
            'planting': 'C9b',
            'other': 'All'
        };
        return activityMap[activity] || activity;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing Fleet Manager');
    try {
        window.app = new FleetManager();
    } catch (error) {
        console.error('Failed to initialize Fleet Manager:', error);
        alert('Failed to initialize the application. Please refresh the page.');
    }
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

  } catch (error) {
    console.error('Failed to initialize application:', error);
    alert('Failed to load application configuration. Please check your connection and try again.');
  }
})();