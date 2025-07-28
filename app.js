// --- Supabase config via window globals (set in index.html) ---
// Netlify: Set SUPABASE_URL and SUPABASE_KEY as environment variables and inject into index.html
// Example in index.html:
// <script>
//   window.SUPABASE_URL = '<YOUR_NETLIFY_ENV_SUPABASE_URL>';
//   window.SUPABASE_KEY = '<YOUR_NETLIFY_ENV_SUPABASE_KEY>';
// </script>

// --- Supabase client initialization ---
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

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