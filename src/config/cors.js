const corsConfig = {
  // ==================== DEVELOPMENT ====================
  development: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',      // Vite default
      'http://localhost:3001',      // React default
      'http://localhost:4200',      // Angular default
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept'
    ]
  },

  // ==================== PRODUCTION ====================
  production: {
    origin: (origin, callback) => {
      // Daftar domain yang diizinkan di production
      const allowedOrigins = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://app.yourdomain.com'
      ];

      // Allow requests dengan origin undefined (mobile apps, Postman, dll)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With'
    ],
    maxAge: 86400 // Cache preflight request selama 24 jam
  },

  // ==================== TESTING (Allow All) ====================
  testing: {
    origin: '*', // Allow semua origin
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
};

// Export config berdasarkan environment
const getCorsConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return corsConfig[env] || corsConfig.development;
};

export default getCorsConfig;