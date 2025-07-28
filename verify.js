// Verification script to check if all elements exist
console.log('Starting application verification...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking elements...');
    
    // Check navigation elements
    const navElements = ['nav-fuel-entry', 'nav-dashboard', 'nav-vehicles', 'nav-drivers'];
    navElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Check sections
    const sections = ['fuel-entry-section', 'dashboard-section', 'vehicles-section', 'drivers-section'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Check steps
    const steps = ['step-vehicle', 'step-driver', 'step-fuel-form'];
    steps.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Check tables
    const tables = ['vehicle-table-body', 'driver-table-body'];
    tables.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Check if fuel entry section is visible
    const fuelEntrySection = document.getElementById('fuel-entry-section');
    if (fuelEntrySection) {
        const isActive = fuelEntrySection.classList.contains('active');
        console.log(`Fuel entry section active: ${isActive}`);
    }
    
    // Check if vehicle step is visible
    const vehicleStep = document.getElementById('step-vehicle');
    if (vehicleStep) {
        const isActive = vehicleStep.classList.contains('active');
        console.log(`Vehicle step active: ${isActive}`);
    }
    
    console.log('Verification complete');
});