# Fleet Manager - SARS Compliant Fuel Record PWA

A Progressive Web Application for managing vehicle fuel records with SARS compliance for South African businesses.

## 🚀 Quick Start

### Option 1: Python Server (Recommended)
```bash
# Navigate to the project folder
cd C:\Sandbox\claude\fuel_manager

# Run the Python server
python server.py
```

### Option 2: Windows Batch File
```bash
# Double-click the batch file
start-server.bat
```

### Option 3: Node.js Server
```bash
# If you have Node.js installed
node server.js
```

### Option 4: Simple Python HTTP Server
```bash
# Basic Python HTTP server
python -m http.server 8000
```

**Important**: Do NOT open `index.html` directly in your browser as this will cause CORS errors.

## 🗃️ Database Storage

The SQLite database is stored using modern browser storage:

### Primary Storage: IndexedDB
- **Location**: Browser's IndexedDB (`FleetManagerDB`)
- **Advantages**: Larger storage capacity, better performance
- **Persistence**: Data persists until manually cleared

### Backup Storage: localStorage
- **Location**: Browser's localStorage (`fleetmanager_db`)
- **Purpose**: Backup and smaller databases
- **Limit**: ~5MB

### File Export
- **Manual Export**: Use debug commands to download `.db` files
- **Daily Backups**: Automatic daily backup creation
- **SARS Reports**: CSV export for compliance

## 🛠️ Debug Commands

Open browser console (F12) and use these commands:

```javascript
// Check storage information
await window.fleetDebug.checkStorage()

// Get database info
window.fleetDebug.getDatabaseInfo()

// Export database as .db file
window.fleetDebug.exportDatabase()

// Download daily backup
window.fleetDebug.downloadDailyBackup()

// Check current application state
window.fleetDebug.getCurrentState()

// Clear all data (use with caution!)
window.fleetDebug.clearAllData()
```

## 📱 Features

- **Vehicle Management**: Add, edit, and track multiple vehicles
- **Driver Management**: Manage driver information and licenses
- **Fuel Record Entry**: Step-by-step fuel logging process
- **SARS Compliance**: Export monthly/annual reports
- **Dashboard**: Fuel consumption analytics and trends
- **Activity Calendar**: GitHub-style contribution calendar
- **Offline Support**: Works without internet connection
- **Mobile Friendly**: Responsive design for all devices

## 🔧 Troubleshooting

### CORS Errors
- **Problem**: `Access to internal resource blocked by CORS policy`
- **Solution**: Use one of the server options above, don't open HTML directly

### Database Issues
- **Check Storage**: `await window.fleetDebug.checkStorage()`
- **Export Data**: `window.fleetDebug.exportDatabase()`
- **Clear Cache**: Use browser settings to clear site data

### Vehicle Selection Goes Blank
- **Check Console**: Look for JavaScript errors
- **Check State**: `window.fleetDebug.getCurrentState()`
- **Refresh**: Reload the page if database isn't ready

## 📂 File Structure

```
fleet_manager/
├── index.html          # Main application
├── app.js              # Application logic
├── styles.css          # Styling
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── server.py          # Python development server
├── server.js          # Node.js development server
├── start-server.bat   # Windows batch file
└── README.md          # This file
```

## 🔒 Data Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- Export your data regularly as backup
- Clear browser data will remove all records

## 📊 SARS Compliance

The application generates reports that include:
- Vehicle details and registration
- Driver information
- Business purpose and location
- Odometer readings and fuel consumption
- Date and activity type
- Review flags for incomplete records

Export formats: CSV files compatible with SARS requirements.

## 🌐 Browser Support

- Chrome 60+ (recommended)
- Firefox 55+
- Safari 11+
- Edge 79+

IndexedDB and localStorage are required for data persistence.