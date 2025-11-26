const fs = require('fs');
const path = require('path');

const VEHICLES_FILE = path.join(__dirname, '../data/vehicles.json');
const RESERVATIONS_FILE = path.join(__dirname, '../data/reservations.json');

let vehiclesCache = null;
let reservationsCache = null;

const ensureFiles = () => {
    if (!fs.existsSync(VEHICLES_FILE)) {
        console.error(`Vehicles file not found at: ${VEHICLES_FILE}`);
        fs.writeFileSync(VEHICLES_FILE, JSON.stringify({ vehicles: [] }, null, 2));
    }
    if (!fs.existsSync(RESERVATIONS_FILE)) {
        console.error(`Reservations file not found at: ${RESERVATIONS_FILE}`);
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify({ reservations: [] }, null, 2));
    }
};

const getVehicles = () => {
    ensureFiles();
    try {
        const data = fs.readFileSync(VEHICLES_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        vehiclesCache = parsedData.vehicles || [];
        
    } catch (error) {
        console.error('Error reading or parsing vehicles.json:', error);
        vehiclesCache = [];
    }
    return vehiclesCache;
};

const getReservations = () => {
    ensureFiles();
    try {
        const data = fs.readFileSync(RESERVATIONS_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        reservationsCache = parsedData.reservations || [];

    } catch (error) {
        console.error('Error reading or parsing reservations.json:', error);
        reservationsCache = [];
    }
    return reservationsCache;
};

const updateVehicleTotalBookings = (vehicleId) => {
    const vehiclesData = getVehicles();
    const vehicleToUpdate = vehiclesData.find(v => v.id === vehicleId);

    if (vehicleToUpdate) {
        // Increment the persistent counter - IMP
        vehicleToUpdate.totalBookings = (vehicleToUpdate.totalBookings || 0) + 1;
        
        try {
            fs.writeFileSync(VEHICLES_FILE, JSON.stringify({ vehicles: vehiclesData }, null, 2));
            
            // TODO - Check if this required else remove
            vehiclesCache = vehiclesData;
            
            console.log(`Vehicle ${vehicleId} total bookings incremented to ${vehicleToUpdate.totalBookings}`);
        } catch (error) {
            console.error('Error writing updated vehicle data:', error);
            throw new Error('Failed to update vehicle data.');
        }
    } else {
        console.error(`Attempted to update non-existent vehicle ID: ${vehicleId}`);
    }
};

const addReservation = (newReservation) => {
    const reservations = getReservations();
    
    // Simple ID
    const newId = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) + 1 : 18726;
    newReservation.id = newId;

    reservations.push(newReservation);

    try {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify({ reservations }, null, 2));
        
        // TODO - Check if this required else remove
        reservationsCache = reservations;
        
        updateVehicleTotalBookings(newReservation.vehicleId);

        return newReservation;
    } catch (error) {
        console.error('Error writing reservation to file:', error);
        throw new Error('Failed to save reservation due to file system error.');
    }
};

module.exports = {
    getVehicles,
    getReservations,
    addReservation,
    updateVehicleTotalBookings //TODO - remove if not required to export
};