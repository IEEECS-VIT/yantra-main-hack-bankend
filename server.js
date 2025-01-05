import express from 'express';
import cors from 'cors';
import loginRoute from './routes/loginRoute.js';
import teamRoute from './routes/teamRoute.js';
import sequelize from './config/db.js';

const app = express();

// Define allowed origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://yantra-main-hack-frontend.vercel.app',
    'https://yantra-main-hack-bankend.vercel.app'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Explicitly allow headers
    credentials: true,
    maxAge: 86400, // Cache preflight request results for 24 hours
    optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
};

// Middleware setup
app.use(express.json());
app.use(cors(corsOptions));

// Additional headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Routes
app.use(loginRoute);
app.use(teamRoute);

app.get('/', (req, res) => {
    res.send('Hello World');
});


const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');

        const PORT = process.env.PORT || 8080;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1); // Exit process with failure
    }
};

startServer();

export default app;