import express from 'express';
import cors from 'cors';

const app = express();
const port = 8080 || process.env.PORT;

const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5500', 'http://localhost:5174'];

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

app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.send('Hello World');
    }
);

app.listen(port, () => {
    console.log('Server is running on http://localhost:3000');
    }
);