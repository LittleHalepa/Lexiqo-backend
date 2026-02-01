import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import authRoute from './routes/AuthRoute';
import { Request , Response, NextFunction } from 'express';
import { authenticateToken } from './middleware/authMiddleware';
import userRoute from './routes/UserRoute';
import dashboardRoute from './routes/DashboardRoute';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["https://www.google.com"],
      connectSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());

app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/dashboard', dashboardRoute);

app.get('/dashboard', authenticateToken ,(req: Request, res: Response) => {
    res.status(200).json({message: 'Welcome to the dashboard!' });
});

app.use((err: unknown, req: Request, res: Response, next?: NextFunction) => {
    console.error((err as any).stack);
    res.status(500).json({error: true, message: 'Something went wrong!' });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});