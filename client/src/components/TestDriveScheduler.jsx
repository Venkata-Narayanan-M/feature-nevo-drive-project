import React, { useState, useEffect } from 'react';

// API Base URL
const API_BASE_URL = '/api';

export function TestDriveScheduler({ vehicleType, location, durationMins, minDate, maxDate }) {
    const [date, setDate] = useState(minDate);
    const [time, setTime] = useState('10:00'); // Default starting time
    const [customer, setCustomer] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [status, setStatus] = useState({ type: 'initial', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [availableVehicleId, setAvailableVehicleId] = useState(null);

    // CLear
    useEffect(() => {
        setStatus({ type: 'initial', message: '' });
        setAvailableVehicleId(null);
    }, [date, time]);

    const handleCustomerChange = (e) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
    };

    const checkAvailability = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: 'checking', message: 'Checking availability...' });

        // Sticking to UTC alone
        const startDateTime = new Date(`${date}T${time}:00Z`)?.toISOString();
        
        try {
            const response = await fetch(`${API_BASE_URL}/availability?location=${location}&vehicleType=${vehicleType}&startDateTime=${startDateTime}&durationMins=${durationMins}`);
            const data = await response.json();

            if (response.ok && data.available) {
                // Availability confirmed, save the chosen vehicle ID (Even Distribution logic applied on BE)
                setAvailableVehicleId(data.vehicleId);
                setStatus({ type: 'success', message: `Slot is available! Vehicle: ${data.vehicleId}. Please complete your details to book.` });
            } else {
                // Unavailable or 400/404/409 errors
                setAvailableVehicleId(null);
                setStatus({ type: 'error', message: data.error || data.message || 'Could not confirm availability. Check input and try again.' });
            }
        } catch (error) {
            console.error('Availability Check Error:', error);
            setStatus({ type: 'error', message: 'Network error during availability check. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const scheduleBooking = async (e) => {
        e.preventDefault();

        // Final check before booking
        if (!availableVehicleId) {
             setStatus({ type: 'error', message: 'Please re-check availability before attempting to book.' });
             return;
        }

        setIsLoading(true);
        setStatus({ type: 'booking', message: 'Attempting to secure your test drive...' });
        
        const startDateTime = new Date(`${date}T${time}:00Z`)?.toISOString();

        const bookingData = {
            vehicleId: availableVehicleId,
            startDateTime: startDateTime,
            durationMins: durationMins,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email
        };

        try {
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            });
            
            const data = await response.json();

            if (response.status === 201) {
                // Success
                setStatus({ 
                    type: 'booked', 
                    message: `Booking Confirmed! ID: ${data.bookingDetails.id}. Vehicle: ${data.bookingDetails.vehicleId}. Check your email for details.` 
                });
                // Reset
                setCustomer({ name: '', phone: '', email: '' });
                setAvailableVehicleId(null);
            } else if (response.status === 409) {
                // Conflict/Race condition - BE to handle
                setStatus({ type: 'error', message: data.error || 'Conflict: Slot was just booked. Please choose a new time.' });
                setAvailableVehicleId(null);
            } else {
                setStatus({ type: 'error', message: data.error || 'Booking failed due to an unknown error.' });
            }

        } catch (error) {
            console.error('Booking Error:', error);
            setStatus({ type: 'error', message: 'Network error during booking. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    let statusClass = "text-gray-600 border-gray-200 bg-gray-100";
    if (status.type === 'error') statusClass = "text-red-700 border-red-400 bg-red-100";
    if (status.type === 'success' || status.type === 'booked') statusClass = "text-green-700 border-green-400 bg-green-100";

    return (
        <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Test Drive Booking
            </h2>
            
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                <p className="text-sm font-medium text-indigo-700">
                    <span className="font-bold">Vehicle:</span> {vehicleType.toUpperCase()}
                    <span className="mx-2 text-indigo-400">|</span>
                    <span className="font-bold">Location:</span> {location.toUpperCase()}
                    <span className="mx-2 text-indigo-400">|</span>
                    <span className="font-bold">Duration:</span> {durationMins} mins
                </p>
            </div>

            {status.message && (
                <div className={`p-4 mb-6 rounded-lg border text-sm font-medium transition-all ${statusClass}`} role="alert">
                    {status.message}
                </div>
            )}
            
            <form onSubmit={checkAvailability} className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-gray-700 font-medium">Date (Max 14 days)</span>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={minDate}
                            max={maxDate}
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-gray-700 font-medium">Time (UTC)</span>
                        <input
                            type="time"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            step="900" // 15 minutes
                            required
                        />
                    </label>
                </div>
                
                <button
                    type="submit"
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition"
                    disabled={isLoading}
                >
                    {isLoading && status.type === 'checking' ? 'Checking...' : 'Check Slot Availability'}
                </button>
            </form>

            {availableVehicleId && status.type === 'success' && (
                <form onSubmit={scheduleBooking} className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 border-t pt-4 mt-6">
                        Customer Details (Required)
                    </h3>
                    <input
                        type="text"
                        name="name"
                        value={customer.name}
                        onChange={handleCustomerChange}
                        placeholder="Full Name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3"
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        value={customer.email}
                        onChange={handleCustomerChange}
                        placeholder="Email (e.g., john@smith.com)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3"
                        required
                    />
                    <input
                        type="tel"
                        name="phone"
                        value={customer.phone}
                        onChange={handleCustomerChange}
                        placeholder="Phone (e.g., +353851234567)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3"
                        required
                        minLength={10}
                        maxLength={10}
                        pattern='[0-9]{10}'
                    />
                    
                    <button
                        type="submit"
                        className="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-lg font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 transition transform hover:scale-[1.01] active:scale-95"
                        disabled={isLoading || !customer.name || !customer.phone || !customer.email}
                    >
                        {isLoading && status.type === 'booking' ? 'Booking...' : 'Confirm Test Drive'}
                    </button>
                </form>
            )}
        </div>
    );
}