import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { tenantHandler } from './middlewares/tenant.middleware.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import campusRoutes from './routes/campus.routes.js';
import reportRoutes from './routes/report.routes.js';
import departmentRoutes from './routes/department.routes.js';
import noticeRoutes from './routes/notice.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();

// Telemetry Counters
let totalRequests = 0;
const pathCounters: { [key: string]: number } = {};

// Prometheus Metrics collecting middleware
app.use((req, res, next) => {
  totalRequests++;
  const pathKey = `${req.method}_${req.path}`;
  pathCounters[pathKey] = (pathCounters[pathKey] || 0) + 1;
  next();
});

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
app.use('/api', apiRateLimiter);

// Multi-Tenancy context injection
app.use('/api/v1', tenantHandler);

// API Versioning and Routing
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/campuses', campusRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Prometheus Scrape Metrics Route
app.get('/metrics', (req, res) => {
  const memory = process.memoryUsage();
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP node_memory_rss_bytes RSS Memory usage in bytes
# TYPE node_memory_rss_bytes gauge
node_memory_rss_bytes ${memory.rss}

# HELP node_memory_heap_used_bytes Heap memory used in bytes
# TYPE node_memory_heap_used_bytes gauge
node_memory_heap_used_bytes ${memory.heapUsed}

# HELP node_uptime_seconds Application uptime in seconds
# TYPE node_uptime_seconds gauge
node_uptime_seconds ${process.uptime()}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${totalRequests}

${Object.entries(pathCounters)
  .map(([key, val]) => {
    const [method, path] = key.split('_');
    return `http_request_details_total{method="${method}",path="${path}"} ${val}`;
  })
  .join('\n')}
  `.trim());
});

// Swagger API Documentations Mock UI Page
app.get('/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CampusReport Swagger API docs</title>
      <style>
        body { font-family: system-ui, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px; margin: 0; }
        h1 { font-size: 2rem; border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; color: #3b82f6; }
        .endpoint { background-color: #121824; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .method { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 12px; }
        .get { background-color: #1e3a8a; color: #93c5fd; }
        .post { background-color: #064e3b; color: #6ee7b7; }
        .put { background-color: #78350f; color: #fcd34d; }
        .delete { background-color: #7f1d1d; color: #fca5a5; }
        .path { font-family: monospace; font-size: 1.05rem; }
        .desc { color: #94a3b8; margin-top: 8px; font-size: 0.95rem; }
      </style>
    </head>
    <body>
      <h1>CampusReport API Documentation (v1 Swagger UI)</h1>
      
      <div class="endpoint">
        <span class="method post">POST</span><span class="path">/api/v1/auth/signup</span>
        <div class="desc">Register a new user account (student, faculty, visitor, staff)</div>
      </div>
      
      <div class="endpoint">
        <span class="method post">POST</span><span class="path">/api/v1/auth/login</span>
        <div class="desc">Authenticate user and start secure RTR sessions</div>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span><span class="path">/api/v1/reports</span>
        <div class="desc">Submit a report. Automatically runs AI classification and smart assignment.</div>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span><span class="path">/api/v1/reports/merge</span>
        <div class="desc">Merge a duplicate ticket into a main ticket (Admin/Staff only)</div>
      </div>
    </body>
    </html>
  `);
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot find ${req.originalUrl} on this server.`,
      code: 'ROUTE_NOT_FOUND',
      status: 404,
    },
  });
});

// Global Error Handler
app.use(errorHandler);

export { app };
