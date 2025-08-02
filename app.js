// --- Supabase config fetched from Netlify function ---
async function getSupabaseConfig() {
  // Always check for local config first
  if (window.LOCAL_SUPABASE_CONFIG) {
    console.log('Local config found - using config.local.js');
    return window.LOCAL_SUPABASE_CONFIG;
  }
  
  // If no local config, check if we're running locally
  const isLocalDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.port.startsWith('800'); // Any port 800x for local dev
  
  console.log('Current hostname:', window.location.hostname);
  console.log('Current port:', window.location.port);
  console.log('Is local development:', isLocalDevelopment);
  
  if (isLocalDevelopment) {
    throw new Error('Running locally but config.local.js not found. Please ensure config.local.js is loaded.');
  } else {
    // Production mode - use Netlify function
    console.log('Production mode - fetching Supabase config from Netlify function...');
    const res = await fetch('/.netlify/functions/config');
    console.log('Netlify function response status:', res.status);
    if (!res.ok) throw new Error(`Failed to load Supabase config: ${res.status} ${res.statusText}`);
    const config = await res.json();
    console.log('Supabase config loaded successfully');
    return config;
  }
}

(async () => {
  console.log('Starting app initialization...');
  try {
    const config = await getSupabaseConfig();
    console.log('Creating Supabase client...');
    const supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    window.supabaseClient = supabaseClient; // Make it globally accessible
    console.log('Supabase client created and stored globally');

    // Fleet Manager - Minimal design with enhanced functionality
    class FleetManager {
    constructor() {
        this.currentVehicle = null;
        this.currentDriver = null;
        this.currentStep = 'vehicle';
        this.selectedVehicleRow = null;
        this.selectedDriverRow = null;
        // Cache for database data
        this.vehiclesCache = null;
        this.driversCache = null;
        this.bowsersCache = null;
        this.activitiesCache = null;
        this.fieldsCache = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Offline functionality
        this.isOnline = navigator.onLine;
        this.offlineEntries = [];
        this.syncInProgress = false;
        
        this.init();
        this.initializeOfflineHandlers();
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
        
        // Cache essential data for offline use
        await this.cacheEssentialData();
        
        console.log('Fleet Manager initialization complete');
    }

    async testSupabaseConnection() {
        try {
            const { data, error } = await window.supabaseClient.from('vehicles').select('count', { count: 'exact' });
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
        // Preload vehicles, drivers, and bowsers data in parallel to populate cache
        const [vehicles, drivers, bowsers] = await Promise.all([
            this.fetchVehiclesFromSupabase(),
            this.fetchDriversFromSupabase(),
            this.fetchBowsersFromSupabase()
        ]);
        
        // Now render everything using cached data
        await Promise.all([
            this.renderVehicles(),
            this.renderDrivers(),
            this.renderVehicleManagement(),
            this.renderDriverManagement(),
            this.renderBowserManagement()
        ]);
        
        await this.updateDashboard();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation - with null checks
        const navElements = [
            { id: 'nav-fuel-entry', section: 'fuel-entry' },
            { id: 'nav-dashboard', section: 'dashboard' },
            { id: 'nav-vehicles', section: 'vehicles' },
            { id: 'nav-drivers', section: 'drivers' },
            { id: 'nav-bowsers', section: 'bowsers' }
        ];
        
        navElements.forEach(({ id, section }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => this.showSection(section));
            } else {
                console.error(`Navigation element ${id} not found`);
            }
        });

        // Mobile bottom navigation
        const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
        mobileNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                if (section === 'database') {
                    this.showDatabaseMenu();
                } else {
                    this.showSection(section);
                    this.updateMobileNav(section);
                }
            });
        });

        // Step navigation - with null checks
        const stepElements = [
            { id: 'back-to-vehicle', action: () => this.showStep('vehicle') },
            { id: 'back-to-driver', action: () => this.showStep('driver') },
            { id: 'back-to-activity', action: () => this.showStep('activity') },
            { id: 'back-to-field', action: () => this.showStep('field') },
            { id: 'back-to-odometer', action: () => this.showStep('odometer') },
            { id: 'back-to-fuel-data', action: () => this.showStep('fuel-data') },
            { id: 'next-to-fuel', action: () => this.nextToFuel() },
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
        const addVehicleBtn = document.getElementById('add-vehicle');
        if (addVehicleBtn) {
            addVehicleBtn.addEventListener('click', () => this.addNewVehicle());
        }

        // Driver management
        const addDriverBtn = document.getElementById('add-driver');
        if (addDriverBtn) {
            addDriverBtn.addEventListener('click', () => this.addNewDriver());
        }

        // Bowser management
        const addBowserBtn = document.getElementById('add-bowser');
        const addRefillBtn = document.getElementById('add-refill');
        const reconcileBtn = document.getElementById('reconcile-month');
        
        if (addBowserBtn) {
            addBowserBtn.addEventListener('click', () => this.addNewBowser());
        }
        if (addRefillBtn) {
            addRefillBtn.addEventListener('click', () => this.addBowserRefill());
        }
        if (reconcileBtn) {
            reconcileBtn.addEventListener('click', () => this.reconcileMonth());
        }

        // Toggle button functionality
        this.setupToggleButtons();

        // Fuel consumption calculation and gauge broken functionality
        const odoStart = document.getElementById('odo-start');
        const odoEnd = document.getElementById('odo-end');
        const litresUsed = document.getElementById('litres-used');
        const gaugeBroken = document.getElementById('gauge-broken');
        
        if (odoStart) {
            odoStart.addEventListener('input', () => this.calculateConsumption());
        }
        if (odoEnd) {
            odoEnd.addEventListener('input', () => this.calculateConsumption());
        }
        if (litresUsed) {
            litresUsed.addEventListener('input', () => this.calculateConsumption());
        }
        if (gaugeBroken) {
            gaugeBroken.addEventListener('change', () => this.handleGaugeBroken());
        }

        // Bowser reading validation and auto-calculation
        const bowserStart = document.getElementById('bowser-start');
        const bowserEnd = document.getElementById('bowser-end');
        
        if (bowserStart) {
            bowserStart.addEventListener('input', () => this.autoCalculateBowserEnd());
        }
        if (bowserEnd) {
            bowserEnd.addEventListener('input', () => {
                this.markBowserEndAsManuallyModified();
                this.validateBowserReading();
            });
        }
        if (litresUsed) {
            litresUsed.addEventListener('input', () => this.autoCalculateBowserEnd());
        }

        // Export functionality
        const exportMonthly = document.getElementById('export-monthly');
        const exportAnnual = document.getElementById('export-annual');
        const exportCanepro = document.getElementById('export-canepro');
        
        if (exportMonthly) {
            exportMonthly.addEventListener('click', () => this.exportMonthlyReport());
        }
        if (exportAnnual) {
            exportAnnual.addEventListener('click', () => this.exportAnnualReport());
        }
        if (exportCanepro) {
            exportCanepro.addEventListener('click', () => this.exportCaneProFormat());
        }

        // Activity selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.activity-btn')) {
                this.selectActivity(e.target.closest('.activity-btn'));
            }
        });

        // Field selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.field-row')) {
                this.selectField(e.target.closest('.field-row'));
            }
        });

        // Handle window resize for responsive layout
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.renderVehicleManagement();
                this.renderDriverManagement();
            }, 250);
        });

    }

    showSection(section) {
        console.log(`Switching to section: ${section}`);
        
        // Database-only sections (activities, fields) don't have desktop nav buttons
        const databaseOnlySections = ['activities', 'fields'];
        
        if (!databaseOnlySections.includes(section)) {
            // Update navigation for regular sections
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const navBtn = document.getElementById(`nav-${section}`);
            if (navBtn) {
                navBtn.classList.add('active');
            } else {
                console.warn(`Navigation button nav-${section} not found (this is normal for database-only sections)`);
            }
        }

        // Show section
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
            console.log(`Section ${section} is now active`);
            
            // Load data for database sections
            if (section === 'activities') {
                this.renderActivitiesManagement();
            } else if (section === 'fields') {
                this.renderFieldsManagement();
            }
        } else {
            console.error(`Section ${section}-section not found`);
        }

        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'vehicles') {
            this.renderVehicleManagement();
        } else if (section === 'drivers') {
            this.renderDriverManagement();
        } else if (section === 'bowsers') {
            this.renderBowserManagement();
            this.renderRefillHistory();
            this.updateReconciliationStatus();
        } else if (section === 'fuel-entry') {
            // Ensure vehicles are rendered for fuel entry
            this.renderVehicles();
            this.renderDrivers();
        }
        
        // Update mobile navigation
        this.updateMobileNav(section);
    }

    // Mobile navigation methods
    updateMobileNav(activeSection) {
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === activeSection) {
                btn.classList.add('active');
            }
        });
    }

    showDatabaseMenu() {
        // Create a modal or overlay for database options
        const modal = document.createElement('div');
        modal.className = 'database-modal';
        modal.innerHTML = `
            <div class="database-modal-content">
                <h3>Database Management</h3>
                <button class="database-btn" data-section="vehicles">
                    <span>🚗</span> Vehicles
                </button>
                <button class="database-btn" data-section="drivers">
                    <span>👤</span> Drivers  
                </button>
                <button class="database-btn" data-section="bowsers">
                    <span>⛽</span> Bowsers
                </button>
                <button class="database-btn" data-section="activities">
                    <span>🔧</span> Activities
                </button>
                <button class="database-btn" data-section="fields">
                    <span>🌾</span> Fields
                </button>
                <button class="database-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelectorAll('.database-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showSection(btn.dataset.section);
                this.updateMobileNav('database');
                document.body.removeChild(modal);
            });
        });
        
        modal.querySelector('.database-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Progress tracking
    updateProgressBar(step) {
        const steps = ['vehicle', 'driver', 'activity', 'field', 'odometer', 'fuel-data', 'review'];
        const currentStepIndex = steps.indexOf(step);
        const progress = ((currentStepIndex + 1) / steps.length) * 100;
        
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
        }
    }

    // Activity selection
    selectActivity(activityBtn) {
        // Remove previous selection
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selection to clicked button
        activityBtn.classList.add('selected');
        
        // Store selected activity
        this.currentActivity = {
            code: activityBtn.dataset.activity,
            name: activityBtn.dataset.name
        };
        
        console.log('Activity selected:', this.currentActivity);
        
        // Auto-advance to field selection after brief delay
        setTimeout(() => {
            this.showStep('field');
        }, 500);
    }

    // Field selection
    selectField(fieldRow) {
        // Remove previous selection
        document.querySelectorAll('.field-row').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Add selection to clicked row
        fieldRow.classList.add('selected');
        
        // Store selected field
        this.currentField = fieldRow.dataset.field;
        
        console.log('Field selected:', this.currentField);
        
        // Auto-advance to fuel data after brief delay
        setTimeout(() => {
            this.showStep('odometer');
        }, 500);
    }

    nextToFuel() {
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        
        if (isNaN(odoStart) || odoStart < 0) {
            alert('Please enter a valid odometer start reading.');
            return;
        }
        
        if (!gaugeBroken && (isNaN(odoEnd) || odoEnd < odoStart)) {
            alert('Please enter a valid odometer end reading that is greater than or equal to the start reading.');
            return;
        }
        
        this.showStep('fuel-data');
    }

    // Updated field selection navigation
    nextToFieldSelection() {
        if (!this.currentActivity) {
            alert('Please select an activity first');
            return;
        }
        
        // Update activity info display
        const activityInfoElement = document.getElementById('selected-activity-info');
        if (activityInfoElement) {
            activityInfoElement.innerHTML = `<strong>${this.currentActivity.code}</strong> - ${this.currentActivity.name}`;
        }
        
        // Update other info displays for field step
        this.showStep('field');
        this.updateFieldStepInfo();
    }

    updateCompactSummary(stepId) {
        const summaryElement = document.getElementById(`${stepId}-summary`);
        if (!summaryElement) return;
        
        let summary = '';
        
        if (this.currentVehicle) {
            summary += `<strong>${this.currentVehicle.code}</strong> ${this.currentVehicle.name}`;
        }
        
        if (this.currentDriver) {
            summary += summary ? `, <strong>${this.currentDriver.code}</strong> ${this.currentDriver.name}` : `<strong>${this.currentDriver.code}</strong> ${this.currentDriver.name}`;
        }
        
        if (this.currentActivity) {
            summary += summary ? `, <strong>${this.currentActivity.code}</strong> ${this.currentActivity.name}` : `<strong>${this.currentActivity.code}</strong> ${this.currentActivity.name}`;
        }
        
        if (this.currentField && stepId === 'fuel-data') {
            summary += summary ? `, <strong>Field:</strong> ${this.currentField}` : `<strong>Field:</strong> ${this.currentField}`;
        }
        
        summaryElement.innerHTML = summary;
    }

    setupToggleButtons() {
        // Vehicle summary toggle buttons
        const vehicleToggleBtns = document.querySelectorAll('.vehicle-summary .toggle-btn');
        vehicleToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons in this group
                vehicleToggleBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Re-render vehicle summary with new period
                const period = e.target.dataset.period;
                this.renderVehicleSummary(period);
            });
        });

        // Recent records toggle buttons
        const recordsToggleBtns = document.querySelectorAll('.recent-records .toggle-btn');
        recordsToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons in this group
                recordsToggleBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Re-render recent records with new period
                const period = e.target.dataset.period;
                this.renderRecentRecords(period);
            });
        });
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
            
            // Update progress bar
            this.updateProgressBar(step);
            
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
        } else if (step === 'activity') {
            // Update activity step summary
            this.updateCompactSummary('activity');
        } else if (step === 'field') {
            // Update field step summary and populate fields
            this.updateCompactSummary('field');
            this.renderFields();
        } else if (step === 'odometer') {
            // Update odometer step summary
            this.updateCompactSummary('odometer');
        } else if (step === 'fuel-data') {
            // Update fuel data step summary
            this.updateCompactSummary('fuel-data');
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
            const tableBody = document.getElementById('vehicle-table-body');
            if (!this.isCacheValid()) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Loading vehicles...</td></tr>';
            }
            
            const vehicles = await this.fetchVehiclesFromSupabase();
            if (!vehicles) {
                console.error('Failed to fetch vehicles from Supabase');
                return;
            }
            tableBody.innerHTML = vehicles.map(vehicle => {
                const typeClass = this.convertTypeToClassName(vehicle.type);
                return `
                <tr class="clickable vehicle-type-${typeClass}" data-id="${vehicle.id}">
                    <td><span class="vehicle-code-colored">${vehicle.code || ''}</span></td>
                    <td>${vehicle.name || ''}</td>
                    <td>${vehicle.type || '-'}</td>
                    <td>${vehicle.registration || '-'}</td>
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
            const tableBody = document.getElementById('driver-table-body');
            if (!this.isCacheValid()) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">Loading drivers...</td></tr>';
            }
            
            const drivers = await this.fetchDriversFromSupabase();
            if (!drivers) {
                console.error('Failed to fetch drivers from Supabase');
                return;
            }
            
            tableBody.innerHTML = drivers.map(driver => `
            <tr class="clickable" data-id="${driver.id}">
                <td><strong>${driver.code}</strong></td>
                <td>${driver.name}</td>
                <td>${driver.default_veh || '-'}</td>
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
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading drivers. Please refresh the page.</td></tr>';
            }
        }
    }

    async renderFields() {
        try {
            const tableBody = document.getElementById('field-table-body');
            if (!this.isCacheValid()) {
                tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Loading fields...</td></tr>';
            }
            
            const fields = await this.fetchFieldsFromSupabase();
            if (!fields) {
                console.error('Failed to fetch fields from Supabase');
                return;
            }
            
            tableBody.innerHTML = fields.map(field => `
            <tr class="field-row clickable" data-field="${field.field_code}">
                <td><strong>${field.field_code}</strong> - ${field.field_name}</td>
                <td>${field.crop_type}</td>
            </tr>
        `).join('');

        // Remove any existing event listeners to prevent duplicates
        const newTableBody = tableBody.cloneNode(true);
        tableBody.parentNode.replaceChild(newTableBody, tableBody);

        // Add click handlers for field selection
        newTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('.field-row');
            if (row && row.dataset.field) {
                this.selectField(row);
            }
        });
        } catch (error) {
            console.error('Error rendering fields:', error);
            const tableBody = document.getElementById('field-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 2rem; color: #dc2626;">Error loading fields. Please refresh the page.</td></tr>';
            }
        }
    }

    async selectVehicle(vehicleId) {
        console.log(`Selecting vehicle with ID: ${vehicleId}`);
        
        try {
            const { data: vehicle, error } = await window.supabaseClient
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
                    vehicleInfoElement.innerHTML = `<strong>${this.currentVehicle.code}</strong> - ${this.currentVehicle.name}`;
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
            const { data: driver, error } = await window.supabaseClient
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
                driverInfoElement.innerHTML = `<strong>${this.currentDriver.code}</strong> - ${this.currentDriver.name}`;
            } else {
                console.error('selected-driver-info element not found');
            }
            
            // Set default odometer start value to last reading (offline-aware)
            try {
                const lastOdoReading = await this.getLastOdometerReading(this.currentVehicle.id);
                const odoStartElement = document.getElementById('odo-start');
                if (odoStartElement && lastOdoReading > 0) {
                    odoStartElement.value = lastOdoReading;
                }
            } catch (odoError) {
                console.warn('Could not set default odometer value:', odoError);
            }
            
            // Set default bowser start value to current reading
            try {
                const bowsers = await this.fetchBowsersFromSupabase();
                if (bowsers.length > 0) {
                    const defaultBowser = bowsers[0];
                    const bowserStartElement = document.getElementById('bowser-start');
                    if (bowserStartElement) {
                        bowserStartElement.value = defaultBowser.current_reading || 0;
                    }
                }
            } catch (bowserError) {
                console.warn('Could not set default bowser value:', bowserError);
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
        const bowserStart = parseFloat(document.getElementById('bowser-start').value);
        const bowserEnd = parseFloat(document.getElementById('bowser-end').value);
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
        
        if (isNaN(bowserStart) || bowserStart < 0) {
            alert('Please enter a valid bowser start reading.');
            return;
        }
        
        if (isNaN(bowserEnd) || bowserEnd < 0) {
            alert('Please enter a valid bowser end reading.');
            return;
        }
        
        if (!gaugeBroken && odoEnd < odoStart) {
            alert('End odometer reading cannot be less than start reading.');
            return;
        }
        
        // Validate bowser readings
        if (!this.validateBowserReading()) {
            const proceed = confirm('Bowser readings do not match fuel amount. Do you want to proceed anyway?');
            if (!proceed) {
                return;
            }
        }
        
        this.generateReviewSummary();
        this.showStep('review');
    }

    generateReviewSummary() {
        const activity = this.currentActivity ? this.currentActivity.code : '';
        const activityName = this.currentActivity ? this.currentActivity.name : '';
        const fieldName = this.currentField || '';
        const odoStart = parseFloat(document.getElementById('odo-start').value);
        const odoEnd = parseFloat(document.getElementById('odo-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const bowserStart = parseFloat(document.getElementById('bowser-start').value);
        const bowserEnd = parseFloat(document.getElementById('bowser-end').value);
        const gaugeBroken = document.getElementById('gauge-broken').checked;
        const fuelConsumption = document.getElementById('fuel-consumption').value;
        
        const distance = gaugeBroken ? 0 : (odoEnd - odoStart);
        const bowserDispensed = bowserEnd - bowserStart;
        
        const reviewSummary = document.getElementById('review-summary');
        if (reviewSummary) {
            reviewSummary.innerHTML = `
                <div class="review-card">
                    <h3>Record Summary</h3>
                    <div class="review-grid">
                        <div class="review-item">
                            <span class="review-label">Vehicle</span>
                            <span class="review-value review-highlight">${this.currentVehicle.code} - ${this.currentVehicle.name}</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Driver</span>
                            <span class="review-value">${this.currentDriver.code} - ${this.currentDriver.name}</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Activity</span>
                            <span class="review-value">${activity} - ${activityName}</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Location</span>
                            <span class="review-value">${fieldName}</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Distance</span>
                            <span class="review-value">${gaugeBroken ? 'N/A (gauge broken)' : distance.toFixed(1) + ' km'}</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Fuel Used</span>
                            <span class="review-value review-highlight">${litresUsed.toFixed(2)} L</span>
                        </div>
                        <div class="review-item">
                            <span class="review-label">Consumption</span>
                            <span class="review-value">${fuelConsumption || 'N/A'}</span>
                        </div>
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

    validateBowserReading() {
        const bowserStart = parseFloat(document.getElementById('bowser-start').value);
        const bowserEnd = parseFloat(document.getElementById('bowser-end').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        
        if (isNaN(bowserStart) || isNaN(bowserEnd) || isNaN(litresUsed)) {
            return; // Not all fields filled yet
        }
        
        const expectedEnd = bowserStart + litresUsed;
        const tolerance = 0.1; // 0.1 litre tolerance
        
        const bowserEndElement = document.getElementById('bowser-end');
        const bowserStartElement = document.getElementById('bowser-start');
        const litresUsedElement = document.getElementById('litres-used');
        
        // Remove any previous validation styling
        [bowserEndElement, bowserStartElement, litresUsedElement].forEach(el => {
            el.classList.remove('validation-error', 'validation-warning');
            el.title = '';
        });
        
        if (bowserEnd < bowserStart) {
            bowserEndElement.classList.add('validation-error');
            bowserEndElement.title = 'End reading cannot be less than start reading';
            return false;
        }
        
        const actualDispensed = bowserEnd - bowserStart;
        const difference = Math.abs(actualDispensed - litresUsed);
        
        if (difference > tolerance) {
            bowserEndElement.classList.add('validation-warning');
            litresUsedElement.classList.add('validation-warning');
            
            const warningMsg = `Warning: Bowser reading shows ${actualDispensed.toFixed(2)}L dispensed, but fuel used is ${litresUsed.toFixed(2)}L (difference: ${difference.toFixed(2)}L)`;
            bowserEndElement.title = warningMsg;
            litresUsedElement.title = warningMsg;
            
            return false;
        }
        
        return true;
    }

    autoCalculateBowserEnd() {
        const bowserStart = parseFloat(document.getElementById('bowser-start').value);
        const litresUsed = parseFloat(document.getElementById('litres-used').value);
        const bowserEndElement = document.getElementById('bowser-end');
        
        // Only auto-calculate if both values are valid numbers
        if (!isNaN(bowserStart) && !isNaN(litresUsed) && litresUsed > 0) {
            const calculatedEnd = bowserStart + litresUsed;
            
            // Only update if the field hasn't been manually modified recently
            // We'll track this with a data attribute
            if (!bowserEndElement.dataset.manuallyModified) {
                bowserEndElement.value = calculatedEnd.toFixed(2);
                bowserEndElement.classList.add('auto-calculated');
            }
        }
        
        // Always validate after auto-calculation
        this.validateBowserReading();
        this.calculateConsumption();
    }

    markBowserEndAsManuallyModified() {
        const bowserEndElement = document.getElementById('bowser-end');
        bowserEndElement.dataset.manuallyModified = 'true';
        bowserEndElement.classList.remove('auto-calculated');
        bowserEndElement.classList.add('manually-modified');
        
        // Clear the manual flag after 5 seconds to allow auto-calculation again
        setTimeout(() => {
            delete bowserEndElement.dataset.manuallyModified;
            bowserEndElement.classList.remove('manually-modified');
        }, 5000);
    }

    async saveFuelRecord() {
        try {
            const activity = this.currentActivity ? this.currentActivity.code : '';
            const fieldName = this.currentField || '';
            const odoStart = parseFloat(document.getElementById('odo-start').value);
            const odoEnd = parseFloat(document.getElementById('odo-end').value);
            const litresUsed = parseFloat(document.getElementById('litres-used').value);
            const bowserStart = parseFloat(document.getElementById('bowser-start').value);
            const bowserEnd = parseFloat(document.getElementById('bowser-end').value);
            const gaugeBroken = document.getElementById('gauge-broken').checked;
            const date = document.getElementById('date').value;
            const needsReview = document.getElementById('needs-review').checked;
            
            if (!date) {
                alert('Please select a date.');
                return;
            }
            
            const distance = gaugeBroken ? 0 : (odoEnd - odoStart);
            const consumption = distance > 0 ? (litresUsed / distance) * 100 : 0;
            
            // Check for bowser discrepancy
            const bowserDispensed = bowserEnd - bowserStart;
            const discrepancy = Math.abs(bowserDispensed - litresUsed);
            const hasDiscrepancy = discrepancy > 0.1; // 0.1L tolerance
            
            // Get the default bowser (assuming first bowser for now)
            const bowsers = await this.fetchBowsersFromSupabase();
            const defaultBowser = bowsers.length > 0 ? bowsers[0] : null;
            
            if (!defaultBowser) {
                alert('No bowser found. Please add a bowser first.');
                return;
            }
            
            const fuelEntry = {
                vehicle_id: this.currentVehicle.id,
                driver_id: this.currentDriver.id,
                bowser_id: defaultBowser.id,
                date: date,
                activity: activity,
                field_name: fieldName,
                odo_start: odoStart,
                odo_end: gaugeBroken ? odoStart : odoEnd,
                fuel_amount: litresUsed,
                bowser_start: bowserStart,
                bowser_end: bowserEnd,
                HrsKm: distance,
                has_discrepancy: hasDiscrepancy,
                discrepancy_amount: hasDiscrepancy ? discrepancy : 0,
                timestamp: new Date().toISOString()
            };
            
            // Try to save online first, fallback to offline storage
            if (this.isOnline) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from('fuel_entries')
                        .insert([fuelEntry])
                        .select();
                        
                    if (error) {
                        throw error;
                    }
                    
                    // Update bowser current reading
                    try {
                        const { error: bowserError } = await window.supabaseClient
                            .from('bowsers')
                            .update({ current_reading: bowserEnd })
                            .eq('id', defaultBowser.id);
                            
                        if (bowserError) {
                            console.error('Error updating bowser reading:', bowserError);
                        }
                    } catch (bowserUpdateError) {
                        console.error('Failed to update bowser reading:', bowserUpdateError);
                    }
                    
                    console.log('Fuel record saved successfully:', data);
                    alert('Fuel record saved successfully!');
                    
                } catch (onlineError) {
                    console.error('Online save failed, falling back to offline:', onlineError);
                    // Fallback to offline storage
                    const saved = await this.saveOfflineFuelEntry(fuelEntry);
                    if (saved) {
                        alert('Connection lost - fuel record saved offline. It will sync when connection is restored.');
                    } else {
                        alert('Failed to save fuel record. Please try again.');
                        return;
                    }
                }
            } else {
                // Save offline when no connection
                const saved = await this.saveOfflineFuelEntry(fuelEntry);
                if (saved) {
                    alert('Offline mode - fuel record saved locally. It will sync when connection is restored.');
                } else {
                    alert('Failed to save fuel record offline. Please try again.');
                    return;
                }
            }
            
            // Reset form and go back to vehicle selection
            this.resetFuelEntryForm();
            this.showStep('vehicle');
            
            // Refresh data if online
            if (this.isOnline) {
                await this.loadInitialData();
            }
            
        } catch (error) {
            console.error('Error saving fuel record:', error);
            alert('Error saving fuel record. Please try again.');
        }
    }

    resetFuelEntryForm() {
        // Clear current selections
        this.currentVehicle = null;
        this.currentDriver = null;
        this.currentActivity = null;
        this.currentField = null;
        
        // Clear form fields that still exist
        const odoStart = document.getElementById('odo-start');
        const odoEnd = document.getElementById('odo-end');
        const litresUsed = document.getElementById('litres-used');
        const bowserStart = document.getElementById('bowser-start');
        const bowserEnd = document.getElementById('bowser-end');
        const fuelConsumption = document.getElementById('fuel-consumption');
        const date = document.getElementById('date');
        const needsReview = document.getElementById('needs-review');
        const gaugeBroken = document.getElementById('gauge-broken');
        
        if (odoStart) odoStart.value = '';
        if (odoEnd) odoEnd.value = '';
        if (litresUsed) litresUsed.value = '';
        if (bowserStart) bowserStart.value = '';
        if (bowserEnd) bowserEnd.value = '';
        if (fuelConsumption) fuelConsumption.value = '';
        if (date) date.value = '';
        if (needsReview) needsReview.checked = false;
        if (gaugeBroken) gaugeBroken.checked = false;
        
        // Clear any selected states
        document.querySelectorAll('.activity-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.field-row.selected').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Enable odo end field in case it was disabled
        const odoEndField = document.getElementById('odo-end');
        if (odoEndField) odoEndField.disabled = false;
        
        // Clear row selections
        this.selectedVehicleRow = null;
        this.selectedDriverRow = null;
        document.querySelectorAll('.selected').forEach(row => row.classList.remove('selected'));
        
        // Clear compact summaries
        const summaryElements = ['activity-summary', 'field-summary', 'odometer-summary', 'fuel-data-summary'];
        summaryElements.forEach(id => {
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
    isCacheValid() {
        return this.cacheTimestamp && (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }

    invalidateCache() {
        this.vehiclesCache = null;
        this.driversCache = null;
        this.bowsersCache = null;
        this.activitiesCache = null;
        this.fieldsCache = null;
        this.cacheTimestamp = null;
    }

    // Enhanced caching for offline support
    async cacheEssentialData() {
        try {
            console.log('Caching essential data for offline use...');
            
            // Cache vehicles, drivers, bowsers, activities, and fields
            await Promise.all([
                this.fetchVehiclesFromSupabase(),
                this.fetchDriversFromSupabase(), 
                this.fetchBowsersFromSupabase(),
                this.fetchActivitiesFromSupabase(),
                this.fetchFieldsFromSupabase()
            ]);
            
            console.log('Essential data cached successfully');
        } catch (error) {
            console.error('Failed to cache essential data:', error);
        }
    }

    async fetchVehiclesFromSupabase() {
        // Return cached data if valid
        if (this.vehiclesCache && this.isCacheValid()) {
            return this.vehiclesCache;
        }

        const { data, error } = await window.supabaseClient
            .from('vehicles')
            .select('*')
            .order('code', { ascending: true });
        if (error) {
            console.error('Error fetching vehicles:', error);
            return [];
        }
        
        // Update cache
        this.vehiclesCache = data;
        this.cacheTimestamp = Date.now();
        return data;
    }

    getUniqueVehicleTypes(vehicles) {
        const types = vehicles
            .map(vehicle => vehicle.type)
            .filter(type => type && type.trim()) // Filter out null/empty types
            .filter((type, index, arr) => arr.indexOf(type) === index) // Remove duplicates
            .sort();
        return types.length > 0 ? types.join(',') : 'other';
    }

    convertTypeToClassName(type) {
        if (!type) return 'other';
        return type.toLowerCase()
            .replace(/\s+/g, '-')    // Replace spaces with hyphens
            .replace(/\//g, '-')     // Replace slashes with hyphens
            .replace(/[^a-z0-9-]/g, '') // Remove any other special characters
            .replace(/-+/g, '-')     // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
    }

    async fetchDriversFromSupabase() {
        // Return cached data if valid
        if (this.driversCache && this.isCacheValid()) {
            return this.driversCache;
        }

        const { data, error } = await window.supabaseClient
            .from('drivers')
            .select('*')
            .order('code', { ascending: true });
        if (error) {
            console.error('Error fetching drivers:', error);
            return [];
        }
        
        // Update cache
        this.driversCache = data;
        this.cacheTimestamp = Date.now();
        return data;
    }

    async fetchBowsersFromSupabase() {
        // Return cached data if valid
        if (this.bowsersCache && this.isCacheValid()) {
            return this.bowsersCache;
        }

        const { data, error } = await window.supabaseClient
            .from('bowsers')
            .select('*')
            .order('name', { ascending: true });
        if (error) {
            console.error('Error fetching bowsers:', error);
            return [];
        }
        
        // Update cache
        this.bowsersCache = data;
        this.cacheTimestamp = Date.now();
        return data;
    }

    async fetchFuelEntriesFromSupabase() {
        const { data, error } = await window.supabaseClient
            .from('fuel_entries')
            .select('*')
            .order('date', { ascending: false });
        if (error) {
            console.error('Error fetching fuel entries:', error);
            return [];
        }
        return data;
    }

    async fetchActivitiesFromSupabase() {
        // Return cached data if valid
        if (this.activitiesCache && this.isCacheValid()) {
            return this.activitiesCache;
        }

        const { data, error } = await window.supabaseClient
            .from('activities')
            .select('*')
            .order('category', { ascending: true })
            .order('code', { ascending: true });
        if (error) {
            console.error('Error fetching activities:', error);
            return [];
        }
        
        // Update cache
        this.activitiesCache = data;
        this.cacheTimestamp = Date.now();
        return data;
    }

    async fetchFieldsFromSupabase() {
        // Return cached data if valid
        if (this.fieldsCache && this.isCacheValid()) {
            return this.fieldsCache;
        }

        const { data, error } = await window.supabaseClient
            .from('fields')
            .select('*')
            .order('crop_type', { ascending: true })
            .order('field_code', { ascending: true });
        if (error) {
            console.error('Error fetching fields:', error);
            return [];
        }
        
        // Update cache
        this.fieldsCache = data;
        this.cacheTimestamp = Date.now();
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
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.9rem;">No vehicles found. Tap + to add.</td></tr>';
                return;
            }

            // Get current ODO for each vehicle from latest fuel entry
            const vehiclesWithOdo = await Promise.all(
                vehicles.map(async (vehicle) => {
                    try {
                        const { data: records, error } = await window.supabaseClient
                            .from('fuel_entries')
                            .select('odo_end')
                            .eq('vehicle_id', vehicle.id)
                            .order('date', { ascending: false })
                            .limit(1);
                        
                        if (error) {
                            console.warn(`Error fetching ODO for vehicle ${vehicle.id}:`, error);
                        }
                        
                        const currentOdo = (records && records.length > 0) ? records[0].odo_end : 0;
                        return { ...vehicle, currentOdo };
                    } catch (error) {
                        console.warn(`Failed to fetch ODO for vehicle ${vehicle.id}:`, error);
                        return { ...vehicle, currentOdo: 0 };
                    }
                })
            );

            // Get dynamic vehicle types from the data
            const vehicleTypes = this.getUniqueVehicleTypes(vehicles);
            
            // Simple table layout for all screen sizes
            tableBody.innerHTML = vehiclesWithOdo.map(vehicle => {
                const typeClass = this.convertTypeToClassName(vehicle.type);
                return `
                <tr data-id="${vehicle.id}" class="mobile-row">
                    <td class="editable-cell mobile-cell" data-field="code" data-type="text">${vehicle.code || ''}</td>
                    <td class="editable-cell mobile-cell" data-field="type" data-type="select" data-options="${vehicleTypes}">
                        <span class="type-badge type-${typeClass}">${vehicle.type || 'other'}</span>
                    </td>
                    <td class="editable-cell mobile-cell" data-field="name" data-type="text">${vehicle.name || ''}</td>
                    <td class="odo-cell">${(vehicle.currentOdo || 0).toFixed(2)}</td>
                </tr>
                `;
            }).join('');

            // Add inline editing event listeners
            this.setupInlineEditing('vehicles');
        } catch (error) {
            console.error('Error rendering vehicle management:', error);
            const tableBody = document.getElementById('vehicles-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.9rem;">Error loading vehicles. Please refresh.</td></tr>';
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
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.9rem;">No drivers found. Tap + to add.</td></tr>';
                return;
            }

            // Simple table layout for all screen sizes
            tableBody.innerHTML = drivers.map(driver => `
                <tr data-id="${driver.id}" class="mobile-row">
                    <td class="editable-cell mobile-cell" data-field="code" data-type="text">${driver.code || ''}</td>
                    <td class="editable-cell mobile-cell" data-field="name" data-type="text">${driver.name || ''}</td>
                    <td class="editable-cell mobile-cell" data-field="license" data-type="text">${driver.license || ''}</td>
                </tr>
            `).join('');

            // Add inline editing event listeners
            this.setupInlineEditing('drivers');
        } catch (error) {
            console.error('Error rendering driver management:', error);
            const tableBody = document.getElementById('drivers-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.9rem;">Error loading drivers. Please refresh.</td></tr>';
            }
        }
    }

    // Inline Editing Methods
    setupInlineEditing(tableType) {
        const container = document.getElementById(`${tableType}-management-body`);
        if (!container) return;

        // Remove existing listeners to prevent duplicates
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        newContainer.addEventListener('click', (e) => {
            const cell = e.target.closest('.editable-cell');
            if (cell && !cell.querySelector('input, select')) {
                this.startInlineEdit(cell, tableType);
            }
        });
    }

    startInlineEdit(cell, tableType) {
        // For type cells, get the value from the span element
        const isTypeCell = cell.dataset.field === 'type';
        const originalValue = isTypeCell ? 
            cell.querySelector('.type-badge').textContent.trim() : 
            cell.textContent.trim();
        const field = cell.dataset.field;
        const type = cell.dataset.type;
        const rowId = cell.closest('tr').dataset.id;

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            const options = cell.dataset.options.split(',');
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
                if (option === originalValue) {
                    optionElement.selected = true;
                }
                input.appendChild(optionElement);
            });
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = originalValue;
        }

        input.className = 'inline-edit-input';
        input.style.width = '100%';
        input.style.border = '1px solid #ccc';
        input.style.padding = '4px';
        input.style.borderRadius = '4px';

        // Replace cell content with input
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        if (input.type === 'text') {
            input.select();
        }

        // Handle save on blur or Enter
        const saveEdit = async () => {
            const newValue = input.value.trim();
            if (newValue !== originalValue && newValue !== '') {
                const success = await this.saveInlineEdit(tableType, rowId, field, newValue);
                if (success) {
                    if (isTypeCell) {
                        cell.innerHTML = `<span class="type-badge type-${newValue}">${newValue}</span>`;
                    } else {
                        cell.textContent = newValue;
                    }
                } else {
                    if (isTypeCell) {
                        cell.innerHTML = `<span class="type-badge type-${originalValue}">${originalValue}</span>`;
                    } else {
                        cell.textContent = originalValue;
                    }
                }
            } else {
                if (isTypeCell) {
                    cell.innerHTML = `<span class="type-badge type-${originalValue}">${originalValue}</span>`;
                } else {
                    cell.textContent = originalValue;
                }
            }
        };

        const cancelEdit = () => {
            if (isTypeCell) {
                cell.innerHTML = `<span class="type-badge type-${originalValue}">${originalValue}</span>`;
            } else {
                cell.textContent = originalValue;
            }
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    async saveInlineEdit(tableType, id, field, value) {
        try {
            const { error } = await window.supabaseClient
                .from(tableType)
                .update({ [field]: value })
                .eq('id', id);

            if (error) {
                console.error(`Error updating ${tableType}:`, error);
                alert(`Error updating ${tableType.slice(0, -1)}: ${error.message}`);
                return false;
            }

            // Invalidate cache to ensure fresh data
            this.invalidateCache();
            
            // Also refresh the fuel entry tables if they're showing
            if (tableType === 'vehicles') {
                this.renderVehicles();
            } else if (tableType === 'drivers') {
                this.renderDrivers();
            } else if (tableType === 'bowsers') {
                // No need to refresh fuel entry tables for bowsers
            }

            return true;
        } catch (error) {
            console.error(`Error saving ${tableType} edit:`, error);
            alert(`Error saving changes. Please try again.`);
            return false;
        }
    }

    // Add New Item Methods
    async addNewVehicle() {
        const code = prompt('Enter vehicle code:');
        if (!code || !code.trim()) return;

        const name = prompt('Enter vehicle name:');
        if (!name || !name.trim()) return;

        const type = prompt('Enter vehicle type (tractor/bakkie/truck/loader/utility/other):');
        if (!type || !type.trim()) return;

        const vehicleData = {
            code: code.trim(),
            name: name.trim(),
            type: type.trim().toLowerCase()
        };

        try {
            const { error } = await window.supabaseClient
                .from('vehicles')
                .insert([vehicleData]);

            if (error) {
                console.error('Error adding vehicle:', error);
                alert('Error adding vehicle: ' + error.message);
                return;
            }

            alert('Vehicle added successfully!');
            this.invalidateCache();
            await this.renderVehicleManagement();
            await this.renderVehicles();
        } catch (error) {
            console.error('Error adding vehicle:', error);
            alert('Error adding vehicle. Please try again.');
        }
    }

    async addNewDriver() {
        const code = prompt('Enter driver code:');
        if (!code || !code.trim()) return;

        const name = prompt('Enter driver name:');
        if (!name || !name.trim()) return;

        const license = prompt('Enter license number (optional):');

        const driverData = {
            code: code.trim(),
            name: name.trim(),
            license: license ? license.trim() : null
        };

        try {
            const { error } = await window.supabaseClient
                .from('drivers')
                .insert([driverData]);

            if (error) {
                console.error('Error adding driver:', error);
                alert('Error adding driver: ' + error.message);
                return;
            }

            alert('Driver added successfully!');
            this.invalidateCache();
            await this.renderDriverManagement();
            await this.renderDrivers();
        } catch (error) {
            console.error('Error adding driver:', error);
            alert('Error adding driver. Please try again.');
        }
    }

    // Bowser Management Methods
    async renderBowserManagement() {
        try {
            const bowsers = await this.fetchBowsersFromSupabase();
            const tableBody = document.getElementById('bowsers-management-body');
            
            if (!tableBody) {
                console.error('Bowser management table body not found');
                return;
            }

            if (bowsers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.9rem;">No bowsers found. Tap + to add.</td></tr>';
                return;
            }

            // Simple table layout for all screen sizes
            tableBody.innerHTML = bowsers.map(bowser => `
                <tr data-id="${bowser.id}" class="mobile-row">
                    <td class="editable-cell mobile-cell" data-field="name" data-type="text">${bowser.name || ''}</td>
                    <td class="editable-cell mobile-cell" data-field="capacity" data-type="number">${bowser.capacity || 0}</td>
                    <td class="current-reading-cell">${(bowser.current_reading || 0).toFixed(2)}</td>
                    <td class="status-cell">
                        <span class="status-badge ${bowser.status || 'active'}">${bowser.status || 'Active'}</span>
                    </td>
                </tr>
            `).join('');

            // Add inline editing event listeners
            this.setupInlineEditing('bowsers');
        } catch (error) {
            console.error('Error rendering bowser management:', error);
            const tableBody = document.getElementById('bowsers-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.9rem;">Error loading bowsers. Please refresh.</td></tr>';
            }
        }
    }

    // Activities Management Methods
    async renderActivitiesManagement() {
        try {
            const activities = await this.fetchActivitiesFromSupabase();
            const tableBody = document.getElementById('activities-management-body');
            
            if (!tableBody) {
                console.error('Activities management table body not found');
                return;
            }

            if (activities.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.9rem;">No activities found. Please add activities via SQL.</td></tr>';
                return;
            }

            // Simple table layout for all screen sizes
            tableBody.innerHTML = activities.map(activity => `
                <tr data-id="${activity.id}" class="mobile-row">
                    <td class="mobile-cell">${activity.code || ''}</td>
                    <td class="mobile-cell">${activity.name || ''}</td>
                    <td class="mobile-cell">${activity.category || ''}</td>
                    <td class="mobile-cell">${activity.name_zulu || ''}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error rendering activities management:', error);
            const tableBody = document.getElementById('activities-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.9rem;">Error loading activities. Please refresh.</td></tr>';
            }
        }
    }

    // Fields Management Methods
    async renderFieldsManagement() {
        try {
            const fields = await this.fetchFieldsFromSupabase();
            const tableBody = document.getElementById('fields-management-body');
            
            if (!tableBody) {
                console.error('Fields management table body not found');
                return;
            }

            if (fields.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #64748b; font-size: 0.9rem;">No fields found. Please add fields via SQL.</td></tr>';
                return;
            }

            // Simple table layout for all screen sizes
            tableBody.innerHTML = fields.map(field => `
                <tr data-id="${field.id}" class="mobile-row">
                    <td class="mobile-cell">${field.field_code || ''}</td>
                    <td class="mobile-cell">${field.field_name || ''}</td>
                    <td class="mobile-cell">${field.crop_type || ''}</td>
                    <td class="mobile-cell">${field.area_hectares ? field.area_hectares.toFixed(1) + ' ha' : ''}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error rendering fields management:', error);
            const tableBody = document.getElementById('fields-management-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #dc2626; font-size: 0.9rem;">Error loading fields. Please refresh.</td></tr>';
            }
        }
    }

    async addNewBowser() {
        const name = prompt('Enter bowser name (e.g., Tank A):');
        if (!name || !name.trim()) return;

        const capacity = prompt('Enter bowser capacity in litres:');
        if (!capacity || isNaN(parseFloat(capacity))) {
            alert('Please enter a valid capacity.');
            return;
        }

        const currentReading = prompt('Enter current reading in litres:', '0');
        if (!currentReading || isNaN(parseFloat(currentReading))) {
            alert('Please enter a valid current reading.');
            return;
        }

        const bowserData = {
            name: name.trim(),
            capacity: parseFloat(capacity),
            current_reading: parseFloat(currentReading),
            status: 'active'
        };

        try {
            const { error } = await window.supabaseClient
                .from('bowsers')
                .insert([bowserData]);

            if (error) {
                console.error('Error adding bowser:', error);
                alert('Error adding bowser: ' + error.message);
                return;
            }

            alert('Bowser added successfully!');
            this.invalidateCache();
            await this.renderBowserManagement();
        } catch (error) {
            console.error('Error adding bowser:', error);
            alert('Error adding bowser. Please try again.');
        }
    }

    async addBowserRefill() {
        const bowsers = await this.fetchBowsersFromSupabase();
        if (bowsers.length === 0) {
            alert('No bowsers found. Please add a bowser first.');
            return;
        }

        const bowserOptions = bowsers.map(b => `${b.id}:${b.name}`).join(',');
        const bowserId = prompt(`Select bowser (${bowsers.map(b => `${b.id}=${b.name}`).join(', ')}):`);
        if (!bowserId || isNaN(parseInt(bowserId))) return;

        const selectedBowser = bowsers.find(b => b.id === parseInt(bowserId));
        if (!selectedBowser) {
            alert('Invalid bowser selection.');
            return;
        }

        const supplier = prompt('Enter supplier name:');
        if (!supplier || !supplier.trim()) return;

        const amount = prompt('Enter fuel amount delivered (L):');
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            alert('Please enter a valid fuel amount.');
            return;
        }

        const cost = prompt('Enter total cost (optional):', '0');
        const costValue = cost && !isNaN(parseFloat(cost)) ? parseFloat(cost) : 0;

        const date = prompt('Enter delivery date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            const readingBefore = selectedBowser.current_reading || 0;
            const readingAfter = readingBefore + parseFloat(amount);

            // Create refill record
            const refillData = {
                bowser_id: selectedBowser.id,
                date: date,
                supplier: supplier.trim(),
                amount: parseFloat(amount),
                reading_before: readingBefore,
                reading_after: readingAfter,
                cost: costValue,
                timestamp: new Date().toISOString()
            };

            const { error: refillError } = await window.supabaseClient
                .from('bowser_refills')
                .insert([refillData]);

            if (refillError) {
                console.error('Error adding refill record:', refillError);
                alert('Error adding refill record: ' + refillError.message);
                return;
            }

            // Update bowser current reading
            const { error: bowserError } = await window.supabaseClient
                .from('bowsers')
                .update({ current_reading: readingAfter })
                .eq('id', selectedBowser.id);

            if (bowserError) {
                console.error('Error updating bowser reading:', bowserError);
                alert('Refill recorded but failed to update bowser reading.');
            }

            alert('Bowser refill recorded successfully!');
            this.invalidateCache();
            await this.renderRefillHistory();
            await this.renderBowserManagement();

        } catch (error) {
            console.error('Error adding bowser refill:', error);
            alert('Error adding bowser refill. Please try again.');
        }
    }

    async renderRefillHistory() {
        try {
            const { data: refills, error } = await window.supabaseClient
                .from('bowser_refills')
                .select(`
                    *,
                    bowsers (name)
                `)
                .order('date', { ascending: false })
                .limit(20);

            const tableBody = document.getElementById('refill-history-body');
            if (!tableBody) return;

            if (error || !refills) {
                console.error('Error fetching refill history:', error);
                tableBody.innerHTML = '<tr><td colspan="7">Error loading refill history.</td></tr>';
                return;
            }

            if (refills.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1rem; color: #64748b;">No refill records found.</td></tr>';
                return;
            }

            tableBody.innerHTML = refills.map(refill => `
                <tr>
                    <td>${new Date(refill.date).toLocaleDateString()}</td>
                    <td>${refill.bowsers?.name || 'Unknown'}</td>
                    <td>${refill.supplier || 'N/A'}</td>
                    <td>${refill.amount?.toFixed(1) || 0}L</td>
                    <td>${refill.reading_before?.toFixed(1) || 0}</td>
                    <td>${refill.reading_after?.toFixed(1) || 0}</td>
                    <td>R${refill.cost?.toFixed(2) || '0.00'}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error rendering refill history:', error);
        }
    }

    async reconcileMonth() {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            // Get all fuel entries for current month
            const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
            const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

            const { data: fuelEntries, error: fuelError } = await window.supabaseClient
                .from('fuel_entries')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);

            // Get all refills for current month
            const { data: refills, error: refillError } = await window.supabaseClient
                .from('bowser_refills')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);

            if (fuelError || refillError) {
                alert('Error fetching reconciliation data.');
                return;
            }

            const totalFuelDispensed = fuelEntries.reduce((sum, entry) => sum + (entry.fuel_amount || 0), 0);
            const totalFuelReceived = refills.reduce((sum, refill) => sum + (refill.amount || 0), 0);
            const discrepancyCount = fuelEntries.filter(entry => entry.has_discrepancy).length;
            const totalCost = refills.reduce((sum, refill) => sum + (refill.cost || 0), 0);

            // Create reconciliation record
            const reconciliationData = {
                month: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`,
                fuel_dispensed: totalFuelDispensed,
                fuel_received: totalFuelReceived,
                discrepancy_count: discrepancyCount,
                total_cost: totalCost,
                status: 'completed',
                reconciled_date: new Date().toISOString(),
                notes: `Reconciliation for ${monthName}`
            };

            const { error: recError } = await window.supabaseClient
                .from('monthly_reconciliations')
                .upsert([reconciliationData], { onConflict: 'month' });

            if (recError) {
                console.error('Error saving reconciliation:', recError);
                alert('Error saving reconciliation record.');
                return;
            }

            alert(`Reconciliation completed for ${monthName}!\n\nFuel Received: ${totalFuelReceived.toFixed(1)}L\nFuel Dispensed: ${totalFuelDispensed.toFixed(1)}L\nDiscrepancies: ${discrepancyCount}\nTotal Cost: R${totalCost.toFixed(2)}`);
            
            await this.updateReconciliationStatus();

        } catch (error) {
            console.error('Error during reconciliation:', error);
            alert('Error during reconciliation process.');
        }
    }

    async updateReconciliationStatus() {
        try {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

            const { data: reconciliation, error } = await window.supabaseClient
                .from('monthly_reconciliations')
                .select('*')
                .eq('month', currentMonth)
                .single();

            const statusElement = document.getElementById('reconciliation-status');
            if (!statusElement) return;

            if (error || !reconciliation) {
                statusElement.innerHTML = `
                    <div style="color: var(--warning); padding: 1rem; background: #fef3c7; border-radius: 6px;">
                        ⏳ ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} reconciliation pending
                    </div>
                `;
            } else {
                statusElement.innerHTML = `
                    <div style="color: var(--success); padding: 1rem; background: #dcfce7; border-radius: 6px;">
                        ✅ ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} reconciliation completed
                        <br><small>Reconciled on ${new Date(reconciliation.reconciled_date).toLocaleDateString()}</small>
                        <br><small>Fuel received: ${reconciliation.fuel_received?.toFixed(1)}L | Dispensed: ${reconciliation.fuel_dispensed?.toFixed(1)}L</small>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error updating reconciliation status:', error);
        }
    }

    // Vehicle Modal Methods (REMOVED - using inline editing now)

    async deleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle? This will also delete all associated fuel records.')) {
            return;
        }
        
        try {
            // First delete associated fuel entries
            const { error: fuelError } = await window.supabaseClient
                .from('fuel_entries')
                .delete()
                .eq('vehicle_id', vehicleId);
                
            if (fuelError) {
                console.error('Error deleting fuel entries:', fuelError);
                alert('Error deleting associated fuel records.');
                return;
            }
            
            // Then delete the vehicle
            const { error: vehicleError } = await window.supabaseClient
                .from('vehicles')
                .delete()
                .eq('id', vehicleId);
                
            if (vehicleError) {
                console.error('Error deleting vehicle:', vehicleError);
                alert('Error deleting vehicle.');
                return;
            }
            
            alert('Vehicle and associated records deleted successfully!');
            this.invalidateCache(); // Clear cache to force fresh data
            await this.renderVehicleManagement();
            await this.renderVehicles(); // Refresh fuel entry vehicles list
            
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Error deleting vehicle. Please try again.');
        }
    }

    // Driver Modal Methods (REMOVED - using inline editing now)

    async deleteDriver(driverId) {
        if (!confirm('Are you sure you want to delete this driver? This will also delete all associated fuel records.')) {
            return;
        }
        
        try {
            // First delete associated fuel entries
            const { error: fuelError } = await window.supabaseClient
                .from('fuel_entries')
                .delete()
                .eq('driver_id', driverId);
                
            if (fuelError) {
                console.error('Error deleting fuel entries:', fuelError);
                alert('Error deleting associated fuel records.');
                return;
            }
            
            // Then delete the driver
            const { error: driverError } = await window.supabaseClient
                .from('drivers')
                .delete()
                .eq('id', driverId);
                
            if (driverError) {
                console.error('Error deleting driver:', driverError);
                alert('Error deleting driver.');
                return;
            }
            
            alert('Driver and associated records deleted successfully!');
            this.invalidateCache(); // Clear cache to force fresh data
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
            const { data: fuelEntries, error } = await window.supabaseClient
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name)
                `);
                
            if (error) {
                console.error('Error fetching fuel entries for stats:', error);
                return;
            }

            // Get date ranges
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // Filter entries
            const todayEntries = fuelEntries.filter(entry => entry.date === todayStr);
            const monthEntries = fuelEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
            });

            // Calculate metrics
            const monthlyFuel = monthEntries.reduce((sum, entry) => sum + (entry.fuel_amount || 0), 0);
            const dailyFuel = todayEntries.reduce((sum, entry) => sum + (entry.fuel_amount || 0), 0);
            const vehiclesRefueledToday = new Set(todayEntries.map(entry => entry.vehicle_id)).size;
            const discrepancyCount = fuelEntries.filter(entry => entry.has_discrepancy).length;

            // Find worst performer (highest consumption)
            const vehicleConsumption = {};
            fuelEntries.forEach(entry => {
                if (!entry.vehicles || !entry.HrsKm || entry.HrsKm <= 0) return;
                
                const vehicleKey = entry.vehicle_id;
                if (!vehicleConsumption[vehicleKey]) {
                    vehicleConsumption[vehicleKey] = {
                        code: entry.vehicles.code,
                        totalFuel: 0,
                        totalHrsKm: 0
                    };
                }
                vehicleConsumption[vehicleKey].totalFuel += entry.fuel_amount || 0;
                vehicleConsumption[vehicleKey].totalHrsKm += entry.HrsKm || 0;
            });

            let worstPerformer = '-';
            let highestConsumption = 0;
            Object.values(vehicleConsumption).forEach(vehicle => {
                if (vehicle.totalHrsKm > 0) {
                    const consumption = (vehicle.totalFuel / vehicle.totalHrsKm) * 100;
                    if (consumption > highestConsumption) {
                        highestConsumption = consumption;
                        worstPerformer = `${vehicle.code} (${consumption.toFixed(1)})`;
                    }
                }
            });

            // Get bowser information
            const bowsers = await this.fetchBowsersFromSupabase();
            const primaryBowser = bowsers.length > 0 ? bowsers[0] : null;
            
            // Update dashboard elements
            document.getElementById('monthly-fuel').textContent = `${monthlyFuel.toFixed(1)} L`;
            document.getElementById('daily-fuel').textContent = `${dailyFuel.toFixed(1)} L`;
            document.getElementById('vehicles-refueled-today').textContent = vehiclesRefueledToday;
            document.getElementById('discrepancy-count').textContent = discrepancyCount;
            document.getElementById('worst-performer').textContent = worstPerformer;

            // Update tank level and status
            if (primaryBowser) {
                const tankLevel = primaryBowser.current_reading || 0;
                const isLowFuel = tankLevel < 2500;
                const tankCard = document.getElementById('tank-status-card');
                
                document.getElementById('tank-level').textContent = `${tankLevel.toFixed(0)} L`;
                
                if (isLowFuel) {
                    tankCard.classList.add('low-fuel-warning');
                    document.getElementById('tank-level').style.color = 'var(--error)';
                } else {
                    tankCard.classList.remove('low-fuel-warning');
                    document.getElementById('tank-level').style.color = '';
                }
                
                // Set discrepancy count color
                const discrepancyCard = document.getElementById('discrepancy-count');
                if (discrepancyCount > 0) {
                    discrepancyCard.style.color = 'var(--error)';
                } else {
                    discrepancyCard.style.color = 'var(--success)';
                }
            }

        } catch (error) {
            console.error('Error calculating stats:', error);
        }
    }

    // Removed updateBowserDashboard - tank status now integrated in main stats

    async renderVehicleSummary(period = 'week') {
        try {
            // Calculate date range based on period
            const now = new Date();
            let startDate;
            
            if (period === 'week') {
                const dayOfWeek = now.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
                startDate = new Date(now);
                startDate.setDate(now.getDate() - daysToMonday);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            let query = window.supabaseClient
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, registration, type, description, license)
                `);

            if (startDate) {
                query = query.gte('date', startDate.toISOString().split('T')[0]);
            }

            const { data: fuelEntries, error } = await query;
                
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
                
                vehicleStats[vehicleKey].totalFuel += entry.fuel_amount || 0;
                vehicleStats[vehicleKey].totalDistance += entry.HrsKm || 0;
                vehicleStats[vehicleKey].recordCount++;
            });

            const summaryTableBody = document.getElementById('vehicle-summary-body');
            if (summaryTableBody) {
                const summaryHTML = Object.values(vehicleStats).map(stat => {
                    const avgConsumption = stat.totalDistance > 0 ? 
                        (stat.totalFuel / stat.totalDistance) * 100 : 0;
                    
                    return `
                        <tr>
                            <td class="vehicle-col"><strong>${stat.vehicle.code}</strong> - ${stat.vehicle.name}</td>
                            <td class="fuel-col">${stat.totalFuel.toFixed(1)}</td>
                            <td class="hrskm-col">${stat.totalDistance.toFixed(1)}</td>
                            <td class="consumption-col">${avgConsumption.toFixed(2)}</td>
                            <td class="records-col">${stat.recordCount}</td>
                        </tr>
                    `;
                }).join('');
                
                summaryTableBody.innerHTML = summaryHTML || '<tr><td colspan="5">No vehicle data available.</td></tr>';
            }
        } catch (error) {
            console.error('Error rendering vehicle summary:', error);
        }
    }

    async renderRecentRecords(period = 'week') {
        try {
            // Calculate date range and limit based on period
            const now = new Date();
            let startDate, limit = 50;
            
            if (period === 'today') {
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                limit = 20;
            } else if (period === 'week') {
                const dayOfWeek = now.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now);
                startDate.setDate(now.getDate() - daysToMonday);
                startDate.setHours(0, 0, 0, 0);
                limit = 30;
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                limit = 100;
            } else if (period === 'all') {
                startDate = null;
                limit = 200;
            }

            let query = window.supabaseClient
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name),
                    drivers (code, name),
                    bowsers (name)
                `)
                .order('date', { ascending: false })
                .limit(limit);

            if (startDate) {
                query = query.gte('date', startDate.toISOString().split('T')[0]);
            }

            const { data: recentEntries, error } = await query;
                
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
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th class="flag-column">✓</th>
                                    <th>Vehicle</th>
                                    <th>Fuel</th>
                                    <th>ODO Start</th>
                                    <th>ODO End</th>
                                    <th>HrsKm</th>
                                    <th>Tank Start</th>
                                    <th>Tank End</th>
                                    <th>Tank</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentEntries.map(entry => {
                                    const date = new Date(entry.date);
                                    const dateTimeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                    return `
                                    <tr class="${entry.has_discrepancy ? 'discrepancy-row' : ''}">
                                        <td>${dateTimeStr}</td>
                                        <td class="flag-column">${entry.has_discrepancy ? '❌' : '✅'}</td>
                                        <td>${entry.vehicles?.code || 'N/A'}</td>
                                        <td>${entry.fuel_amount?.toFixed(1) || 0}L</td>
                                        <td>${entry.odo_start?.toFixed(1) || 0}</td>
                                        <td>${entry.odo_end?.toFixed(1) || 0}</td>
                                        <td>${entry.HrsKm?.toFixed(1) || 0}</td>
                                        <td>${entry.bowser_start?.toFixed(1) || 0}</td>
                                        <td>${entry.bowser_end?.toFixed(1) || 0}</td>
                                        <td>${entry.bowsers?.name || 'Tank A'}</td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>
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
            const { data: entries, error } = await window.supabaseClient
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
                // Generate rolling 12-month calendar like GitHub
                const today = new Date();
                const endDate = new Date(today);
                
                // Start from 12 months ago, beginning of week (Sunday)
                const startDate = new Date(today);
                startDate.setFullYear(today.getFullYear() - 1);
                startDate.setMonth(today.getMonth());
                startDate.setDate(today.getDate());
                
                // Find the Sunday before the start date
                const dayOfWeek = startDate.getDay();
                startDate.setDate(startDate.getDate() - dayOfWeek);
                
                // Generate all days from start to end
                const days = [];
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const count = activityCounts[dateStr] || 0;
                    
                    let level = 0;
                    if (count >= 7) level = 4;
                    else if (count >= 5) level = 3;
                    else if (count >= 3) level = 2;
                    else if (count >= 1) level = 1;
                    
                    days.push(`<div class="calendar-cell level-${level}" title="${dateStr}: ${count} records"></div>`);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Fill remaining cells to complete the last week if needed
                const remainingCells = 7 - (days.length % 7);
                if (remainingCells < 7) {
                    for (let i = 0; i < remainingCells; i++) {
                        const nextDate = new Date(currentDate);
                        nextDate.setDate(currentDate.getDate() + i);
                        const dateStr = nextDate.toISOString().split('T')[0];
                        days.push(`<div class="calendar-cell" title="${dateStr}: Future"></div>`);
                    }
                }
                
                calendarGrid.innerHTML = days.join('');
                
                // Update week number labels
                this.updateCalendarWeekLabels(startDate, days.length);
                
                // Setup synchronized scrolling
                this.setupCalendarScrollSync();
            }
        } catch (error) {
            console.error('Error rendering activity calendar:', error);
        }
    }

    updateCalendarWeekLabels(startDate, totalDays) {
        try {
            const weeksContainer = document.getElementById('calendar-weeks');
            if (!weeksContainer) return;
            
            const totalWeeks = Math.ceil(totalDays / 7);
            const weekLabels = [];
            
            // Generate week number labels every 5 weeks
            for (let week = 0; week < totalWeeks; week++) {
                if (week % 5 === 0) {
                    const weekDate = new Date(startDate);
                    weekDate.setDate(startDate.getDate() + (week * 7));
                    
                    // Get ISO week number
                    const weekNumber = this.getISOWeekNumber(weekDate);
                    weekLabels.push(`<div class="calendar-week-label" style="grid-column: ${week + 1};">W${weekNumber}</div>`);
                } else {
                    weekLabels.push(`<div class="calendar-week-label" style="grid-column: ${week + 1};"></div>`);
                }
            }
            
            weeksContainer.innerHTML = weekLabels.join('');
        } catch (error) {
            console.error('Error updating calendar week labels:', error);
        }
    }
    
    getISOWeekNumber(date) {
        const tempDate = new Date(date.getTime());
        tempDate.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        // January 4 is always in week 1
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count weeks from there
        return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }
    
    setupCalendarScrollSync() {
        const weeksContainer = document.getElementById('calendar-weeks');
        const calendarGrid = document.getElementById('activity-calendar-grid');
        
        if (weeksContainer && calendarGrid) {
            // Sync calendar grid scroll to weeks container
            calendarGrid.addEventListener('scroll', () => {
                weeksContainer.scrollLeft = calendarGrid.scrollLeft;
            });
            
            // Sync weeks container scroll to calendar grid
            weeksContainer.addEventListener('scroll', () => {
                calendarGrid.scrollLeft = weeksContainer.scrollLeft;
            });
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
            const { data: records, error } = await window.supabaseClient
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, registration, type, description, license),
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
                doc.text((record.fuel_amount || 0).toFixed(1), 130, yPosition);
                doc.text((record.distance || 0).toFixed(1), 160, yPosition);
                doc.text(record.distance > 0 ? ((record.fuel_amount / record.distance) * 100).toFixed(2) : 'N/A', 190, yPosition);
                
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
            
            const { data: records, error } = await window.supabaseClient
                .from('fuel_entries')
                .select(`
                    *,
                    vehicles (code, name, registration, type, description, license),
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
                ws[`E${cellRow}`] = { v: record.fuel_amount || 0, t: 'n' };
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

    // ===== OFFLINE FUNCTIONALITY METHODS =====

    initializeOfflineHandlers() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Connection restored - triggering sync');
            this.isOnline = true;
            this.updateOfflineStatus();
            this.triggerSync();
            // Refresh data when back online
            this.loadInitialData();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost - entering offline mode');
            this.isOnline = false;
            this.updateOfflineStatus();
        });

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_COMPLETE') {
                    console.log(`Synced ${event.data.syncedCount} offline entries`);
                    this.loadOfflineEntries();
                    this.showSyncNotification(event.data.syncedCount);
                }
            });
        }

        // Load any existing offline entries
        this.loadOfflineEntries();
        
        // Update UI to show offline status
        this.updateOfflineStatus();
    }

    updateOfflineStatus() {
        // Add offline indicator to the UI
        let offlineIndicator = document.getElementById('offline-indicator');
        
        if (!offlineIndicator) {
            offlineIndicator = document.createElement('div');
            offlineIndicator.id = 'offline-indicator';
            offlineIndicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(offlineIndicator);
        }

        if (this.isOnline) {
            offlineIndicator.textContent = '🟢 Online';
            offlineIndicator.style.background = '#dcfce7';
            offlineIndicator.style.color = '#16a34a';
            offlineIndicator.style.border = '1px solid #bbf7d0';
        } else {
            offlineIndicator.textContent = '🔴 Offline';
            offlineIndicator.style.background = '#fef2f2';
            offlineIndicator.style.color = '#dc2626';
            offlineIndicator.style.border = '1px solid #fecaca';
        }

        // Show offline entries count if any
        if (this.offlineEntries.length > 0) {
            offlineIndicator.textContent += ` (${this.offlineEntries.length} pending)`;
        }
    }

    async saveOfflineFuelEntry(fuelEntry) {
        try {
            const offlineEntry = {
                id: Date.now().toString(),
                data: fuelEntry,
                timestamp: new Date().toISOString()
            };

            // Save to IndexedDB
            await this.storeOfflineEntry(offlineEntry);
            
            // Update local array
            this.offlineEntries.push(offlineEntry);
            
            // Update UI
            this.updateOfflineStatus();
            
            console.log('Fuel entry saved offline:', offlineEntry.id);
            return true;
            
        } catch (error) {
            console.error('Failed to save offline entry:', error);
            return false;
        }
    }

    async storeOfflineEntry(entry) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FuelManagerDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['offlineFuelEntries'], 'readwrite');
                const store = transaction.objectStore('offlineFuelEntries');
                const addRequest = store.add(entry);
                
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('offlineFuelEntries')) {
                    db.createObjectStore('offlineFuelEntries', { keyPath: 'id' });
                }
            };
        });
    }

    async loadOfflineEntries() {
        try {
            const request = indexedDB.open('FuelManagerDB', 1);
            
            const entries = await new Promise((resolve, reject) => {
                request.onerror = () => reject(request.error);
                
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['offlineFuelEntries'], 'readonly');
                    const store = transaction.objectStore('offlineFuelEntries');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = () => resolve(getAllRequest.result);
                    getAllRequest.onerror = () => reject(getAllRequest.error);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('offlineFuelEntries')) {
                        db.createObjectStore('offlineFuelEntries', { keyPath: 'id' });
                    }
                };
            });
            
            this.offlineEntries = entries;
            this.updateOfflineStatus();
            
        } catch (error) {
            console.error('Failed to load offline entries:', error);
            this.offlineEntries = [];
        }
    }

    triggerSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then((registration) => {
                return registration.sync.register('fuel-entry-sync');
            }).then(() => {
                console.log('Background sync registered');
            }).catch((error) => {
                console.error('Background sync registration failed:', error);
                // Fallback: try to sync immediately
                this.manualSync();
            });
        } else {
            // Fallback for browsers without background sync
            this.manualSync();
        }
    }

    async manualSync() {
        if (this.syncInProgress || this.offlineEntries.length === 0) {
            return;
        }

        this.syncInProgress = true;
        console.log('Starting manual sync...');

        try {
            for (const entry of this.offlineEntries) {
                try {
                    await this.syncSingleEntry(entry);
                    await this.removeOfflineEntry(entry.id);
                    console.log('Synced entry:', entry.id);
                } catch (error) {
                    console.error('Failed to sync entry:', entry.id, error);
                }
            }
            
            // Reload offline entries to update the UI
            await this.loadOfflineEntries();
            
            console.log('Manual sync completed');
            this.showSyncNotification(this.offlineEntries.length);
            
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncSingleEntry(entry) {
        const { data, error } = await window.supabaseClient
            .from('fuel_entries')
            .insert([entry.data])
            .select();
            
        if (error) {
            throw error;
        }
        
        return data;
    }

    async removeOfflineEntry(id) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FuelManagerDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['offlineFuelEntries'], 'readwrite');
                const store = transaction.objectStore('offlineFuelEntries');
                const deleteRequest = store.delete(id);
                
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
        });
    }

    showSyncNotification(count) {
        if (count === 0) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: #dcfce7;
            color: #16a34a;
            border: 1px solid #bbf7d0;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 1001;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        notification.textContent = `✅ Synced ${count} fuel entries`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async getLastOdometerReading(vehicleId) {
        try {
            // Try to get from online database first
            if (this.isOnline) {
                const { data, error } = await window.supabaseClient
                    .from('fuel_entries')
                    .select('odo_end')
                    .eq('vehicle_id', vehicleId)
                    .order('date', { ascending: false })
                    .limit(1);
                    
                if (!error && data && data.length > 0) {
                    return data[0].odo_end;
                }
            }
            
            // Fallback: check offline entries
            const offlineReading = this.getLastOfflineOdometerReading(vehicleId);
            if (offlineReading !== null) {
                return offlineReading;
            }
            
            // If no data available, return vehicle's current odo or 0
            if (this.currentVehicle && this.currentVehicle.id === vehicleId) {
                return this.currentVehicle.currentOdo || 0;
            }
            
            return 0;
            
        } catch (error) {
            console.error('Error getting last odometer reading:', error);
            return this.getLastOfflineOdometerReading(vehicleId) || 0;
        }
    }

    getLastOfflineOdometerReading(vehicleId) {
        // Sort offline entries by timestamp and find the most recent for this vehicle
        const vehicleEntries = this.offlineEntries
            .filter(entry => entry.data.vehicle_id === vehicleId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        return vehicleEntries.length > 0 ? vehicleEntries[0].data.odo_end : null;
    }
}

// Initialize the app immediately since DOM is likely already loaded
console.log('Initializing Fleet Manager after Supabase setup...');
try {
    window.app = new FleetManager();
    console.log('Fleet Manager initialized successfully');
} catch (error) {
    console.error('Failed to initialize Fleet Manager:', error);
    alert('Failed to initialize the application. Please refresh the page.');
}

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