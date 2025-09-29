# Bot or Not - Backend API

A Node.js + Express + TypeScript backend for the "Bot or Not" AI image detection game.

## Features

- 🖼️ **Image Management**: Upload, process, and manage AI/real image pairs
- 🎮 **Game Logic**: Handle game sessions, scoring, and statistics
- 📊 **Analytics**: Track player performance and image pair success rates
- 💾 **In-Memory Database**: Fast JSON-based storage with auto-save
- 🔒 **Security**: Rate limiting, file validation, and CORS protection
- 📈 **Scalable**: Easy migration path to PostgreSQL/MongoDB

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Image Management

#### Upload Image
```
POST /api/images/upload
Content-Type: multipart/form-data

Form fields:
- image: File (required)
- category: string (portrait|landscape|object|abstract)
- difficulty_level: number (1-5)
- is_ai_generated: boolean
- source_info: string
- quality_score: number (1-10)
- tags: string[] (JSON array)
```

#### Get All Images
```
GET /api/images?page=1&limit=20&category=portrait&difficulty=3&is_ai_generated=true
```

#### Get Single Image
```
GET /api/images/:id
```

#### Get Image File
```
GET /api/images/:id/file
```

#### Update Image
```
PUT /api/images/:id
Content-Type: application/json

{
  "category": "portrait",
  "difficulty_level": 4,
  "quality_score": 8,
  "tags": ["realistic", "high-quality"]
}
```

#### Delete Image
```
DELETE /api/images/:id
```

#### Get Image Statistics
```
GET /api/images/stats
```

## Data Models

### Image
```typescript
interface Image {
  id: string;
  filename: string;
  storedFilename: string;
  category: 'portrait' | 'landscape' | 'object' | 'abstract';
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  is_ai_generated: boolean;
  source_info: string;
  upload_date: Date;
  quality_score: number; // 1-10
  usage_count: number;
  file_size: number;
  dimensions: { width: number; height: number };
  tags: string[];
}
```

### Image Pair
```typescript
interface ImagePair {
  pair_id: string;
  ai_image_id: string;
  real_image_id: string;
  category: string;
  difficulty_level: number;
  creation_date: Date;
  success_rate: number; // 0-100
  total_attempts: number;
  correct_guesses: number;
  average_response_time: number;
  is_active: boolean;
}
```

## File Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # Data models and validation
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   └── app.ts         # Main application
├── uploads/           # Uploaded images
├── data/             # JSON database files
│   ├── images.json
│   ├── pairs.json
│   └── backups/
└── dist/             # Compiled JavaScript
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Adding New Features

1. **Create model** in `src/models/`
2. **Add service** in `src/services/`
3. **Create controller** in `src/controllers/`
4. **Define routes** in `src/routes/`
5. **Add to main app** in `src/app.ts`

## Database

### Current: In-Memory + JSON

- Fast development and testing
- Auto-save every 5 minutes
- Manual backup creation
- Data stored in `data/` directory

### Migration Path

1. **Phase 1**: Current in-memory system
2. **Phase 2**: SQLite for file-based persistence
3. **Phase 3**: PostgreSQL/MongoDB for production

### Data Persistence

- Automatic saves every 5 minutes
- Manual backup creation via API
- Graceful shutdown saves all data
- Data validation on startup

## Security Features

- **Rate Limiting**: 100 requests/15min, 10 uploads/15min
- **File Validation**: Type, size, and content validation
- **CORS Protection**: Configurable origins
- **Helmet**: Security headers
- **Input Validation**: Zod schema validation

## Image Processing

- **Automatic Optimization**: Resize and compress uploads
- **Format Standardization**: Convert to JPEG
- **Metadata Extraction**: Dimensions, file size
- **Storage Management**: Unique filenames, organized structure

## Monitoring

### Health Check Response
```json
{
  "success": true,
  "message": "Bot or Not API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "stats": {
    "totalImages": 150,
    "totalPairs": 75,
    "totalSessions": 1200,
    "totalRounds": 3600,
    "activePairs": 70
  }
}
```

### Logging

- Request/response logging
- Error tracking
- Performance monitoring
- Database operation logs

## Deployment

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGINS`: Allowed origins for CORS

### Docker Support (Future)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/app.js"]
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details