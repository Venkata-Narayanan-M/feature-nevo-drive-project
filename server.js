const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/bookingRoutes');
const path = require('path');

const app = express();
const PORT = 3001;
const IP_ADDR = 'localhost';

app.use(cors({ origin: IP_ADDR })); 
app.use(express.json()); 

app.use('/api', bookingRoutes);


app.use((req, res, next) => {
    // console.log(`[${new Date()?.toISOString()}] ${req.method} ${req.url}`);
    next();
});



app.listen(PORT, () => {
    console.log(`Server listening: http://${IP_ADDR}:${PORT}`);
    console.log(`Client should run at http://${IP_ADDR}:5173`);
});