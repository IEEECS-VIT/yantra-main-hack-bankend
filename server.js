import express from 'express';
import cors from 'cors';
import loginRoute from './routes/loginRoute.js';
import teamRoute from './routes/teamRoute.js';
import sequelize from './config/db.js';

const app = express();

const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5500', 'http://localhost:3000' ,
    'https://yantra-main-hack-frontend.vercel.app',
    'https://yantra-main-hack-bankend.vercel.app'];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(loginRoute);
app.use(teamRoute);

app.get('/', (req, res) => {
    res.send('Hello World');
    }
);

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
    }
};

startServer();
export default app;