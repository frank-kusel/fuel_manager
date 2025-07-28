// --- Supabase configuration ---
// Direct configuration for production deployment
const SUPABASE_URL = 'https://szskplrwmeuahwvicyos.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c2twbHJ3bWV1YWh3dmljeW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDkzMTEsImV4cCI6MjA2OTI4NTMxMX0.phbhjcVVF-ENJn167Pd0XxlF_VicDcJW7id5K8Vy7Mc';

// --- Supabase client initialization ---
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

    async updateVehicle(vehicleId, updateObj) {
        const { error } = await supabase.from('vehicles').update(updateObj).eq('id', vehicleId);
        if (error) {
            console.error('Error updating vehicle:', error);
            alert('Error updating vehicle.');
        } else {
            alert('Vehicle updated!');
            await this.renderVehicles();
        }
    }

    async deleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
        if (error) {
            console.error('Error deleting vehicle:', error);
            alert('Error deleting vehicle.');
        } else {
            alert('Vehicle deleted!');
            await this.renderVehicles();
        }
    }

    async fetchDriversFromSupabase() {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .order('id', { ascending: true });
        if (error) {
            console.error('Error fetching drivers:', error);
            return [];
        }
        return data;
    }

    async addDriver(driverObj) {
        const { error } = await supabase.from('drivers').insert([driverObj]);
        if (error) {
            console.error('Error adding driver:', error);
            alert('Error adding driver.');
        } else {
            alert('Driver added!');
            await this.renderDrivers();
        }
    }

    async updateDriver(driverId, updateObj) {
        const { error } = await supabase.from('drivers').update(updateObj).eq('id', driverId);
        if (error) {
            console.error('Error updating driver:', error);
            alert('Error updating driver.');
        } else {
            alert('Driver updated!');
            await this.renderDrivers();
        }
    }

    async deleteDriver(driverId) {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        const { error } = await supabase.from('drivers').delete().eq('id', driverId);
        if (error) {
            console.error('Error deleting driver:', error);
            alert('Error deleting driver.');
        } else {
            alert('Driver deleted!');
            await this.renderDrivers();
        }
    }

    async fetchFuelEntriesFromSupabase() {
        const { data, error } = await supabase
            .from('fuel_entries')
            .select('*')
            .order('id', { ascending: true });
        if (error) {
            console.error('Error fetching fuel entries:', error);
            return [];
        }
        return data;
    }

    async addFuelEntry(entryObj) {
        const { error } = await supabase.from('fuel_entries').insert([entryObj]);
        if (error) {
            console.error('Error adding fuel entry:', error);
            alert('Error adding fuel entry.');
        } else {
            alert('Fuel entry added!');
            await this.renderFuelEntries();
        }
    }

    async updateFuelEntry(entryId, updateObj) {
        const { error } = await supabase.from('fuel_entries').update(updateObj).eq('id', entryId);
        if (error) {
            console.error('Error updating fuel entry:', error);
            alert('Error updating fuel entry.');
        } else {
            alert('Fuel entry updated!');
            await this.renderFuelEntries();
        }
    }

    async deleteFuelEntry(entryId) {
        if (!confirm('Are you sure you want to delete this fuel entry?')) return;
        const { error } = await supabase.from('fuel_entries').delete().eq('id', entryId);
        if (error) {
            console.error('Error deleting fuel entry:', error);
            alert('Error deleting fuel entry.');
        } else {
            alert('Fuel entry deleted!');
            await this.renderFuelEntries();
        }
    }
    // --- END SUPABASE CRUD METHODS ---
}
// --- END FleetManager class ---

// (Optional) App initialization code here, if needed.

                        <strong>${this.currentDriver.code}</strong> - ${this.currentDriver.name}<br>
                        <small>${this.currentDriver.license_number || 'No license on file'}</small>
                    `;
                } else {
                    console.error('selected-driver-info element not found');
                }
                
        } catch (error) {
            console.error('Error selecting driver:', error);
            alert('Error selecting driver. Please try again.');
        }
    }

    handleGaugeBroken() {
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        const odoStartInput = document.getElementById('odo-start');
        const odoEndInput = document.getElementById('odo-end');
        
        if (gaugeBroken) {
            // Set end odo to same as start odo and disable end odo input
            odoEndInput.value = odoStartInput.value;
            odoEndInput.disabled = true;
            odoEndInput.style.background = 'var(--gray-200)';
            
            // Clear fuel consumption since we can't calculate it
            document.getElementById('fuel-consumption').value = 'N/A (Gauge Broken)';
        } else {
            // Re-enable end odo input
            odoEndInput.disabled = false;
            odoEndInput.style.background = '';
            this.calculateConsumption();
        }
    }

    nextToFuelData() {
        const activity = document.getElementById('activity').value;
        const fieldName = document.getElementById('field-name').value;
        
        if (!activity || !fieldName) {
            alert('Please select both activity and field');
            return;
        }
        
        // Update activity info display
        const activityInfo = document.getElementById('selected-activity-info');
        if (activityInfo) {
            activityInfo.innerHTML = `
                <strong>${this.formatActivity(activity)}</strong><br>
                <small>${fieldName}</small>
            `;
        }
        
        // Copy vehicle info to second display
        const vehicleInfo2 = document.getElementById('selected-vehicle-info-2');
        const vehicleInfo1 = document.getElementById('selected-vehicle-info');
        if (vehicleInfo2 && vehicleInfo1) {
            vehicleInfo2.innerHTML = vehicleInfo1.innerHTML;
        }
        
        this.showStep('fuel-data');
    }
    
    nextToReview() {
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        
        if (!odoStart || !litresUsed) {
            alert('Please fill in odometer start and litres used');
            return;
        }
        
        if (!gaugeBroken && (!odoEnd || odoEnd <= odoStart)) {
            alert('Please enter a valid end odometer reading');
            return;
        }
        
        // Generate review summary
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
        
        const actualOdoEnd = gaugeBroken ? odoStart : odoEnd;
        const distance = actualOdoEnd - odoStart;
        const consumption = gaugeBroken ? 0 : (distance > 0 && litresUsed > 0) ? (litresUsed / distance) * 100 : 0;
        
        const reviewSummary = document.getElementById('review-summary');
        if (reviewSummary) {
            reviewSummary.innerHTML = `
                <div class="review-summary">
                    <h3>Record Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <strong>Vehicle:</strong> ${this.currentVehicle.code} - ${this.currentVehicle.name}
                        </div>
                        <div class="summary-item">
                            <strong>Driver:</strong> ${this.currentDriver.code} - ${this.currentDriver.name}
                        </div>
                        <div class="summary-item">
                            <strong>Activity:</strong> ${this.formatActivity(activity)}
                        </div>
                        <div class="summary-item">
                            <strong>Field:</strong> ${fieldName}
                        </div>
                        <div class="summary-item">
                            <strong>Distance:</strong> ${distance.toFixed(1)} km
                        </div>
                        <div class="summary-item">
                            <strong>Fuel Used:</strong> ${litresUsed.toFixed(1)} L
                        </div>
                        <div class="summary-item">
                            <strong>Consumption:</strong> ${gaugeBroken ? 'N/A (Gauge Broken)' : consumption.toFixed(2) + ' L/100km'}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    calculateConsumption() {
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        
        if (gaugeBroken) {
            document.getElementById('fuel-consumption').value = 'N/A (Gauge Broken)';
            return;
        }
        
        const odoStart = parseFloat(document.getElementById('odo-start').value) || 0;
        const odoEnd = parseFloat(document.getElementById('odo-end').value) || 0;
        const litresUsed = parseFloat(document.getElementById('litres-used').value) || 0;

        if (odoEnd > odoStart && litresUsed > 0) {
            const distance = odoEnd - odoStart;
            const consumption = (litresUsed / distance) * 100;
            document.getElementById('fuel-consumption').value = consumption.toFixed(2);
        } else {
            document.getElementById('fuel-consumption').value = '';
        }
    }

    async saveFuelRecord() {
        console.log('Saving fuel record to Supabase');
        
        // Check if we have selected vehicle and driver
        if (!this.currentVehicle) {
            alert('Please select a vehicle first');
            return;
        }
        
        if (!this.currentDriver) {
            alert('Please select a driver first');
            return;
        }
        
        try {
            const gaugeBroken = document.getElementById('gauge-broken').checked;
            const needsReview = document.getElementById('needs-review').checked;
            const odoStart = parseFloat(document.getElementById('odo-start').value);
            let odoEnd = parseFloat(document.getElementById('odo-end').value);
            const litresUsed = parseFloat(document.getElementById('litres-used').value);
            const activity = document.getElementById('activity').value;
            const fieldName = document.getElementById('field-name').value;
            const date = document.getElementById('date').value;

            console.log('Form data:', { odoStart, odoEnd, litresUsed, activity, fieldName, date });

            // Validate required fields
            if (!activity || !fieldName || !date) {
                alert('Please fill in all required fields');
                return;
            }

            if (isNaN(odoStart) || isNaN(litresUsed)) {
                alert('Please enter valid numbers for odometer readings and fuel amount');
                return;
            }

            // Handle gauge broken case
            if (gaugeBroken) {
                odoEnd = odoStart; // Use start odo as end odo
            } else {
                // Normal validation
                if (!odoEnd || odoEnd <= odoStart) {
                    alert('End odometer reading must be greater than start reading');
                    return;
                }
            }

            const distance = odoEnd - odoStart;
            const consumption = gaugeBroken ? 0 : (distance > 0 && litresUsed > 0) ? (litresUsed / distance) * 100 : 0;

            // Create fuel entry object for Supabase
            const fuelEntry = {
                vehicle_id: this.currentVehicle.id,
                driver_id: this.currentDriver.id,
                activity: activity,
                field_name: fieldName,
                odo_start: odoStart,
                odo_end: odoEnd,
                distance: distance,
                litres_used: litresUsed,
                fuel_consumption: consumption,
                gauge_broken: gaugeBroken,
                needs_review: needsReview,
                date: date
            };

            console.log('Saving to Supabase:', fuelEntry);

            // Insert into Supabase
            const { data, error } = await supabase
                .from('fuel_entries')
                .insert([fuelEntry])
                .select();

            if (error) {
                console.error('Supabase error:', error);
                alert('Error saving fuel record to database: ' + error.message);
                return;
            }

            console.log('Record saved successfully to Supabase:', data);
            
            const message = needsReview ? 
                'Fuel record saved and flagged for review!' : 
                'Fuel record saved successfully!';
            alert(message);
            
            this.resetFuelForm();
            
        } catch (error) {
            console.error('Error saving fuel record:', error);
            alert('Error saving fuel record: ' + error.message);
        }
    }

    resetFuelForm() {
        // Reset all form fields
        ['activity', 'field-name', 'odo-start', 'odo-end', 'litres-used', 'fuel-consumption', 'date'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'select-one') {
                    element.selectedIndex = 0;
                } else {
                    element.value = '';
                }
            }
        });
        
        document.getElementById('gauge-broken').checked = false;
        document.getElementById('needs-review').checked = false;
        document.getElementById('odo-end').disabled = false;
        document.getElementById('odo-end').style.background = '';
        
        // Clear info displays
        ['selected-vehicle-info', 'selected-driver-info', 'selected-vehicle-info-2', 'selected-activity-info', 'review-summary'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = '';
        });
        
        // Clear selections
        if (this.selectedVehicleRow) {
            this.selectedVehicleRow.classList.remove('selected');
            this.selectedVehicleRow = null;
        }
        if (this.selectedDriverRow) {
            this.selectedDriverRow.classList.remove('selected');
            this.selectedDriverRow = null;
        }
        
        this.currentVehicle = null;
        this.currentDriver = null;
        this.showStep('vehicle');
        this.setDefaultDate();
    }

    cancelFuelEntry() {
        this.resetFuelForm();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // Vehicle Management
    async renderVehicleManagement() {
        try {
            // Get vehicles from Supabase
            const { data: vehicles, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .order('code', { ascending: true });

            if (vehiclesError) {
                console.error('Error fetching vehicles:', vehiclesError);
                return;
            }

            // Get fuel records statistics for each vehicle
            const vehiclesWithStats = await Promise.all(
                vehicles.map(async (vehicle) => {
                    const { data: fuelRecords, error: recordsError } = await supabase
                        .from('fuel_entries')
                        .select('distance, litres_used')
                        .eq('vehicle_id', vehicle.id);

                    if (recordsError) {
                        console.error('Error fetching fuel records for vehicle:', recordsError);
                        return {
                            ...vehicle,
                            total_records: 0,
                            total_distance: 0,
                            total_fuel: 0
                        };
                    }

                    return {
                        ...vehicle,
                        total_records: fuelRecords.length,
                        total_distance: fuelRecords.reduce((sum, r) => sum + r.distance, 0),
                        total_fuel: fuelRecords.reduce((sum, r) => sum + r.litres_used, 0)
                    };
                })
            );

            const tableBody = document.getElementById('vehicles-management-body');
            tableBody.innerHTML = vehiclesWithStats.map(vehicle => `
            <tr class="vehicle-type-${vehicle.type}">
                <td>
                    <div class="vehicle-type-indicator"></div>
                    ${this.getVehicleTypeIcon(vehicle.type)}
                </td>
                <td><strong>${vehicle.code}</strong></td>
                <td>${vehicle.name}</td>
                <td>${vehicle.make} ${vehicle.model} (${vehicle.year})</td>
                <td>${vehicle.registration}</td>
                <td>${(vehicle.current_odo || 0).toFixed(1)} km</td>
                <td>${vehicle.total_records}</td>
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

    showVehicleModal(vehicleData = null) {
        const modal = document.getElementById('vehicle-modal');
        const title = document.getElementById('vehicle-modal-title');
        const form = document.getElementById('vehicle-form');
        
        if (vehicleData) {
            title.textContent = 'Edit Vehicle';
            document.getElementById('vehicle-id').value = vehicleData.id;
            document.getElementById('vehicle-code').value = vehicleData.code;
            document.getElementById('vehicle-name').value = vehicleData.name;
            document.getElementById('vehicle-make').value = vehicleData.make;
            document.getElementById('vehicle-model').value = vehicleData.model;
            document.getElementById('vehicle-year').value = vehicleData.year;
            document.getElementById('vehicle-registration').value = vehicleData.registration;
            document.getElementById('vehicle-type').value = vehicleData.type || 'other';
            document.getElementById('vehicle-value').value = vehicleData.value || '';
            document.getElementById('current-odo').value = vehicleData.current_odo || '';
            document.getElementById('vehicle-description').value = vehicleData.description || '';
            document.getElementById('license-details').value = vehicleData.license_details || '';
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

    async handleVehicleFormSubmit(e) {
        e.preventDefault();
        
        const vehicleId = document.getElementById('vehicle-id').value;
        
        const data = {
            code: document.getElementById('vehicle-code').value,
            name: document.getElementById('vehicle-name').value,
            make: document.getElementById('vehicle-make').value,
            model: document.getElementById('vehicle-model').value,
            year: parseInt(document.getElementById('vehicle-year').value),
            registration: document.getElementById('vehicle-registration').value,
            type: document.getElementById('vehicle-type').value,
            value: parseFloat(document.getElementById('vehicle-value').value) || null,
            current_odo: parseFloat(document.getElementById('current-odo').value) || 0,
            description: document.getElementById('vehicle-description').value,
            license_details: document.getElementById('license-details').value
        };

        try {
            let result;
            if (vehicleId) {
                // Update existing vehicle
                const { error } = await supabase
                    .from('vehicles')
                    .update(data)
                    .eq('id', vehicleId);
                    
                if (error) {
                    console.error('Error updating vehicle:', error);
                    alert('Error updating vehicle: ' + error.message);
                    return;
                }
                result = 'updated';
            } else {
                // Insert new vehicle
                const { error } = await supabase
                    .from('vehicles')
                    .insert([data]);
                    
                if (error) {
                    console.error('Error inserting vehicle:', error);
                    alert('Error adding vehicle: ' + error.message);
                    return;
                }
                result = 'added';
            }
            
            this.hideVehicleModal();
            await this.renderVehicleManagement();
            await this.renderVehicles();
            alert(`Vehicle ${result} successfully!`);
            
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Error saving vehicle. Please check that the vehicle code is unique.');
        }
    }

    async editVehicle(vehicleId) {
        try {
            const { data: vehicleData, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
                
            if (error) {
                console.error('Error fetching vehicle:', error);
                alert('Error loading vehicle data: ' + error.message);
                return;
            }
            
            this.showVehicleModal(vehicleData);
        } catch (error) {
            console.error('Error editing vehicle:', error);
            alert('Error loading vehicle data. Please try again.');
        }
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
                alert('Error deleting associated fuel records: ' + fuelError.message);
                return;
            }
            
            // Then delete the vehicle
            const { error: vehicleError } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', vehicleId);
                
            if (vehicleError) {
                console.error('Error deleting vehicle:', vehicleError);
                alert('Error deleting vehicle: ' + vehicleError.message);
                return;
            }
            
            alert('Vehicle deleted successfully!');
            await this.renderVehicleManagement();
            await this.renderVehicles();
            
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Error deleting vehicle. Please try again.');
        }
    }

    // Driver Management
    async renderDriverManagement() {
        try {
            // Get drivers from Supabase
            const { data: drivers, error: driversError } = await supabase
                .from('drivers')
                .select('*')
                .order('code', { ascending: true });

            if (driversError) {
                console.error('Error fetching drivers:', driversError);
                return;
            }

            // Get fuel records statistics for each driver
            const driversWithStats = await Promise.all(
                drivers.map(async (driver) => {
                    const { data: fuelRecords, error: recordsError } = await supabase
                        .from('fuel_entries')
                        .select('distance')
                        .eq('driver_id', driver.id);

                    if (recordsError) {
                        console.error('Error fetching fuel records for driver:', recordsError);
                        return {
                            ...driver,
                            total_records: 0,
                            total_distance: 0
                        };
                    }

                    return {
                        ...driver,
                        total_records: fuelRecords.length,
                        total_distance: fuelRecords.reduce((sum, r) => sum + r.distance, 0)
                    };
                })
            );

            const tableBody = document.getElementById('drivers-management-body');
            tableBody.innerHTML = driversWithStats.map(driver => `
            <tr>
                <td><strong>${driver.code}</strong></td>
                <td>${driver.name}</td>
                <td>${driver.license_number || 'N/A'}</td>
                <td>${driver.phone || 'N/A'}</td>
                <td>${driver.email || 'N/A'}</td>
                <td>${driver.total_records}</td>
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

    showDriverModal(driverData = null) {
        const modal = document.getElementById('driver-modal');
        const title = document.getElementById('driver-modal-title');
        const form = document.getElementById('driver-form');
        
        if (driverData) {
            title.textContent = 'Edit Driver';
            document.getElementById('driver-id').value = driverData.id;
            document.getElementById('driver-code-input').value = driverData.code;
            document.getElementById('driver-name-input').value = driverData.name;
            document.getElementById('driver-license').value = driverData.license_number || '';
            document.getElementById('driver-phone').value = driverData.phone || '';
            document.getElementById('driver-email').value = driverData.email || '';
            document.getElementById('driver-notes').value = driverData.notes || '';
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

    async handleDriverFormSubmit(e) {
        e.preventDefault();
        
        const driverId = document.getElementById('driver-id').value;
        
        const data = {
            code: document.getElementById('driver-code-input').value,
            name: document.getElementById('driver-name-input').value,
            license_number: document.getElementById('driver-license').value,
            phone: document.getElementById('driver-phone').value,
            email: document.getElementById('driver-email').value,
            notes: document.getElementById('driver-notes').value
        };

        try {
            let result;
            if (driverId) {
                // Update existing driver
                const { error } = await supabase
                    .from('drivers')
                    .update(data)
                    .eq('id', driverId);
                    
                if (error) {
                    console.error('Error updating driver:', error);
                    alert('Error updating driver: ' + error.message);
                    return;
                }
                result = 'updated';
            } else {
                // Insert new driver
                const { error } = await supabase
                    .from('drivers')
                    .insert([data]);
                    
                if (error) {
                    console.error('Error inserting driver:', error);
                    alert('Error adding driver: ' + error.message);
                    return;
                }
                result = 'added';
            }
            
            this.hideDriverModal();
            await this.renderDriverManagement();
            await this.renderDrivers();
            alert(`Driver ${result} successfully!`);
            
        } catch (error) {
            console.error('Error saving driver:', error);
            alert('Error saving driver. Please check that the driver code is unique.');
        }
    }

    async editDriver(driverId) {
        try {
            const { data: driverData, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('id', driverId)
                .single();
                
            if (error) {
                console.error('Error fetching driver:', error);
                alert('Error loading driver data: ' + error.message);
                return;
            }
            
            this.showDriverModal(driverData);
        } catch (error) {
            console.error('Error editing driver:', error);
            alert('Error loading driver data. Please try again.');
        }
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
                alert('Error deleting associated fuel records: ' + fuelError.message);
                return;
            }
            
            // Then delete the driver
            const { error: driverError } = await supabase
                .from('drivers')
                .delete()
                .eq('id', driverId);
                
            if (driverError) {
                console.error('Error deleting driver:', driverError);
                alert('Error deleting driver: ' + driverError.message);
                return;
            }
            
            alert('Driver deleted successfully!');
            await this.renderDriverManagement();
            await this.renderDrivers();
            
        } catch (error) {
            console.error('Error deleting driver:', error);
            alert('Error deleting driver. Please try again.');
        }
    }

    // Dashboard and reporting functionality
    async updateDashboard() {
        const stats = await this.calculateStats();
        
        document.getElementById('total-fuel').textContent = `${stats.totalFuel.toFixed(1)} L`;
        document.getElementById('total-distance').textContent = `${stats.totalDistance.toFixed(0)} km`;
        document.getElementById('avg-consumption').textContent = `${stats.avgConsumption.toFixed(1)} L/100km`;
        document.getElementById('active-vehicles').textContent = stats.activeVehicles;

        await this.renderVehicleSummary();
        await this.renderRecentRecords();
        await this.renderConsumptionChart();
        await this.renderActivityCalendar();
    }

    async calculateStats() {
        try {
            const { data: fuelRecords, error } = await supabase
                .from('fuel_entries')
                .select('litres_used, distance, fuel_consumption, gauge_broken, vehicle_id');

            if (error) {
                console.error('Error fetching stats:', error);
                return { totalFuel: 0, totalDistance: 0, avgConsumption: 0, activeVehicles: 0 };
            }

            const stats = {
                totalFuel: fuelRecords
                    .filter(r => !r.gauge_broken)
                    .reduce((sum, r) => sum + r.litres_used, 0),
                totalDistance: fuelRecords
                    .reduce((sum, r) => sum + r.distance, 0),
                activeVehicles: new Set(fuelRecords.map(r => r.vehicle_id)).size,
                avgConsumption: 0
            };

            const validConsumptionRecords = fuelRecords.filter(r => 
                !r.gauge_broken && r.fuel_consumption > 0
            );

            if (validConsumptionRecords.length > 0) {
                stats.avgConsumption = validConsumptionRecords
                    .reduce((sum, r) => sum + r.fuel_consumption, 0) / validConsumptionRecords.length;
            }

            return stats;
        } catch (error) {
            console.error('Error calculating stats:', error);
            return { totalFuel: 0, totalDistance: 0, avgConsumption: 0, activeVehicles: 0 };
        }
    }

    async renderVehicleSummary() {
        try {
            // Get vehicles from Supabase
            const { data: vehicles, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .order('type', { ascending: true })
                .order('code', { ascending: true });

            if (vehiclesError) {
                console.error('Error fetching vehicles for summary:', vehiclesError);
                return;
            }

            // Get fuel entries statistics for each vehicle
            const vehiclesWithStats = await Promise.all(
                vehicles.map(async (vehicle) => {
                    const { data: fuelRecords, error: recordsError } = await supabase
                        .from('fuel_entries')
                        .select('distance, litres_used, fuel_consumption, gauge_broken, needs_review')
                        .eq('vehicle_id', vehicle.id);

                    if (recordsError) {
                        console.error('Error fetching fuel records for vehicle:', recordsError);
                        return {
                            ...vehicle,
                            record_count: 0,
                            total_distance: 0,
                            total_fuel: 0,
                            avg_consumption: 0,
                            review_count: 0
                        };
                    }

                    const totalFuel = fuelRecords
                        .filter(r => !r.gauge_broken)
                        .reduce((sum, r) => sum + r.litres_used, 0);

                    const validConsumptionRecords = fuelRecords.filter(r => 
                        !r.gauge_broken && r.fuel_consumption > 0
                    );

                    const avgConsumption = validConsumptionRecords.length > 0 ?
                        validConsumptionRecords.reduce((sum, r) => sum + r.fuel_consumption, 0) / validConsumptionRecords.length : 0;

                    return {
                        ...vehicle,
                        record_count: fuelRecords.length,
                        total_distance: fuelRecords.reduce((sum, r) => sum + r.distance, 0),
                        total_fuel: totalFuel,
                        avg_consumption: avgConsumption,
                        review_count: fuelRecords.filter(r => r.needs_review).length
                    };
                })
            );

            const container = document.getElementById('vehicle-summary-table');
            container.innerHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Vehicle</th>
                                <th>Records</th>
                                <th>Distance (km)</th>
                                <th>Fuel (L)</th>
                                <th>Avg Consumption</th>
                                <th>Needs Review</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vehiclesWithStats.map(vehicle => `
                                <tr class="vehicle-type-${vehicle.type}">
                                    <td>
                                        <div class="vehicle-type-indicator"></div>
                                        ${vehicle.code} - ${vehicle.name}
                                    </td>
                                    <td>${vehicle.record_count}</td>
                                    <td>${vehicle.total_distance.toFixed(0)}</td>
                                    <td>${vehicle.total_fuel.toFixed(1)}</td>
                                    <td>${vehicle.avg_consumption > 0 ? vehicle.avg_consumption.toFixed(1) + ' L/100km' : 'N/A'}</td>
                                    <td>${vehicle.review_count > 0 ? `<span class="review-flag">${vehicle.review_count}</span>` : '0'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering vehicle summary:', error);
            const container = document.getElementById('vehicle-summary-table');
            if (container) {
                container.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 2rem;">Error loading vehicle summary. Please refresh the page.</p>';
            }
        }
    }

    async renderRecentRecords() {
        try {
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select(`
                    date, distance, litres_used, fuel_consumption, activity, gauge_broken, needs_review, created_at,
                    vehicles (code, type),
                    drivers (name)
                `)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching recent records:', error);
                return;
            }

            const container = document.getElementById('recent-records-table');
            container.innerHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Vehicle</th>
                                <th>Driver</th>
                                <th>Activity</th>
                                <th>Distance</th>
                                <th>Fuel</th>
                                <th>Consumption</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => `
                                <tr class="${record.needs_review ? 'needs-review' : ''} vehicle-type-${record.vehicles.type}">
                                    <td>${new Date(record.date).toLocaleDateString()}</td>
                                    <td>
                                        <div class="vehicle-type-indicator"></div>
                                        ${record.vehicles.code}
                                    </td>
                                    <td>${record.drivers.name}</td>
                                    <td>${this.formatActivity(record.activity)}</td>
                                    <td>${record.distance.toFixed(0)} km</td>
                                    <td>${record.litres_used.toFixed(1)} L</td>
                                    <td>${record.gauge_broken ? 'N/A' : record.fuel_consumption.toFixed(1) + ' L/100km'}</td>
                                    <td>
                                        ${record.gauge_broken ? '<span class="text-warning">Gauge Broken</span>' : ''}
                                        ${record.needs_review ? '<span class="review-flag">Review</span>' : ''}
                                        ${!record.gauge_broken && !record.needs_review ? 'OK' : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering recent records:', error);
            const container = document.getElementById('recent-records-table');
            if (container) {
                container.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 2rem;">Error loading recent records. Please refresh the page.</p>';
            }
        }
    }

    async renderConsumptionChart() {
        try {
            // Simple chart implementation using canvas
            const canvas = document.getElementById('consumption-chart');
            const ctx = canvas.getContext('2d');
            
            // Get monthly consumption data from Supabase
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select('date, fuel_consumption, gauge_broken')
                .eq('gauge_broken', false)
                .gt('fuel_consumption', 0)
                .order('date', { ascending: true });

            if (error) {
                console.error('Error fetching consumption data:', error);
                return;
            }

            // Group by month and calculate averages
            const monthlyData = {};
            records.forEach(record => {
                const date = new Date(record.date);
                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        consumptions: []
                    };
                }
                monthlyData[monthKey].consumptions.push(record.fuel_consumption);
            });

            // Calculate monthly averages and get last 12 months
            const data = Object.values(monthlyData)
                .map(monthData => ({
                    month: monthData.month,
                    avg_consumption: monthData.consumptions.reduce((sum, c) => sum + c, 0) / monthData.consumptions.length
                }))
                .slice(-12); // Last 12 months

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (data.length === 0) {
                ctx.fillStyle = '#64748b';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('No consumption data available', canvas.width / 2, canvas.height / 2);
                return;
            }

            // Chart setup
            const padding = 40;
            const chartWidth = canvas.width - 2 * padding;
            const chartHeight = canvas.height - 2 * padding;
            
            const maxConsumption = Math.max(...data.map(d => d.avg_consumption || 0));
            const minConsumption = Math.min(...data.map(d => d.avg_consumption || 0));
            const range = maxConsumption - minConsumption;
            
            // Draw axes
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, canvas.height - padding);
            ctx.lineTo(canvas.width - padding, canvas.height - padding);
            ctx.stroke();
            
            // Draw data line
            if (data.length > 1) {
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                data.forEach((point, index) => {
                    const x = padding + (index / (data.length - 1)) * chartWidth;
                    const y = canvas.height - padding - ((point.avg_consumption - minConsumption) / range) * chartHeight;
                    
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                
                ctx.stroke();
            }
            
            // Draw data points
            ctx.fillStyle = '#2563eb';
            data.forEach((point, index) => {
                const x = padding + (index / Math.max(1, data.length - 1)) * chartWidth;
                const y = canvas.height - padding - ((point.avg_consumption - minConsumption) / Math.max(1, range)) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            // Add labels
            ctx.fillStyle = '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            
            // Y-axis labels
            for (let i = 0; i <= 4; i++) {
                const y = canvas.height - padding - (i / 4) * chartHeight;
                const value = minConsumption + (i / 4) * range;
                ctx.textAlign = 'right';
                ctx.fillText(value.toFixed(1), padding - 5, y + 3);
            }
            
            // X-axis labels (months)
            data.forEach((point, index) => {
                const x = padding + (index / Math.max(1, data.length - 1)) * chartWidth;
                ctx.textAlign = 'center';
                ctx.fillText(point.month, x, canvas.height - padding + 15);
            });
        } catch (error) {
            console.error('Error rendering consumption chart:', error);
            const canvas = document.getElementById('consumption-chart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#dc2626';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Error loading chart data', canvas.width / 2, canvas.height / 2);
            }
        }
    }

    async renderActivityCalendar() {
        try {
            const calendarGrid = document.getElementById('activity-calendar-grid');
            
            // Get daily activity counts for the past year from Supabase
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
            
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select('date')
                .gte('date', oneYearAgoStr)
                .order('date', { ascending: true });

            if (error) {
                console.error('Error fetching activity calendar data:', error);
                return;
            }

            // Count records by date
            const dailyData = {};
            records.forEach(record => {
                const date = record.date;
                dailyData[date] = (dailyData[date] || 0) + 1;
            });

            // Generate calendar grid (53 weeks × 7 days)
            const today = new Date();
            const oneYearAgoForGrid = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            
            let gridHTML = '';
            for (let week = 0; week < 53; week++) {
                for (let day = 0; day < 7; day++) {
                    const currentDate = new Date(oneYearAgoForGrid);
                    currentDate.setDate(oneYearAgoForGrid.getDate() + week * 7 + day);
                    
                    if (currentDate > today) continue;
                    
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const count = dailyData[dateStr] || 0;
                    
                    let level = 0;
                    if (count >= 7) level = 4;
                    else if (count >= 5) level = 3;
                    else if (count >= 3) level = 2;
                    else if (count >= 1) level = 1;
                    
                    gridHTML += `<div class="calendar-cell ${level > 0 ? `level-${level}` : ''}" title="${dateStr}: ${count} records"></div>`;
                }
            }
            
            calendarGrid.innerHTML = gridHTML;
        } catch (error) {
            console.error('Error rendering activity calendar:', error);
            const calendarGrid = document.getElementById('activity-calendar-grid');
            if (calendarGrid) {
                calendarGrid.innerHTML = '<p style="color: #dc2626; text-align: center; padding: 2rem;">Error loading activity calendar. Please refresh the page.</p>';
            }
        }
    }

    formatActivity(activity) {
        const activities = {
            'site-visit': 'Site Visit',
            'client-meeting': 'Client Meeting',
            'delivery': 'Delivery',
            'transport': 'Transport',
            'maintenance': 'Maintenance',
            'inspection': 'Inspection',
            'loading': 'Loading/Unloading',
            'construction': 'Construction Work',
            'emergency': 'Emergency',
            'field-preparation': 'Field Preparation',
            'planting': 'Planting',
            'harvesting': 'Harvesting',
            'other': 'Other Business'
        };
        return activities[activity] || activity;
    }

    // Export functionality
    async exportMonthlyReport() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        try {
            // Get start and end of current month
            const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
            const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]; // Last day of month
            
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
                console.error('Error fetching monthly data:', error);
                alert('Error generating monthly report: ' + error.message);
                return;
            }

            // Transform data to match expected format
            const transformedRecords = records.map(record => ({
                ...record,
                vehicle_code: record.vehicles.code,
                vehicle_name: record.vehicles.name,
                make: record.vehicles.make,
                model: record.vehicles.model,
                year: record.vehicles.year,
                registration: record.vehicles.registration,
                driver_code: record.drivers.code,
                driver_name: record.drivers.name
            }));

            this.generateSARSReport(transformedRecords, 'monthly', currentYear, currentMonth);
            
        } catch (error) {
            console.error('Error in monthly export:', error);
            alert('Error generating monthly report: ' + error.message);
        }
    }

    async exportAnnualReport() {
        const currentYear = new Date().getFullYear();
        
        try {
            const startDate = `${currentYear}-01-01`;
            const endDate = `${currentYear}-12-31`;
            
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
                console.error('Error fetching annual data:', error);
                alert('Error generating annual report: ' + error.message);
                return;
            }

            // Transform data to match expected format
            const transformedRecords = records.map(record => ({
                ...record,
                vehicle_code: record.vehicles.code,
                vehicle_name: record.vehicles.name,
                make: record.vehicles.make,
                model: record.vehicles.model,
                year: record.vehicles.year,
                registration: record.vehicles.registration,
                driver_code: record.drivers.code,
                driver_name: record.drivers.name
            }));

            this.generateSARSReport(transformedRecords, 'annual', currentYear);
            
        } catch (error) {
            console.error('Error in annual export:', error);
            alert('Error generating annual report: ' + error.message);
        }
    }

    generateSARSReport(records, type, year, month = null) {
        // Calculate summary statistics
        const totalFuel = records.reduce((sum, r) => sum + (r.gauge_broken ? 0 : r.litres_used), 0);
        const totalDistance = records.reduce((sum, r) => sum + r.distance, 0);
        const validRecords = records.filter(r => !r.gauge_broken && r.fuel_consumption > 0);
        const avgConsumption = validRecords.length > 0 ? 
            validRecords.reduce((sum, r) => sum + r.fuel_consumption, 0) / validRecords.length : 0;
        const reviewCount = records.filter(r => r.needs_review).length;
        const brokenGaugeCount = records.filter(r => r.gauge_broken).length;

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set font
        doc.setFont('helvetica');
        
        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('KCT Farming Pty Ltd', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        const reportTitle = month ? 
            `SARS Fuel Logbook - ${this.getMonthName(month)} ${year}` : 
            `SARS Fuel Logbook - ${year}`;
        doc.text(reportTitle, 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 40, { align: 'center' });
        doc.text(`Report Type: ${type.toUpperCase()}`, 105, 47, { align: 'center' });

        // Summary section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SUMMARY', 20, 65);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Records: ${records.length}`, 20, 75);
        doc.text(`Total Distance: ${totalDistance.toFixed(2)} km`, 20, 82);
        doc.text(`Total Fuel Used: ${totalFuel.toFixed(2)} L`, 20, 89);
        doc.text(`Average Consumption: ${avgConsumption.toFixed(2)} L/100km`, 20, 96);
        doc.text(`Records Needing Review: ${reviewCount}`, 20, 103);
        doc.text(`Records with Broken Gauge: ${brokenGaugeCount}`, 20, 110);

        // Vehicle Summary Table
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('VEHICLE SUMMARY', 20, 130);

        // Group records by vehicle
        const vehicleSummary = {};
        records.forEach(record => {
            if (!vehicleSummary[record.vehicle_code]) {
                vehicleSummary[record.vehicle_code] = {
                    vehicle_name: record.vehicle_name,
                    total_fuel: 0,
                    total_distance: 0,
                    record_count: 0
                };
            }
            vehicleSummary[record.vehicle_code].total_fuel += record.gauge_broken ? 0 : record.litres_used;
            vehicleSummary[record.vehicle_code].total_distance += record.distance;
            vehicleSummary[record.vehicle_code].record_count += 1;
        });

        // Table headers
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        let yPos = 145;
        doc.text('Vehicle', 20, yPos);
        doc.text('Records', 60, yPos);
        doc.text('Distance (km)', 85, yPos);
        doc.text('Fuel (L)', 120, yPos);
        doc.text('Avg Consumption', 145, yPos);

        // Table data
        doc.setFont('helvetica', 'normal');
        yPos += 7;
        Object.entries(vehicleSummary).forEach(([code, data]) => {
            const avgCons = data.total_distance > 0 ? (data.total_fuel / data.total_distance) * 100 : 0;
            doc.text(`${code}`, 20, yPos);
            doc.text(`${data.record_count}`, 60, yPos);
            doc.text(`${data.total_distance.toFixed(1)}`, 85, yPos);
            doc.text(`${data.total_fuel.toFixed(1)}`, 120, yPos);
            doc.text(`${avgCons.toFixed(1)} L/100km`, 145, yPos);
            yPos += 7;
            
            // Add new page if needed
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
            doc.text('This document is SARS compliant for fuel logbook requirements', 105, 285, { align: 'center' });
        }

        // Download PDF
        const filename = month ? 
            `SARS_Fuel_Logbook_${year}_${month.toString().padStart(2, '0')}.pdf` : 
            `SARS_Fuel_Logbook_${year}.pdf`;
        
        doc.save(filename);
    }

    // CanePro Export Functionality
    async exportCaneProFormat() {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
        
        try {
            const { data: records, error } = await supabase
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, make, model, year, registration),
                    drivers (code, name)
                `)
                .gte('date', startOfMonth)
                .lte('date', endOfMonth)
                .order('date', { ascending: true });

            if (error) {
                console.error('Error fetching CanePro data:', error);
                alert('Error generating CanePro export: ' + error.message);
                return;
            }

            if (records.length === 0) {
                alert('No records found for current month');
                return;
            }

            // Transform data to match expected format
            const transformedRecords = records.map(record => ({
                ...record,
                vehicle_code: record.vehicles.code,
                vehicle_name: record.vehicles.name,
                make: record.vehicles.make,
                model: record.vehicles.model,
                year: record.vehicles.year,
                registration: record.vehicles.registration,
                driver_code: record.drivers.code,
                driver_name: record.drivers.name
            }));

            this.generateCaneProExcel(transformedRecords);
            
        } catch (error) {
            console.error('Error in CanePro export:', error);
            alert('Error generating CanePro export: ' + error.message);
        }
    }

    generateCaneProExcel(records) {
        // Get date range for title
        const startDate = records[0].date;
        const endDate = records[records.length - 1].date;
        const reportTitle = `Vehicle Daily Capture Sheet (Estate - KCT Farming (Pty) Ltd) - (${this.formatDateForCanePro(startDate)}-${this.formatDateForCanePro(endDate)})`;

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = {};
        
        // Set column widths
        ws['!cols'] = [
            {wch: 12}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 8}, 
            {wch: 8}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 8}, {wch: 10}
        ];

        // Row 1: Title (merged across columns A to K)
        ws['A1'] = { v: reportTitle, t: 's' };
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];

        // Row 3: Main headers
        ws['A3'] = { v: 'Date', t: 's' };
        ws['B3'] = { v: 'Vehicle', t: 's' };
        ws['C3'] = { v: 'Activity Details', t: 's' };
        ws['E3'] = { v: 'Fuel Consp', t: 's' };
        ws['H3'] = { v: 'Fuel Store', t: 's' };
        ws['J3'] = { v: 'Other', t: 's' };

        // Row 4: Sub-headers
        ws['A4'] = { v: 'Date', t: 's' };
        ws['B4'] = { v: 'Vehicle', t: 's' };
        ws['C4'] = { v: 'Field', t: 's' };
        ws['D4'] = { v: 'Activity', t: 's' };
        ws['E4'] = { v: 'Fuel', t: 's' };
        ws['F4'] = { v: 'HrsKm', t: 's' };
        ws['G4'] = { v: 'Odo. End', t: 's' };
        ws['H4'] = { v: 'Store', t: 's' };
        ws['I4'] = { v: 'Issue No.', t: 's' };
        ws['J4'] = { v: 'Tons', t: 's' };
        ws['K4'] = { v: 'Driver', t: 's' };

        // Data rows starting from row 5
        records.forEach((record, index) => {
            const rowNum = index + 5;
            const rowData = [
                this.formatDateForCanePro(record.date),
                record.vehicle_code,
                record.field_name,
                this.mapActivityToCode(record.activity),
                parseFloat(record.litres_used.toFixed(1)),
                1.0,
                parseFloat(record.odo_end.toFixed(2)),
                'Tank A',
                0.0,
                0.0,
                record.driver_code
            ];

            const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
            rowData.forEach((value, colIndex) => {
                const cellRef = columns[colIndex] + rowNum;
                if (typeof value === 'number') {
                    ws[cellRef] = { v: value, t: 'n' };
                } else {
                    ws[cellRef] = { v: value, t: 's' };
                }
            });
        });

        // Set the range for the worksheet
        const lastRow = records.length + 4;
        ws['!ref'] = `A1:K${lastRow}`;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Vehicle Capture');

        // Generate Excel file and download
        const filename = `DailyVehicleCapture_${this.formatDateForFilename(startDate)}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    formatDateForCanePro(dateStr) {
        // Convert from YYYY-MM-DD to DD/MM/YYYY format
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    formatDateForFilename(dateStr) {
        // Convert from YYYY-MM-DD to DDMMYYYY format
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}${month}${year}`;
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

    getMonthName(monthNumber) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthNumber - 1];
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing Fleet Manager');
    
    // IndexedDB temporarily disabled - using localStorage only for now
    console.log('Starting Fleet Manager with localStorage storage');
    
    try {
        app = new FleetManager();
        
        // Add global debugging functions
        window.fleetDebug = {
            downloadDailyBackup: () => {
                const url = localStorage.getItem('daily_backup_url');
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `fleet-manager-daily-backup-${new Date().toISOString().split('T')[0]}.db`;
                    link.click();
                } else {
                    console.log('No daily backup available');
                }
            },
            checkStorage: async () => {
                const info = {
                    localStorage: {},
                    indexedDB: null
                };
                
                // Check localStorage
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith('fleetmanager') || key.includes('backup'));
                keys.forEach(key => {
                    const size = localStorage.getItem(key)?.length || 0;
                    info.localStorage[key] = `${Math.round(size / 1024)} KB`;
                });
                
                // Check IndexedDB
                try {
                    const dbData = await app.loadFromIndexedDB();
                    if (dbData) {
                        info.indexedDB = `${Math.round(dbData.length / 1024)} KB`;
                    } else {
                        info.indexedDB = 'No data';
                    }
                } catch (error) {
                    info.indexedDB = `Error: ${error.message}`;
                }
                
                console.log('Storage Information:', info);
                return info;
            },
            getCurrentState: () => ({
                currentVehicle: app.currentVehicle,
                currentDriver: app.currentDriver,
                currentStep: app.currentStep,
                supabaseReady: true
            }),
            clearAllData: () => {
                if (confirm('This will delete ALL fleet manager data. Are you sure?')) {
                    // Clear localStorage
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('fleetmanager') || key.includes('backup')) {
                            localStorage.removeItem(key);
                        }
                    });
                    
                    // Clear IndexedDB
                    const deleteRequest = indexedDB.deleteDatabase('FleetManagerDB');
                    deleteRequest.onsuccess = () => console.log('All data cleared. Please refresh the page.');
                    deleteRequest.onerror = () => console.error('Error clearing IndexedDB');
                }
            }
            }
            localStorage.clear();
            location.reload(true);
        };
        
    } catch (error) {
        console.error('Failed to initialize Fleet Manager:', error);
        alert('Application failed to start. Please refresh the page.');
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