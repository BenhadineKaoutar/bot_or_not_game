import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import imageRoutes from './routes/images';
import pairRoutes from './routes/pairs';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';

// Import services
import { DatabaseService } from './services/DatabaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for React in production
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Upload rate limiting (more restrictive)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per windowMs
  message: {
    success: false,
    error: 'Too many upload requests, please try again later.'
  }
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/images/upload', uploadLimiter);

// CORS configuration - FIXED FOR PRODUCTION
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow same-origin in production
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes - MUST COME BEFORE STATIC FILES
app.use('/api/images', imageRoutes);
app.use('/api/pairs', pairRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const db = DatabaseService.getInstance();
  const stats = db.getStats();
  
  res.json({
    success: true,
    message: 'Bot or Not API is running',
    timestamp: new Date().toISOString(),
    stats
  });
});

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../dist');
  
  // Serve static files
  app.use(express.static(frontendBuildPath));
  
  // Catch-all route for React Router - MUST BE LAST
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Root endpoint for development
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Bot or Not API Server',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        images: '/api/images',
        pairs: '/api/pairs',
        game: '/api/game',
        admin: '/api/admin',
        upload: '/api/images/upload'
      }
    });
  });
  
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl
    });
  });
}

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const db = DatabaseService.getInstance();
  await db.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const db = DatabaseService.getInstance();
  await db.shutdown();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bot or Not API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Image uploads: http://localhost:${PORT}/api/images/upload`);
  console.log(`🖼️  Static files: http://localhost:${PORT}/uploads`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`⚛️  Serving React app from /dist`);
  }
  
  // Initialize database
  DatabaseService.getInstance();
});

export default app;