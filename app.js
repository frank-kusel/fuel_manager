// --- Supabase config import ---
// IMPORTANT: Create a file named 'supabase_config.js' with the following content:
// export const SUPABASE_URL = 'https://your-project.supabase.co';
// export const SUPABASE_KEY = 'your-anon-key';
// Make sure 'supabase_config.js' is in your .gitignore!
import { SUPABASE_URL, SUPABASE_KEY } from './supabase_config.js';

// --- Supabase client initialization ---
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fleet Manager - Minimal design with enhanced functionality
class FleetManager {
    constructor() {
        this.db = null;
        this.currentVehicle = null;
        this.currentDriver = null;
        this.currentStep = 'vehicle';
        this.selectedVehicleRow = null;
        this.selectedDriverRow = null;
        this.init();
    }

    async init() {
        console.log('Initializing Fleet Manager...');
        
        // Show fuel entry section immediately
        this.showSection('fuel-entry');
        this.showStep('vehicle');
        this.setDefaultDate();
        
        // Initialize database
        await this.initDatabase();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data if database is available
        if (this.db) {
            await this.loadInitialData();
            console.log('Initial data loaded successfully');
        } else {
            console.warn('Database not available, some features will be limited');
            // Still render the UI components with placeholder data
            this.renderVehicles();
            this.renderDrivers();
        }
        
        console.log('Fleet Manager initialization complete');
    }

    async initDatabase() {
        try {
            console.log('Initializing database...');
            
            // Check if sql.js is loaded
            if (typeof initSqlJs === 'undefined') {
                throw new Error('sql.js library not loaded. Please check your internet connection.');
            }
            
            const config = {
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            };
            const SQL = await initSqlJs(config);
            console.log('SQL.js loaded successfully');
            
            // Try to load existing database from IndexedDB first, then localStorage
            const savedDb = await this.loadDatabaseFromStorage();
            if (savedDb) {
                console.log('Loading existing database from storage');
                this.db = new SQL.Database(savedDb);
            } else {
                console.log('Creating new database');
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertInitialData();
                console.log('Database created and populated');
            }
            
            // Check if database needs migration
            await this.checkAndMigrateDatabase();
            
            // Test database connectivity
            const testStmt = this.db.prepare('SELECT COUNT(*) as count FROM vehicles');
            if (testStmt.step()) {
                const result = testStmt.getAsObject();
                console.log(`Database ready. Vehicle count: ${result.count}`);
            }
            testStmt.free();
            
        } catch (error) {
            console.error('Database initialization error:', error);
            
            // Create a fallback in-memory database for basic functionality
            console.log('Creating fallback database without persistence...');
            try {
                if (typeof initSqlJs !== 'undefined') {
                    const SQL = await initSqlJs({
                        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                    });
                    this.db = new SQL.Database();
                    await this.createTables();
                    await this.insertInitialData();
                    console.log('Fallback database created successfully');
                    
                    // Re-render UI components now that database is available
                    setTimeout(() => {
                        this.renderVehicles();
                        this.renderDrivers();
                    }, 100);
                } else {
                    throw new Error('SQL.js not available');
                }
            } catch (fallbackError) {
                console.error('Fallback database creation failed:', fallbackError);
                alert('Database system unavailable. Please check your internet connection and refresh the page.');
                // Continue with basic UI functionality
            }
        }
    }

    async createTables() {
        const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                registration TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'other',
                value REAL,
                current_odo REAL DEFAULT 0,
                description TEXT,
                license_details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS drivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                license_number TEXT,
                phone TEXT,
                email TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fuel_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER NOT NULL,
                driver_id INTEGER NOT NULL,
                activity TEXT NOT NULL,
                field_name TEXT NOT NULL,
                odo_start REAL NOT NULL,
                odo_end REAL NOT NULL,
                distance REAL NOT NULL,
                litres_used REAL NOT NULL,
                fuel_consumption REAL NOT NULL,
                gauge_broken BOOLEAN DEFAULT 0,
                needs_review BOOLEAN DEFAULT 0,
                date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                FOREIGN KEY (driver_id) REFERENCES drivers (id)
            );

            CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);
            CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
            CREATE INDEX IF NOT EXISTS idx_fuel_records_driver ON fuel_records(driver_id);
        `;

        this.db.exec(createTablesSQL);
    }
    
    async checkAndMigrateDatabase() {
        try {
            // Check if the fuel_records table has the old schema
            const schemaStmt = this.db.prepare("PRAGMA table_info(fuel_records)");
            const columns = [];
            while (schemaStmt.step()) {
                const row = schemaStmt.getAsObject();
                columns.push(row.name);
            }
            schemaStmt.free();
            
            console.log('Current fuel_records columns:', columns);
            
            // Check if we need to migrate from old schema
            if (columns.includes('location') && columns.includes('field_location') && !columns.includes('field_name')) {
                console.log('Migrating database schema from location fields to field_name...');
                
                // Create new table with correct schema
                this.db.exec(`
                    CREATE TABLE fuel_records_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        vehicle_id INTEGER NOT NULL,
                        driver_id INTEGER NOT NULL,
                        activity TEXT NOT NULL,
                        field_name TEXT NOT NULL,
                        odo_start REAL NOT NULL,
                        odo_end REAL NOT NULL,
                        distance REAL NOT NULL,
                        litres_used REAL NOT NULL,
                        fuel_consumption REAL NOT NULL,
                        gauge_broken BOOLEAN DEFAULT 0,
                        needs_review BOOLEAN DEFAULT 0,
                        date DATE NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
                        FOREIGN KEY (driver_id) REFERENCES drivers (id)
                    );
                `);
                
                // Copy data from old table, combining location fields
                this.db.exec(`
                    INSERT INTO fuel_records_new 
                    (id, vehicle_id, driver_id, activity, field_name, odo_start, odo_end, distance, litres_used, fuel_consumption, gauge_broken, needs_review, date, created_at)
                    SELECT 
                        id, vehicle_id, driver_id, activity, 
                        COALESCE(field_location, location, 'Unknown Field') as field_name,
                        odo_start, odo_end, distance, litres_used, fuel_consumption, gauge_broken, needs_review, date, created_at
                    FROM fuel_records;
                `);
                
                // Drop old table and rename new table
                this.db.exec(`
                    DROP TABLE fuel_records;
                    ALTER TABLE fuel_records_new RENAME TO fuel_records;
                    
                    CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(date);
                    CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
                    CREATE INDEX IF NOT EXISTS idx_fuel_records_driver ON fuel_records(driver_id);
                `);
                
                console.log('Database migration completed successfully');
                this.saveDatabase();
            } else if (!columns.includes('field_name')) {
                console.log('No fuel records found, migration not needed');
            } else {
                console.log('Database schema is up to date');
            }
            
        } catch (error) {
            console.error('Database migration error:', error);
            // Continue anyway - the error will be caught when trying to save records
        }
    }

    async insertInitialData() {
        // Sample vehicles with types
        const vehiclesSQL = `
            INSERT INTO vehicles (code, name, make, model, year, registration, type, value, current_odo, description, license_details) VALUES
            ('TR001', 'John Deere 6120M', 'John Deere', '6120M', 2020, 'ABC123GP', 'tractor', 850000, 1245.5, 'Main tractor for field operations', 'Tractor License: TL001234'),
            ('TR002', 'Case IH Puma 165', 'Case IH', 'Puma 165', 2019, 'DEF456GP', 'tractor', 780000, 987.2, 'Secondary tractor for harvesting', 'Tractor License: TL005678'),
            ('BK001', 'Toyota Hilux 4x4', 'Toyota', 'Hilux', 2021, 'GHI789GP', 'bakkie', 520000, 15678.0, 'General purpose bakkie', 'Vehicle License: VL001'),
            ('BK002', 'Ford Ranger Raptor', 'Ford', 'Ranger Raptor', 2022, 'JKL012GP', 'bakkie', 680000, 8932.4, 'Heavy duty pickup truck', 'Vehicle License: VL002'),
            ('LD001', 'CAT 966M', 'Caterpillar', '966M', 2018, 'MNO345GP', 'loader', 1200000, 3456.7, 'Wheel loader for material handling', 'Heavy Equipment License: HE001'),
            ('TK001', 'Isuzu NPR 400', 'Isuzu', 'NPR 400', 2020, 'PQR678GP', 'truck', 450000, 89234.2, 'Medium truck for transport', 'Truck License: TK001');
        `;

        // Sample drivers
        const driversSQL = `
            INSERT INTO drivers (code, name, license_number, phone, email, notes) VALUES
            ('DR001', 'James Henderson', 'DL123456789', '+27123456789', 'james@company.co.za', 'Senior operator - 15 years experience'),
            ('DR002', 'Sarah Mitchell', 'DL987654321', '+27987654321', 'sarah@company.co.za', 'Equipment specialist and supervisor'),
            ('DR003', 'Michael Brown', 'DL555444333', '+27555444333', 'mike@company.co.za', 'Part-time driver for light vehicles'),
            ('DR004', 'Lisa Thompson', 'DL777888999', '+27777888999', 'lisa@company.co.za', 'Heavy equipment operator');
        `;

        // Sample fuel records with field names
        const fuelRecordsSQL = `
            INSERT INTO fuel_records (vehicle_id, driver_id, activity, field_name, odo_start, odo_end, distance, litres_used, fuel_consumption, gauge_broken, needs_review, date) VALUES
            (1, 1, 'field-preparation', 'North Field A', 1200.0, 1245.5, 45.5, 18.2, 40.0, 0, 0, '2024-01-15'),
            (2, 2, 'harvesting', 'South Field B', 950.0, 987.2, 37.2, 22.4, 60.2, 0, 0, '2024-01-16'),
            (3, 3, 'transport', 'Main Depot', 15600.0, 15678.0, 78.0, 9.8, 12.6, 0, 0, '2024-01-17'),
            (4, 1, 'maintenance', 'Workshop Bay', 8900.0, 8932.4, 32.4, 15.6, 48.1, 0, 1, '2024-01-18'),
            (5, 4, 'loading', 'Quarry Site', 3400.0, 3456.7, 56.7, 45.2, 79.7, 0, 0, '2024-01-19'),
            (6, 2, 'delivery', 'East Field C', 89000.0, 89234.2, 234.2, 28.5, 12.2, 0, 0, '2024-01-20');
        `;

        try {
            this.db.exec(vehiclesSQL);
            this.db.exec(driversSQL);
            this.db.exec(fuelRecordsSQL);
            this.saveDatabase();
        } catch (error) {
            console.error('Error inserting initial data:', error);
        }
    }

    async loadDatabaseFromStorage() {
        try {
            // Temporarily skip IndexedDB to avoid issues - use localStorage only
            console.log('Using localStorage for database storage (IndexedDB temporarily disabled)');
            
            // Try localStorage
            const localStorageData = localStorage.getItem('fleetmanager_db');
            if (localStorageData) {
                console.log('Database loaded from localStorage');
                return new Uint8Array(JSON.parse(localStorageData));
            }
            
            // IndexedDB temporarily disabled due to configuration issues
            // Will be re-enabled in a future update
            
            return null;
        } catch (error) {
            console.warn('Error loading database from storage:', error);
            return null;
        }
    }
    
    async loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FleetManagerDB', 2); // Increment version to force upgrade
            
            request.onerror = () => {
                console.warn('IndexedDB open failed:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('database')) {
                    console.log('Database object store does not exist');
                    resolve(null);
                    return;
                }
                
                try {
                    const transaction = db.transaction(['database'], 'readonly');
                    const store = transaction.objectStore('database');
                    const getRequest = store.get('main');
                    
                    getRequest.onsuccess = () => {
                        const result = getRequest.result;
                        console.log('Loaded from IndexedDB:', result ? 'Data found' : 'No data');
                        resolve(result ? result.data : null);
                    };
                    
                    getRequest.onerror = () => {
                        console.warn('IndexedDB get error:', getRequest.error);
                        reject(getRequest.error);
                    };
                } catch (error) {
                    console.warn('IndexedDB transaction error:', error);
                    resolve(null);
                }
            };
            
            request.onupgradeneeded = (event) => {
                const db = request.result;
                console.log('IndexedDB upgrade needed from version', event.oldVersion, 'to', event.newVersion);
                
                // Delete existing object store if it exists with wrong configuration
                if (db.objectStoreNames.contains('database')) {
                    db.deleteObjectStore('database');
                    console.log('Deleted old database object store');
                }
                
                // Create object store with proper configuration
                const store = db.createObjectStore('database', { keyPath: 'id' });
                console.log('Created new database object store with keyPath: id');
            };
        });
    }
    
    async saveDatabase() {
        try {
            if (!this.db) return;
            const data = this.db.export();
            let saveSuccess = false;
            
            // Save to localStorage first (more reliable for now)
            try {
                const jsonData = JSON.stringify(Array.from(data));
                if (jsonData.length < 5000000) { // 5MB limit for localStorage
                    localStorage.setItem('fleetmanager_db', jsonData);
                    console.log('Database saved to localStorage successfully');
                    saveSuccess = true;
                } else {
                    console.warn('Database too large for localStorage');
                }
            } catch (localStorageError) {
                console.warn('localStorage save failed:', localStorageError);
            }
            
            // Try to save to IndexedDB as additional backup (disabled for now due to issues)
            // try {
            //     await this.saveToIndexedDB(data);
            //     if (saveSuccess) {
            //         console.log('Database saved to both localStorage and IndexedDB');
            //     } else {
            //         console.log('Database saved to IndexedDB (localStorage failed)');
            //         saveSuccess = true;
            //     }
            // } catch (indexedDbError) {
            //     console.warn('IndexedDB save failed:', indexedDbError);
            // }
            
            // Auto-backup to downloadable file periodically
            this.maybeCreateBackupFile(data);
            
            if (!saveSuccess) {
                console.warn('Database could not be persisted. Data will be lost on page refresh.');
            }
            
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }
    
    async saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FleetManagerDB', 2); // Use same version as load
            
            request.onerror = () => {
                console.error('IndexedDB save open failed:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                
                try {
                    if (!db.objectStoreNames.contains('database')) {
                        console.error('Database object store does not exist for saving');
                        reject(new Error('Object store not found'));
                        return;
                    }
                    
                    const transaction = db.transaction(['database'], 'readwrite');
                    const store = transaction.objectStore('database');
                    
                    const saveRequest = store.put({
                        id: 'main',
                        data: data,
                        timestamp: new Date().toISOString()
                    });
                    
                    saveRequest.onsuccess = () => {
                        console.log('Database saved to IndexedDB successfully');
                        resolve();
                    };
                    saveRequest.onerror = () => {
                        console.error('IndexedDB save error:', saveRequest.error);
                        reject(saveRequest.error);
                    };
                } catch (error) {
                    console.error('IndexedDB transaction error:', error);
                    reject(error);
                }
            };
            
            request.onupgradeneeded = (event) => {
                const db = request.result;
                console.log('IndexedDB upgrade during save from version', event.oldVersion, 'to', event.newVersion);
                
                // Delete existing object store if it exists with wrong configuration
                if (db.objectStoreNames.contains('database')) {
                    db.deleteObjectStore('database');
                    console.log('Deleted old database object store during save');
                }
                
                // Create object store with proper configuration
                const store = db.createObjectStore('database', { keyPath: 'id' });
                console.log('Created new database object store during save');
            };
        });
    }
    
    maybeCreateBackupFile(data) {
        const lastBackup = localStorage.getItem('last_auto_backup');
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (!lastBackup || (now - parseInt(lastBackup)) > oneDayMs) {
            // Create daily backup
            try {
                const blob = new Blob([data], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                
                // Store the backup URL for manual download
                localStorage.setItem('daily_backup_url', url);
                localStorage.setItem('last_auto_backup', now.toString());
                localStorage.setItem('backup_available', 'true');
                
                console.log('Daily backup created. Use window.fleetDebug.downloadDailyBackup() to download.');
            } catch (error) {
                console.warn('Could not create daily backup:', error);
            }
        }
    }
    
    cleanupOldBackups() {
        try {
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('fleetmanager_db_backup_'))
                .sort()
                .reverse(); // Most recent first
            
            // Remove old backups beyond the 5 most recent
            if (backupKeys.length > 5) {
                backupKeys.slice(5).forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`Removed old backup: ${key}`);
                });
            }
        } catch (error) {
            console.warn('Error cleaning up old backups:', error);
        }
    }
    
    exportDatabase() {
        try {
            if (!this.db) {
                alert('Database not available');
                return;
            }
            
            const data = this.db.export();
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.href = url;
            link.download = `fleet-manager-database-${timestamp}.db`;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log('Database exported successfully');
        } catch (error) {
            console.error('Error exporting database:', error);
            alert('Error exporting database: ' + error.message);
        }
    }
    
    getDatabaseInfo() {
        const info = {
            storageLocation: 'Browser localStorage',
            storageKey: 'fleetmanager_db',
            isPersistent: 'Yes (until browser data is cleared)',
            canExport: true,
            currentSize: 'Unknown'
        };
        
        try {
            const stored = localStorage.getItem('fleetmanager_db');
            if (stored) {
                info.currentSize = `${Math.round(stored.length / 1024)} KB`;
                info.lastSaved = new Date().toLocaleString();
            } else {
                info.currentSize = 'Not saved yet';
            }
        } catch (error) {
            info.currentSize = 'Error checking size';
        }
        
        return info;
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
            if (this.db) {
                this.renderVehicles();
                this.renderDrivers();
            }
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
        if (!this.db) {
            console.error('Database not initialized - showing placeholder message');
            const tableBody = document.getElementById('vehicle-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #64748b;">Loading vehicles... Please wait for database initialization.</td></tr>';
            }
            return;
        }

        const stmt = this.db.prepare(`
            SELECT v.*, 
                   (SELECT MAX(odo_end) FROM fuel_records fr WHERE fr.vehicle_id = v.id AND fr.gauge_broken = 0) as last_odo
            FROM vehicles v 
            ORDER BY v.type, v.code
        `);
        
        const vehicles = [];
        while (stmt.step()) {
            vehicles.push(stmt.getAsObject());
        }
        stmt.free();

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
    }

    async renderDrivers() {
        if (!this.db) {
            console.error('Database not initialized - showing placeholder message');
            const tableBody = document.getElementById('driver-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #64748b;">Loading drivers... Please wait for database initialization.</td></tr>';
            }
            return;
        }

        const stmt = this.db.prepare('SELECT * FROM drivers ORDER BY code');
        const drivers = [];
        while (stmt.step()) {
            drivers.push(stmt.getAsObject());
        }
        stmt.free();

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
    }

    selectVehicle(vehicleId) {
        console.log(`Selecting vehicle with ID: ${vehicleId}`);
        
        if (!this.db) {
            console.error('Database not available for vehicle selection');
            alert('Database not ready. Please wait a moment and try again.');
            return;
        }
        
        try {
            const stmt = this.db.prepare('SELECT * FROM vehicles WHERE id = ?');
            stmt.bind([vehicleId]);
            
            if (stmt.step()) {
                this.currentVehicle = stmt.getAsObject();
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
    // --- SUPABASE CRUD METHODS ---
    async fetchVehiclesFromSupabase() {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('id', { ascending: true });
        if (error) {
            console.error('Error fetching vehicles:', error);
            return [];
        }
        return data;
    }

    async addVehicle(vehicleObj) {
        const { error } = await supabase.from('vehicles').insert([vehicleObj]);
        if (error) {
            console.error('Error adding vehicle:', error);
            alert('Error adding vehicle.');
        } else {
            alert('Vehicle added!');
            await this.renderVehicles();
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
                
                // Set default odometer start value to last reading
                try {
                    const lastOdoStmt = this.db.prepare(`
                        SELECT MAX(odo_end) as last_odo 
                        FROM fuel_records 
                        WHERE vehicle_id = ? AND gauge_broken = 0
                    `);
                    lastOdoStmt.bind([this.currentVehicle.id]);
                    
                    if (lastOdoStmt.step()) {
                        const result = lastOdoStmt.getAsObject();
                        const lastOdo = result.last_odo || this.currentVehicle.current_odo || 0;
                        const odoStartElement = document.getElementById('odo-start');
                        if (odoStartElement) {
                            odoStartElement.value = lastOdo;
                        }
                    }
                    lastOdoStmt.free();
                } catch (odoError) {
                    console.warn('Could not set default odometer value:', odoError);
                }
                
                this.showStep('activity');
            } else {
                console.error('Driver not found in database');
                alert('Driver not found. Please try again.');
            }
            stmt.free();
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

    saveFuelRecord() {
        console.log('Saving fuel record');
        
        // Check if we have selected vehicle and driver
        if (!this.currentVehicle) {
            alert('Please select a vehicle first');
            return;
        }
        
        if (!this.currentDriver) {
            alert('Please select a driver first');
            return;
        }
        
        if (!this.db) {
            alert('Database not available. Please refresh the page.');
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

            const insertStmt = this.db.prepare(`
                INSERT INTO fuel_records 
                (vehicle_id, driver_id, activity, field_name, odo_start, odo_end, distance, litres_used, fuel_consumption, gauge_broken, needs_review, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertStmt.run([
                this.currentVehicle.id,
                this.currentDriver.id,
                activity,
                fieldName,
                odoStart,
                odoEnd,
                distance,
                litresUsed,
                consumption,
                gaugeBroken ? 1 : 0,
                needsReview ? 1 : 0,
                date
            ]);

            insertStmt.free();
            this.saveDatabase();
            
            console.log('Record saved successfully');
            
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
        const stmt = this.db.prepare(`
            SELECT v.*, 
                   COUNT(fr.id) as total_records,
                   COALESCE(SUM(fr.distance), 0) as total_distance,
                   COALESCE(SUM(fr.litres_used), 0) as total_fuel
            FROM vehicles v
            LEFT JOIN fuel_records fr ON v.id = fr.vehicle_id
            GROUP BY v.id
            ORDER BY v.type, v.code
        `);
        
        const vehicles = [];
        while (stmt.step()) {
            vehicles.push(stmt.getAsObject());
        }
        stmt.free();

        const tableBody = document.getElementById('vehicles-management-body');
        tableBody.innerHTML = vehicles.map(vehicle => `
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

    handleVehicleFormSubmit(e) {
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
            if (vehicleId) {
                const stmt = this.db.prepare(`
                    UPDATE vehicles SET 
                    code = ?, name = ?, make = ?, model = ?, year = ?, registration = ?, type = ?,
                    value = ?, current_odo = ?, description = ?, license_details = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                stmt.run([data.code, data.name, data.make, data.model, data.year, data.registration, data.type,
                         data.value, data.current_odo, data.description, data.license_details, vehicleId]);
                stmt.free();
            } else {
                const stmt = this.db.prepare(`
                    INSERT INTO vehicles (code, name, make, model, year, registration, type, value, current_odo, description, license_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run([data.code, data.name, data.make, data.model, data.year, data.registration, data.type,
                         data.value, data.current_odo, data.description, data.license_details]);
                stmt.free();
            }
            
            this.saveDatabase();
            this.hideVehicleModal();
            this.renderVehicleManagement();
            this.renderVehicles();
            alert(vehicleId ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Error saving vehicle. Please check that the vehicle code is unique.');
        }
    }

    editVehicle(vehicleId) {
        const stmt = this.db.prepare('SELECT * FROM vehicles WHERE id = ?');
        stmt.bind([vehicleId]);
        
        if (stmt.step()) {
            const vehicleData = stmt.getAsObject();
            this.showVehicleModal(vehicleData);
        }
        stmt.free();
    }

    deleteVehicle(vehicleId) {
        if (confirm('Are you sure you want to delete this vehicle? This will also delete all associated fuel records.')) {
            try {
                const deleteFuelStmt = this.db.prepare('DELETE FROM fuel_records WHERE vehicle_id = ?');
                deleteFuelStmt.run([vehicleId]);
                deleteFuelStmt.free();
                
                const deleteVehicleStmt = this.db.prepare('DELETE FROM vehicles WHERE id = ?');
                deleteVehicleStmt.run([vehicleId]);
                deleteVehicleStmt.free();
                
                this.saveDatabase();
                this.renderVehicleManagement();
                this.renderVehicles();
                alert('Vehicle deleted successfully!');
            } catch (error) {
                console.error('Error deleting vehicle:', error);
                alert('Error deleting vehicle.');
            }
        }
    }

    // Driver Management
    async renderDriverManagement() {
        const stmt = this.db.prepare(`
            SELECT d.*, 
                   COUNT(fr.id) as total_records,
                   COALESCE(SUM(fr.distance), 0) as total_distance
            FROM drivers d
            LEFT JOIN fuel_records fr ON d.id = fr.driver_id
            GROUP BY d.id
            ORDER BY d.code
        `);
        
        const drivers = [];
        while (stmt.step()) {
            drivers.push(stmt.getAsObject());
        }
        stmt.free();

        const tableBody = document.getElementById('drivers-management-body');
        tableBody.innerHTML = drivers.map(driver => `
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

    handleDriverFormSubmit(e) {
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
            if (driverId) {
                const stmt = this.db.prepare(`
                    UPDATE drivers SET 
                    code = ?, name = ?, license_number = ?, phone = ?, email = ?, notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                stmt.run([data.code, data.name, data.license_number, data.phone, data.email, data.notes, driverId]);
                stmt.free();
            } else {
                const stmt = this.db.prepare(`
                    INSERT INTO drivers (code, name, license_number, phone, email, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                stmt.run([data.code, data.name, data.license_number, data.phone, data.email, data.notes]);
                stmt.free();
            }
            
            this.saveDatabase();
            this.hideDriverModal();
            this.renderDriverManagement();
            this.renderDrivers();
            alert(driverId ? 'Driver updated successfully!' : 'Driver added successfully!');
        } catch (error) {
            console.error('Error saving driver:', error);
            alert('Error saving driver. Please check that the driver code is unique.');
        }
    }

    editDriver(driverId) {
        const stmt = this.db.prepare('SELECT * FROM drivers WHERE id = ?');
        stmt.bind([driverId]);
        
        if (stmt.step()) {
            const driverData = stmt.getAsObject();
            this.showDriverModal(driverData);
        }
        stmt.free();
    }

    deleteDriver(driverId) {
        if (confirm('Are you sure you want to delete this driver? This will also delete all associated fuel records.')) {
            try {
                const deleteFuelStmt = this.db.prepare('DELETE FROM fuel_records WHERE driver_id = ?');
                deleteFuelStmt.run([driverId]);
                deleteFuelStmt.free();
                
                const deleteDriverStmt = this.db.prepare('DELETE FROM drivers WHERE id = ?');
                deleteDriverStmt.run([driverId]);
                deleteDriverStmt.free();
                
                this.saveDatabase();
                this.renderDriverManagement();
                this.renderDrivers();
                alert('Driver deleted successfully!');
            } catch (error) {
                console.error('Error deleting driver:', error);
                alert('Error deleting driver.');
            }
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
        const statsStmt = this.db.prepare(`
            SELECT 
                COALESCE(SUM(CASE WHEN gauge_broken = 0 THEN litres_used ELSE 0 END), 0) as total_fuel,
                COALESCE(SUM(distance), 0) as total_distance,
                COUNT(DISTINCT vehicle_id) as active_vehicles,
                COALESCE(AVG(CASE WHEN gauge_broken = 0 AND fuel_consumption > 0 THEN fuel_consumption END), 0) as avg_consumption
            FROM fuel_records
        `);
        
        let stats = { totalFuel: 0, totalDistance: 0, avgConsumption: 0, activeVehicles: 0 };
        
        if (statsStmt.step()) {
            const result = statsStmt.getAsObject();
            stats.totalFuel = result.total_fuel;
            stats.totalDistance = result.total_distance;
            stats.activeVehicles = result.active_vehicles;
            stats.avgConsumption = result.avg_consumption;
        }
        statsStmt.free();
        
        return stats;
    }

    async renderVehicleSummary() {
        const stmt = this.db.prepare(`
            SELECT 
                v.code, v.name, v.type,
                COUNT(fr.id) as record_count,
                COALESCE(SUM(fr.distance), 0) as total_distance,
                COALESCE(SUM(CASE WHEN fr.gauge_broken = 0 THEN fr.litres_used ELSE 0 END), 0) as total_fuel,
                COALESCE(AVG(CASE WHEN fr.gauge_broken = 0 AND fr.fuel_consumption > 0 THEN fr.fuel_consumption END), 0) as avg_consumption,
                COUNT(CASE WHEN fr.needs_review = 1 THEN 1 END) as review_count
            FROM vehicles v
            LEFT JOIN fuel_records fr ON v.id = fr.vehicle_id
            GROUP BY v.id, v.code, v.name, v.type
            ORDER BY v.type, v.code
        `);
        
        const vehicles = [];
        while (stmt.step()) {
            vehicles.push(stmt.getAsObject());
        }
        stmt.free();

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
                        ${vehicles.map(vehicle => `
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
    }

    async renderRecentRecords() {
        const stmt = this.db.prepare(`
            SELECT 
                fr.date, fr.distance, fr.litres_used, fr.fuel_consumption, fr.activity, fr.gauge_broken, fr.needs_review,
                v.code as vehicle_code, v.type as vehicle_type, d.name as driver_name
            FROM fuel_records fr
            JOIN vehicles v ON fr.vehicle_id = v.id
            JOIN drivers d ON fr.driver_id = d.id
            ORDER BY fr.date DESC, fr.created_at DESC
            LIMIT 10
        `);
        
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();

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
                            <tr class="${record.needs_review ? 'needs-review' : ''} vehicle-type-${record.vehicle_type}">
                                <td>${new Date(record.date).toLocaleDateString()}</td>
                                <td>
                                    <div class="vehicle-type-indicator"></div>
                                    ${record.vehicle_code}
                                </td>
                                <td>${record.driver_name}</td>
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
    }

    async renderConsumptionChart() {
        // Simple chart implementation using canvas
        const canvas = document.getElementById('consumption-chart');
        const ctx = canvas.getContext('2d');
        
        // Get monthly consumption data
        const stmt = this.db.prepare(`
            SELECT 
                strftime('%Y-%m', date) as month,
                AVG(CASE WHEN gauge_broken = 0 AND fuel_consumption > 0 THEN fuel_consumption END) as avg_consumption
            FROM fuel_records
            WHERE fuel_consumption > 0 AND gauge_broken = 0
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month
            LIMIT 12
        `);
        
        const data = [];
        while (stmt.step()) {
            data.push(stmt.getAsObject());
        }
        stmt.free();

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
    }

    async renderActivityCalendar() {
        const calendarGrid = document.getElementById('activity-calendar-grid');
        
        // Get daily activity counts for the past year
        const stmt = this.db.prepare(`
            SELECT 
                date,
                COUNT(*) as record_count
            FROM fuel_records
            WHERE date >= date('now', '-1 year')
            GROUP BY date
            ORDER BY date
        `);
        
        const dailyData = {};
        while (stmt.step()) {
            const result = stmt.getAsObject();
            dailyData[result.date] = result.record_count;
        }
        stmt.free();

        // Generate calendar grid (53 weeks × 7 days)
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        let gridHTML = '';
        for (let week = 0; week < 53; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(oneYearAgo);
                currentDate.setDate(oneYearAgo.getDate() + week * 7 + day);
                
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
    exportMonthlyReport() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        const stmt = this.db.prepare(`
            SELECT 
                fr.*, v.code as vehicle_code, v.name as vehicle_name, v.make, v.model, v.year, v.registration,
                d.code as driver_code, d.name as driver_name
            FROM fuel_records fr
            JOIN vehicles v ON fr.vehicle_id = v.id
            JOIN drivers d ON fr.driver_id = d.id
            WHERE strftime('%Y', fr.date) = ? AND strftime('%m', fr.date) = ?
            ORDER BY fr.date
        `);
        stmt.bind([currentYear.toString(), currentMonth.toString().padStart(2, '0')]);
        
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();

        this.generateSARSReport(records, 'monthly', currentYear, currentMonth);
    }

    exportAnnualReport() {
        const currentYear = new Date().getFullYear();
        
        const stmt = this.db.prepare(`
            SELECT 
                fr.*, v.code as vehicle_code, v.name as vehicle_name, v.make, v.model, v.year, v.registration,
                d.code as driver_code, d.name as driver_name
            FROM fuel_records fr
            JOIN vehicles v ON fr.vehicle_id = v.id
            JOIN drivers d ON fr.driver_id = d.id
            WHERE strftime('%Y', fr.date) = ?
            ORDER BY fr.date
        `);
        stmt.bind([currentYear.toString()]);
        
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();

        this.generateSARSReport(records, 'annual', currentYear);
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
    exportCaneProFormat() {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const stmt = this.db.prepare(`
            SELECT 
                fr.*, v.code as vehicle_code, v.name as vehicle_name, v.make, v.model, v.year, v.registration,
                d.code as driver_code, d.name as driver_name
            FROM fuel_records fr
            JOIN vehicles v ON fr.vehicle_id = v.id
            JOIN drivers d ON fr.driver_id = d.id
            WHERE fr.date BETWEEN ? AND ?
            ORDER BY fr.date ASC
        `);
        stmt.bind([startOfMonth, endOfMonth]);
        
        const records = [];
        while (stmt.step()) {
            records.push(stmt.getAsObject());
        }
        stmt.free();

        if (records.length === 0) {
            alert('No records found for current month');
            return;
        }

        this.generateCaneProExcel(records);
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
            getDatabaseInfo: () => app.getDatabaseInfo(),
            exportDatabase: () => app.exportDatabase(),
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
                databaseReady: !!app.db
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