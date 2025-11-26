Test Drive Scheduling Service

This project is a simple service for managing vehicle test drive availability and bookings, implemented with a Node.js/Express backend and a frontend (presumably React or Angular) that communicates via API.

1. Project Setup

To get the necessary packages for both the backend and frontend:

npm install


2. Data Files

The backend uses local JSON files for persistence. These files must be present in the data/ directory:

vehicles.json: Contains vehicle details, operating hours, and the totalBookings count for round-robin distribution.

reservations.json: Stores all current booking records.

Important: Before starting, ensure all vehicles in vehicles.json have the property "totalBookings": 0 (or the current count) for the distribution logic to work correctly.

3. Running the Application

3.1. Start the Backend API

This command starts the Express server on port 3000 (or as configured in server.js).

npm start


3.2. Start the Frontend (Development)

This command assumes your frontend is set up in a client/ directory (e.g., using webpack/Vite).

npm run dev


3.3. Webpack Proxy Configuration Note

If you are using a development server (like webpack-dev-server or Vite) for the frontend, you must ensure the proxy target in your frontend configuration file (e.g., webpack.config.js or vite.config.js) points to the correct backend IP address (where the Express server is running):

// Example: Proxy setting in frontend config
proxy: {
  '/api': {
    target: 'http://<YOUR_BACKEND_IP_ADDRESS>:3000', 
    // Usually 'http://localhost:3000' or similar
  }
}


4. Running Unit Tests

To run the unit tests for the backend logic (requires Jest and Supertest):

npm test
