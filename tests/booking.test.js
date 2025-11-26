const request = require('supertest');
const express = require('express');
const routes = require('../routes/bookingRoutes');
const DataHandler = require('../utils/dataHandler');

const app = express();
app.use(express.json());
app.use('/api', routes);

const baseFutureTime = new Date(new Date().getTime() + (2 * 24 * 60 * 60 * 1000));
baseFutureTime.setUTCHours(14, 0, 0, 0); 
const BASE_FUTURE_DATE_STRING = baseFutureTime.toISOString(); 

const CONFLICT_START_TIME = new Date(baseFutureTime.getTime() - (4 * 60 * 60 * 1000)); 
const CONFLICT_START_DATE_STRING = CONFLICT_START_TIME.toISOString();

const MOCK_VEHICLES = [
    {
        id: "tesla_1001",
        type: "tesla_model3",
        location: "dublin",
        availableFromTime: "08:00:00",
        availableToTime: "18:00:00",
        availableDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        minimumMinutesBetweenBookings: 15,
        totalBookings: 1
    },
    {
        id: "tesla_1002",
        type: "tesla_model3",
        location: "dublin",
        availableFromTime: "08:00:00",
        availableToTime: "18:00:00",
        availableDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        minimumMinutesBetweenBookings: 15,
        totalBookings: 0
    }
];

const MOCK_RESERVATIONS = [
    {
        id: 18726,
        vehicleId: "tesla_1001",
        startDateTime: CONFLICT_START_DATE_STRING,
        endDateTime: new Date(CONFLICT_START_TIME.getTime() + (45 * 60 * 1000)).toISOString(),
    }
];

jest.mock('../utils/dataHandler', () => ({
    getVehicles: jest.fn(),
    getReservations: jest.fn(),
    addReservation: jest.fn(),
}));

describe('Booking API Endpoints', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        DataHandler.getVehicles.mockReturnValue(MOCK_VEHICLES);
        DataHandler.getReservations.mockReturnValue(MOCK_RESERVATIONS);
    });

    test('GET /availability prioritizes least booked vehicle (Round Robin)', async () => {
        const query = {
            location: 'dublin',
            vehicleType: 'tesla_model3',
            startDateTime: BASE_FUTURE_DATE_STRING,
            durationMins: 45
        };

        const response = await request(app)
            .get('/api/availability')
            .query(query);

        expect(response.statusCode).toBe(200);
        expect(response.body.available).toBe(true);
        expect(response.body.vehicleId).toBe('tesla_1002');
    });

    test('GET /availability finds an available vehicle when one candidate is in conflict', async () => {
        const query = {
            location: 'dublin',
            vehicleType: 'tesla_model3',
            startDateTime: new Date(CONFLICT_START_TIME.getTime() + (65 * 60 * 1000)).toISOString(),
            durationMins: 30
        };

        const response = await request(app)
            .get('/api/availability')
            .query(query);

        expect(response.statusCode).toBe(200); 
        expect(response.body.available).toBe(true);
        expect(response.body.vehicleId).toBe('tesla_1002'); 
    });
    
    test('GET /availability returns 409 if ALL vehicles are in conflict', async () => {
        DataHandler.getReservations.mockReturnValue([
            ...MOCK_RESERVATIONS,
            { 
                id: 18727,
                vehicleId: "tesla_1002",
                startDateTime: CONFLICT_START_DATE_STRING, 
                endDateTime: new Date(CONFLICT_START_TIME.getTime() + (45 * 60 * 1000)).toISOString(),
            }
        ]);

        const query = {
            location: 'dublin',
            vehicleType: 'tesla_model3',
            startDateTime: new Date(CONFLICT_START_TIME.getTime() + (30 * 60 * 1000)).toISOString(), 
            durationMins: 30
        };
        
        const response = await request(app)
            .get('/api/availability')
            .query(query);

        expect(response.statusCode).toBe(409);
        expect(response.body.available).toBe(false);
        expect(response.body.message).toContain('No vehicles are available');
    });

    test('GET /availability returns 409 if booking is outside operating hours (too early)', async () => {
        const tooEarlyTime = new Date(baseFutureTime.getTime());
        tooEarlyTime.setUTCHours(7, 0, 0, 0);

        const query = {
            location: 'dublin',
            vehicleType: 'tesla_model3',
            startDateTime: tooEarlyTime.toISOString(),
            durationMins: 45
        };

        const response = await request(app)
            .get('/api/availability')
            .query(query);

        expect(response.statusCode).toBe(409); 
        expect(response.body.message).toContain('No vehicles are available');
    });

    test('POST /bookings prevents race condition and rejects conflicting booking', async () => {
        DataHandler.addReservation.mockImplementation((reservation) => ({ id: 999, ...reservation }));
        
        const conflictBooking = {
            vehicleId: 'tesla_1001',
            startDateTime: new Date(CONFLICT_START_TIME.getTime() + (30 * 60 * 1000)).toISOString(),
            durationMins: 30,
            customerName: 'Bad', customerEmail: 'bad@user.com', customerPhone: '555'
        };

        const response = await request(app)
            .post('/api/bookings')
            .send(conflictBooking);

        expect(response.statusCode).toBe(409);
        expect(response.body.error).toContain('Conflict detected');
        expect(DataHandler.addReservation).not.toHaveBeenCalled();
    });

    test('POST /bookings successfully schedules and should trigger total bookings update', async () => {
        DataHandler.addReservation.mockImplementation((reservation) => ({ id: 999, ...reservation }));
        
        const freeBooking = {
            vehicleId: 'tesla_1002',
            startDateTime: BASE_FUTURE_DATE_STRING,
            durationMins: 45,
            customerName: 'Good', customerEmail: 'good@user.com', customerPhone: '123'
        };

        const response = await request(app)
            .post('/api/bookings')
            .send(freeBooking);

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toContain('successfully scheduled');
        expect(DataHandler.addReservation).toHaveBeenCalledTimes(1);
    });

});