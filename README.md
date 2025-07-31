# FarmTrack - Fleet & Fuel Manager

A Progressive Web Application (PWA) designed for South African agricultural businesses to manage fleet fuel records with full SARS compliance. Built specifically for farming operations and vehicle fleet management.

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

### Core Functionality
- **Vehicle Fleet Management**: Add, edit, and track multiple agricultural vehicles (tractors, bakkies, trucks, loaders)
- **Driver Management**: Manage driver information, codes, and license details
- **Step-by-Step Fuel Entry**: Guided fuel logging process with validation
- **Real-time Fuel Consumption**: Automatic L/100km calculations
- **Odometer Tracking**: Track vehicle mileage and maintenance schedules

### SARS Compliance & Reporting
- **SARS-Compliant Records**: All entries include required business purpose and location data
- **Monthly/Annual Reports**: Export detailed PDF reports for tax purposes
- **CanePro Integration**: Export data in CanePro format for agricultural management systems
- **CSV Export**: Compatible with SARS reporting requirements

### Technical Features
- **Cloud Database**: Supabase backend for secure, synchronized data storage
- **Progressive Web App**: Install as a mobile/desktop app
- **Offline Capable**: Works without internet connection with local storage fallback
- **Responsive Design**: Optimized for mobile, tablet, and desktop use
- **Real-time Dashboard**: Fuel consumption analytics and vehicle summaries
- **Activity Calendar**: Visual tracking of fuel entry patterns

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
fuel_manager/
├── index.html              # Main application HTML
├── app.js                  # Core application logic with Supabase integration
├── styles.css              # Application styling and responsive design
├── manifest.json           # PWA manifest for app installation
├── sw.js                   # Service worker for offline functionality
├── supabase_config.js      # Supabase configuration loader
├── server.py              # Python development server (recommended)
├── server.js              # Node.js development server
├── start-server.bat       # Windows batch script for easy startup
├── verify.js              # Application verification utilities
├── netlify/
│   └── functions/
│       └── config.js      # Netlify function for secure config loading
└── README.md              # This documentation
```

## 🔒 Data Storage & Privacy

### Primary Storage
- **Supabase Cloud Database**: Secure, encrypted cloud storage for synchronized access across devices
- **Real-time Sync**: Changes sync instantly across all your devices
- **Secure Authentication**: Industry-standard security protocols

### Local Storage Backup
- **Browser IndexedDB**: Local backup for offline functionality
- **localStorage**: Secondary backup for smaller datasets
- **Data Export**: Regular backup capabilities with .db file downloads

### Privacy Protection
- **Business Data Only**: Only fuel, vehicle, and driver business records are stored
- **No Personal Tracking**: No location tracking or personal data collection
- **Export Control**: Full control over your data with export/import capabilities
- **GDPR Compliant**: Designed with privacy regulations in mind

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

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Supabase (PostgreSQL)
- **Storage**: IndexedDB, localStorage (offline backup)
- **Export Libraries**: 
  - jsPDF for PDF report generation
  - SheetJS (XLSX) for Excel export compatibility
- **PWA**: Service Worker for offline functionality
- **Deployment**: Netlify with serverless functions

## 🚀 Installation & Setup

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fuel_manager.git
   cd fuel_manager
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Create the required tables: `vehicles`, `drivers`, `fuel_entries`
   - Update `netlify/functions/config.js` with your Supabase credentials

3. **Run locally**
   ```bash
   python server.py
   ```
   
4. **Access the application**
   - Open http://localhost:8000 in your browser

### For Production Deployment

1. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - Set environment variables for Supabase in Netlify dashboard
   - Deploy automatically on push to main branch

2. **Install as PWA**
   - Visit your deployed URL
   - Click "Install" or "Add to Home Screen" in browser
   - Use as a native app on mobile/desktop

## 📈 Usage Guide

### Getting Started
1. **Add Vehicles**: Navigate to Vehicles section and add your fleet
2. **Add Drivers**: Navigate to Drivers section and add driver information
3. **Record Fuel**: Use the step-by-step fuel entry process
4. **Generate Reports**: Export monthly/annual reports for SARS compliance

### Best Practices
- Enter fuel records daily for accurate tracking
- Regularly export backups of your data
- Use consistent naming for fields and activities
- Review reports before submitting to SARS

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please create an issue on GitHub or contact the development team.

## 🙏 Acknowledgments

- Built for South African agricultural businesses
- Designed with SARS compliance requirements in mind
- Optimized for farming operations and fleet management