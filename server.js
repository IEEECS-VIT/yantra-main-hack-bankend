import functions from 'firebase-functions';
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
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200
};

app.use(express.json());
app.use(cors(corsOptions));

// Origin checking middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) {
        return next();
    }
    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({
            error: 'Access denied: origin not allowed'
        });
    }
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

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
        // app.listen(PORT, () => {
        //     console.log(`Server is running on port ${PORT}`);
        // });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();

export const api = functions.https.onRequest(app);