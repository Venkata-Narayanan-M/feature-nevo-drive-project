const express = require('express');
const router = express.Router();
const DataHandler = require('../utils/dataHandler');

const checkConflict = (existingRes, newStart, newEnd, vehicle) => {
    const existingStart = new Date(existingRes.startDateTime).getTime();
    const existingEnd = new Date(existingRes.endDateTime).getTime();
    
    const padding = vehicle.minimumMinutesBetweenBookings * 60 * 1000;
    const paddedExistingStart = existingStart - padding;
    const paddedExistingEnd = existingEnd + padding;
    
    const conflict = newStart.getTime() < paddedExistingEnd && newEnd.getTime() > paddedExistingStart;

    return conflict;
};

const checkOperatingHours = (vehicle, date, start, end) => {
    const dayOfWeek = date?.toLocaleString('en-us', { weekday: 'short' }).toLowerCase();

    if (!vehicle.availableDays.includes(dayOfWeek)) {
        return { valid: false, reason: 'Vehicle not available on this day of the week.' };
    }
    
    const availableFrom = vehicle.availableFromTime;
    const availableTo = vehicle.availableToTime;

    const bookingStartTime = start?.toISOString().substring(11, 19);
    const bookingEndTime = end?.toISOString().substring(11, 19);    


    if (bookingStartTime < availableFrom || bookingEndTime > availableTo) {
        return { valid: false, reason: `Booking time (${bookingStartTime}-${bookingEndTime}) is outside vehicle operating hours (${availableFrom}-${availableTo}).` };
    }
    
    return { valid: true };
};

// TODO - check if required
router.get('/vehicles', (req, res) => {
    try {
        const vehicles = DataHandler.getVehicles();
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve vehicle data.' });
    }
});


router.get('/availability', (req, res) => {
    const { location, vehicleType, startDateTime, durationMins } = req.query;
    
    const durationMs = parseInt(durationMins) * 60 * 1000;
    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMs);
    const today = new Date();
    const futureLimit = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days calculation - Check once
    
    if (start.getTime() < today.getTime() || start.getTime() > futureLimit.getTime()) {
        return res.status(400).json({ error: 'Test drive must be requested within the next 14 days and not in the past.' });
    }
    
    if (durationMs <= 0 || durationMs > 120 * 60 * 1000) {
        return res.status(400).json({ error: 'Invalid duration. Must be a positive value (max 120 mins).' });
    }

    const allVehicles = DataHandler.getVehicles();
    const allReservations = DataHandler.getReservations();

    // Initial set of vehicles - matching user params
    const candidateVehicles = allVehicles.filter(v => 
        v.type.toLowerCase() === vehicleType.toLowerCase() && 
        v.location.toLowerCase() === location.toLowerCase()
    );

    let availableVehicles = [];

    for (const vehicle of candidateVehicles) {
        
        const hoursCheck = checkOperatingHours(vehicle, start, end);
        if (!hoursCheck.valid) {
            continue;
        }

        const vehicleReservations = allReservations.filter(r => r.vehicleId === vehicle.id);
        
        const conflict = vehicleReservations.some(res => 
            checkConflict(res, start, end, vehicle)
        );
        
        if (!conflict) {
            const totalBookingsCount = vehicle.totalBookings || 0; 

            availableVehicles.push({
                vehicleId: vehicle.id,
                totalBookings: totalBookingsCount, 
                type: vehicle.type,
                location: vehicle.location
            });
        }
    }
    
    if (availableVehicles.length === 0) {
        return res.status(409).json({ available: false, message: 'No vehicles are available for the requested slot.' });
    }
    console.log({availableVehicles});
    availableVehicles.sort((a, b) => a.totalBookings - b.totalBookings);

    const chosenVehicle = availableVehicles[0];
    
    res.json({
        available: true,
        vehicleId: chosenVehicle.vehicleId,
        message: `Slot available. Recommend booking on vehicle ${chosenVehicle.vehicleId} for round-robin distribution.`
    });
});


router.post('/bookings', (req, res) => {
    const { vehicleId, startDateTime, durationMins, customerName, customerEmail, customerPhone } = req.body;

    const durationMs = parseInt(durationMins) * 60 * 1000;
    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMs);
    
    const allVehicles = DataHandler.getVehicles();
    const allReservations = DataHandler.getReservations();
    const vehicle = allVehicles.find(v => v.id === vehicleId);

    if (!vehicle) {
        return res.status(404).json({ error: 'Invalid vehicle ID provided.' });
    }

    const hoursCheck = checkOperatingHours(vehicle, start, end);
    if (!hoursCheck.valid) {
        return res.status(400).json({ error: `Booking time is invalid: ${hoursCheck.reason}` });
    }

    const conflict = allReservations.filter(r => r.vehicleId === vehicleId).some(res => 
        checkConflict(res, start, end, vehicle)
    );
    
    if (conflict) {
        return res.status(409).json({ error: 'Conflict detected. The selected slot is no longer available.' });
    }

    const newReservation = {
        vehicleId,
        startDateTime,
        endDateTime: end?.toISOString(),
        customerName,
        customerEmail,
        customerPhone,
    };

    try {
        const savedReservation = DataHandler.addReservation(newReservation);
        
        // Success response
        res.status(201).json({ 
            message: 'Test drive successfully scheduled.',
            bookingDetails: savedReservation
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error during scheduling.', details: error.message });
    }
});

module.exports = router;