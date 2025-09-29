import { Request, Response, NextFunction } from 'express';

// Simple API key authentication for admin operations
// In production, use proper JWT or OAuth2
export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKey = process.env.ADMIN_API_KEY || 'dev-admin-key-123';

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Include X-API-Key header or api_key query parameter'
    });
    return;
  }

  next();
};

// Extend global interface for rate limiting store
declare global {
  var adminRateLimitStore: Map<string, { count: number; resetTime: number }> | undefined;
}

// Rate limiting for admin operations
export const adminRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This is a simplified rate limiter
  // In production, use Redis or a proper rate limiting solution
  
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 50; // Max 50 admin requests per window

  // Simple in-memory rate limiting (not suitable for production clusters)
  if (!global.adminRateLimitStore) {
    global.adminRateLimitStore = new Map();
  }

  const store = global.adminRateLimitStore as Map<string, { count: number; resetTime: number }>;
  const key = `admin:${clientIP}`;
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    // New window or expired window
    store.set(key, { count: 1, resetTime: now + windowMs });
    next();
  } else if (record.count < maxRequests) {
    // Within limits
    record.count++;
    next();
  } else {
    // Rate limit exceeded
    res.status(429).json({
      success: false,
      error: 'Admin rate limit exceeded',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }
};

// Log admin operations
export const logAdminOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();

    console.log(`[ADMIN] ${timestamp} - ${operation} - IP: ${clientIP} - UA: ${userAgent}`);
    
    // Store original res.json to log response
    const originalJson = res.json;
    res.json = function(body: any) {
      const success = body?.success !== false;
      console.log(`[ADMIN] ${timestamp} - ${operation} - Result: ${success ? 'SUCCESS' : 'FAILED'}`);
      return originalJson.call(this, body);
    };

    next();
  };
};

// Validate admin permissions for specific operations
export const requireAdminPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This is a placeholder for more sophisticated permission checking
    // In a real system, you'd check user roles and permissions
    
    const dangerousOperations = ['reset', 'cleanup', 'import'];
    
    if (dangerousOperations.includes(permission)) {
      const confirmHeader = req.headers['x-confirm-operation'];
      if (confirmHeader !== 'true') {
        res.status(403).json({
          success: false,
          error: `Dangerous operation requires confirmation`,
          hint: 'Include X-Confirm-Operation: true header'
        });
        return;
      }
    }

    next();
  };
};