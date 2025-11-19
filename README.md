# Clash on Somnia

A 2D multiplayer village battle game inspired by Clash of Clans. Build your village, train troops, and battle other players online!

## Project Status

**Phase 1 Complete!** ✅ Foundation & Infrastructure

This project is being developed in phases. See [MVP_PLAN.md](./MVP_PLAN.md) for the complete development roadmap.

### Completed Features
- ✅ User authentication (register/login with JWT)
- ✅ Village system with initial setup
- ✅ Resource tracking (Gold & Elixir)
- ✅ Database schema with Drizzle ORM
- ✅ Modern UI with Next.js and Tailwind CSS
- ✅ Real-time state management with Zustand

### Coming Soon
- **Phase 2**: Resource generation and collection
- **Phase 3**: Building placement system
- **Phase 4**: Army and troop training
- **Phase 5**: Combat system and PvE battles
- **Phase 6**: Multiplayer PvP and polish

## Tech Stack

### Backend
- **NestJS** - TypeScript-based Node.js framework
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database toolkit
- **Passport JWT** - Authentication
- **Socket.io** - Real-time communication (future)
- **Swagger** - API documentation

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Pixi.js** - 2D game rendering (future phases)
- **GSAP** - Game animations (future phases)
- **Framer Motion** - UI animations (future phases)

## Prerequisites

Make sure you have the following installed:
- **Node.js** v20+ and npm
- **Docker** and Docker Compose (for PostgreSQL)
- **Git**

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd clash-on-somnia
```

### 2. Start PostgreSQL Database

Start the PostgreSQL container using Docker Compose:

```bash
docker-compose up -d
```

Verify the database is running:
```bash
docker ps
```

You should see the `clash-on-somnia-db` container running on port 5432.

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Edit `.env` if needed (default values should work):

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
DATABASE_URL=postgresql://postgres:password@localhost:5432/clash_on_somnia
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

Generate database migrations:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run start:dev
```

The backend should now be running on http://localhost:3001

API Documentation (Swagger) available at: http://localhost:3001/api/docs

### 4. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Start the development server:

```bash
npm run dev
```

The frontend should now be running on http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Click "Register" to create a new account
3. Fill in username, email, and password
4. After registration, you'll be automatically logged in and redirected to your village
5. Your village will be created automatically with:
   - Initial resources (500 Gold, 500 Elixir)
   - A Town Hall building

## Project Structure

```
clash-on-somnia/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── villages/       # Village management
│   │   ├── resources/      # Resource system (Phase 2)
│   │   ├── buildings/      # Building system (Phase 3)
│   │   ├── database/       # Drizzle schema and migrations
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── village/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utilities and stores
│   │   ├── api/         # API client functions
│   │   ├── stores/      # Zustand stores
│   │   └── utils.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml     # PostgreSQL container
├── MVP_PLAN.md           # Complete development roadmap
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires JWT)

### Villages
- `GET /api/villages/me` - Get user's village with resources and buildings (requires JWT)

### Health Check
- `GET /api` - Health check endpoint

Full API documentation: http://localhost:3001/api/docs

## Database Schema

### Users
- `id` (UUID, PK)
- `username` (unique)
- `email` (unique)
- `password_hash`
- `created_at`
- `updated_at`

### Villages
- `id` (UUID, PK)
- `user_id` (FK to users)
- `name`
- `trophies`
- `created_at`
- `updated_at`

### Resources
- `id` (UUID, PK)
- `village_id` (FK to villages)
- `gold`
- `elixir`
- `last_collected_at`
- `updated_at`

### Buildings
- `id` (UUID, PK)
- `village_id` (FK to villages)
- `type` (town_hall, gold_mine, etc.)
- `level`
- `position_x`, `position_y`
- `health`, `max_health`
- `is_active`
- `created_at`
- `updated_at`

## Development Commands

### Backend
```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npm run start:prod     # Start production server
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio (database GUI)
```

### Frontend
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

### Database
```bash
docker-compose up -d        # Start PostgreSQL
docker-compose down         # Stop PostgreSQL
docker-compose down -v      # Stop and remove volumes (deletes data)
docker-compose logs -f      # View logs
```

## Troubleshooting

### Database Connection Errors
- Ensure Docker is running
- Check if PostgreSQL container is running: `docker ps`
- Verify port 5432 is not in use by another service
- Check database URL in `backend/.env`

### Frontend Can't Connect to Backend
- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

### Migration Errors
- Delete `backend/src/database/migrations` folder
- Run `npm run db:generate` to regenerate migrations
- Run `npm run db:migrate` to apply them

### Port Already in Use
- Backend (3001): Change `PORT` in `backend/.env`
- Frontend (3000): Run `npm run dev -- -p 3001` to use different port
- PostgreSQL (5432): Change port mapping in `docker-compose.yml`

## Contributing

This is an MVP project following a phased development approach. See [MVP_PLAN.md](./MVP_PLAN.md) for the roadmap.

## License

MIT License

## Acknowledgments

- Inspired by Clash of Clans
- Built with modern web technologies
- Game sprites from [Kenney.nl](https://kenney.nl) (coming in Phase 3)
