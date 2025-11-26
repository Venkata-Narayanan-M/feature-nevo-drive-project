import React from 'react';
import {TestDriveScheduler} from './components/TestDriveScheduler';

const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};


export default function App() {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 14);

    const todayDateString = formatDate(today);
    const maxDateString = formatDate(maxDate);

    const initialConfig = {
        vehicleType: "tesla_model3",
        location: "dublin",
        minDate: todayDateString,
        maxDate: maxDateString,
        durationMins: 60
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-indigo-700 sm:text-5xl">
                    Nevo Test Drive Service
                </h1>
                <p className="mt-2 text-lg text-gray-500">
                    Schedule your drive for the {initialConfig.vehicleType.toUpperCase()} in {initialConfig.location.toUpperCase()}.
                </p>
            </header>

            <TestDriveScheduler 
                vehicleType={initialConfig.vehicleType}
                location={initialConfig.location}
                durationMins={initialConfig.durationMins}
                minDate={initialConfig.minDate}
                maxDate={initialConfig.maxDate}
            />

            <footer className="mt-8 text-center text-sm text-gray-400">
                <p>A simple test drive booking form.</p>
            </footer>
        </div>
    );
}

