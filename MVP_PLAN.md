# Clash on Somnia - MVP Development Plan

## Project Overview
A 2D multiplayer village battle game inspired by Clash of Clans, featuring village building, resource management, real-time combat, and online PvP.

## Tech Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: Socket.io for WebSocket connections
- **Authentication**: JWT-based auth
- **Validation**: class-validator, class-transformer
- **API**: RESTful + WebSocket hybrid

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Game Rendering**: Pixi.js (2D WebGL rendering engine)
- **Animations**:
  - Framer Motion (UI animations)
  - GreenSock (GSAP) for complex game animations
  - Pixi.js built-in animation capabilities
- **State Management**: Zustand (lightweight, perfect for games)
- **Real-time**: Socket.io-client
- **Forms**: React Hook Form + Zod validation

### Additional Libraries
- **Drag & Drop**: @dnd-kit/core (for building placement)
- **Sound**: Howler.js (game audio management)
- **Pathfinding**: pathfinding.js (for troop movement)
- **Sprite Management**: TexturePacker or sprite-sheet library

---

## Game Features Breakdown

### Core Mechanics
1. **Village Building**
   - Grid-based placement system (e.g., 40x40 grid)
   - Buildings: Town Hall, Resource Mines, Storages, Defenses, Army Buildings
   - Drag-and-drop interface

2. **Resources**
   - Gold (primary currency)
   - Elixir (for troops/upgrades)
   - Auto-generation from mines/collectors

3. **Defenses**
   - Cannons, Archer Towers, Walls
   - Simple stats: Damage, Range, HP

4. **Warriors/Troops**
   - 3-4 basic unit types (e.g., Barbarian, Archer, Giant, Wall Breaker)
   - Training system (queue-based)
   - Stats: HP, Damage, Speed, Training Time, Cost

5. **Combat System**
   - Troops target nearest building
   - Defenses auto-attack troops in range
   - Simple AI: troops walk toward targets, defenses shoot
   - Battle ends when all troops dead or all buildings destroyed

6. **Matchmaking**
   - Find random opponent villages
   - View village before attacking
   - Earn resources based on destruction percentage

---

## MVP Feature List (Prioritized)

### Must Have (Phase 1-3)
- User authentication (register/login)
- Single village per user
- Basic buildings: Town Hall, Gold Mine, Elixir Collector, Storage
- Resource generation and storage
- Simple grid-based building placement
- View own village

### Should Have (Phase 4-5)
- Defense buildings (2 types minimum)
- Troop training (2 types minimum)
- Attack other villages (PvE against static layouts first)
- Basic combat system
- Win/loss conditions
- Resource looting

### Nice to Have (Phase 6+)
- Real-time PvP (live attacks)
- Replay system
- Upgrade system for buildings/troops
- Sound effects and background music
- Leaderboards
- Shield/protection system

---

## Development Phases

### **Phase 1: Foundation & Infrastructure** (Week 1-2)
**Goal**: Set up project structure, database, and basic authentication

#### Backend Tasks
- [ ] Initialize NestJS project with TypeScript config
- [ ] Set up PostgreSQL + Drizzle ORM
- [ ] Configure environment variables (.env setup)
- [ ] Implement user authentication (register/login/JWT)
- [ ] Create base database schema:
  - Users table
  - Villages table (one-to-one with users)
  - Buildings table (village buildings)
  - Resources table (user resources)
- [ ] Set up CORS and security middleware
- [ ] Create base REST API structure
- [ ] Add Swagger/OpenAPI documentation

#### Frontend Tasks
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Configure ESLint and Prettier
- [ ] Create authentication pages (Login/Register)
- [ ] Set up Zustand store structure
- [ ] Create basic layout and navigation
- [ ] Add loading states and error handling

#### DevOps
- [ ] Set up Git workflow (branches, commits)
- [ ] Create docker-compose for local PostgreSQL
- [ ] Basic README with setup instructions

**Deliverable**: Working auth system, users can register/login, database connected

---

### **Phase 2: Village Core & Resource System** (Week 2-3)
**Goal**: Village creation, resource generation, and basic UI

#### Backend Tasks
- [ ] Create village initialization logic (when user registers)
- [ ] Implement resource generation system:
  - Background jobs for resource mining (using @nestjs/schedule)
  - Resource cap based on storage buildings
- [ ] Create buildings configuration (static data):
  - Building types, costs, generation rates, capacities
- [ ] REST endpoints:
  - `GET /village/me` - Get user's village
  - `GET /resources/me` - Get user's resources
  - `POST /buildings/collect` - Collect resources
- [ ] Resource validation (can't spend more than you have)

#### Frontend Tasks
- [ ] Create village dashboard page
- [ ] Display resources (Gold, Elixir) with animated counters
- [ ] Create basic 2D grid system (canvas or divs for MVP)
- [ ] Display existing buildings on grid
- [ ] Resource collection UI (click to collect)
- [ ] Set up Pixi.js canvas for game rendering
- [ ] Create sprite loader system
- [ ] Basic building sprites (can use placeholders/simple shapes)

#### Game Design
- [ ] Define initial village layout template
- [ ] Define 3-4 starter buildings with stats
- [ ] Define resource generation rates (balance)
- [ ] Create simple sprite assets or use placeholders

**Deliverable**: Users see their village, resources auto-generate, can collect resources

---

### **Phase 3: Building Placement System** (Week 3-4)
**Goal**: Drag-and-drop building placement and village customization

#### Backend Tasks
- [ ] Extend buildings schema with position (x, y coordinates)
- [ ] Create building placement validation:
  - Check grid bounds
  - Check collision with other buildings
  - Check resource costs
- [ ] REST/WebSocket endpoints:
  - `POST /buildings/place` - Place new building
  - `PUT /buildings/:id/move` - Move existing building
  - `DELETE /buildings/:id` - Remove/sell building
- [ ] Purchase building logic (deduct resources)

#### Frontend Tasks
- [ ] Implement grid system with Pixi.js
- [ ] Create building shop/menu UI
- [ ] Implement drag-and-drop with @dnd-kit:
  - Drag from shop to grid
  - Drag existing buildings to reposition
  - Visual feedback (green/red for valid/invalid placement)
- [ ] Add placement validation UI
- [ ] Show building costs and requirements
- [ ] Add build/edit mode toggle
- [ ] Create building info tooltips

#### Game Design
- [ ] Define grid size (e.g., 40x40 tiles)
- [ ] Define building sizes (e.g., 2x2, 3x3, 1x1 tiles)
- [ ] Create building shop categories (Resources, Army, Defenses)
- [ ] Design 5-6 buildings total for MVP

**Deliverable**: Users can buy, place, and rearrange buildings in their village

---

### **Phase 4: Army & Troop System** (Week 4-5)
**Goal**: Train troops and prepare for combat

#### Backend Tasks
- [ ] Create troops configuration (static data):
  - Troop types, stats (HP, Damage, Speed), costs, training time
- [ ] Database schema:
  - Army table (user's available troops)
  - Training queue table
- [ ] Training logic:
  - Queue-based system
  - Background job to process training completion
  - Army camp capacity limit
- [ ] REST endpoints:
  - `POST /troops/train` - Add troop to training queue
  - `GET /troops/queue` - Get training queue
  - `GET /troops/army` - Get available troops
  - `DELETE /troops/queue/:id` - Cancel training

#### Frontend Tasks
- [ ] Create army camp UI
- [ ] Troop training interface:
  - Show available troops to train
  - Display training costs and time
  - Show training queue with countdown timers
- [ ] Display current army composition
- [ ] Add troop sprites/icons
- [ ] Real-time updates via WebSocket for training completion

#### Game Design
- [ ] Design 3-4 troop types:
  - Melee (Barbarian): High HP, low damage
  - Ranged (Archer): Low HP, medium damage
  - Tank (Giant): Very high HP, targets defenses
  - Special (Wall Breaker): Targets walls specifically
- [ ] Define training costs and times
- [ ] Define army camp capacity

**Deliverable**: Users can train troops and see their army

---

### **Phase 5: Combat System & PvE Attacks** (Week 5-7)
**Goal**: Attack mechanics and battle simulation

#### Backend Tasks
- [ ] Create battle simulation engine:
  - Load attacker's troops
  - Load defender's village layout and defenses
  - Simulate battle turn-by-turn or time-based
  - Calculate damage, targeting, movement
  - Determine winner and resource loot
- [ ] Database schema:
  - Battle history table
  - Battle replays (optional, store action log)
- [ ] Defense buildings configuration (stats)
- [ ] Battle endpoints:
  - `GET /battles/find-opponent` - Matchmaking (random village)
  - `POST /battles/attack` - Start attack
  - `GET /battles/:id` - Get battle result
  - `GET /battles/history` - User's battle history
- [ ] Loot calculation logic (based on % destruction)
- [ ] Resource deduction from defender (optional)

#### Frontend Tasks
- [ ] Create battle preparation screen:
  - Show opponent's village layout
  - Troop deployment UI (select which troops to use)
- [ ] Build battle rendering with Pixi.js:
  - Display defender's village
  - Troop movement animations (GSAP)
  - Attack animations (projectiles, explosions)
  - Health bars for buildings/troops
  - Destruction effects
- [ ] Battle simulation playback (client-side rendering of server result)
- [ ] Battle result screen (stars, loot, stats)
- [ ] Battle history page

#### Game Design
- [ ] Design 2-3 defense buildings:
  - Cannon: Ground troops, medium range
  - Archer Tower: Air/ground, long range
  - Walls: No attack, just HP barrier
- [ ] Define targeting logic:
  - Troops: Nearest building
  - Defenses: Nearest troop in range
- [ ] Define loot formula (e.g., 20% of available resources if 50% destruction)
- [ ] Create 3-5 pre-built AI villages for PvE
- [ ] Balance troops vs defenses

**Deliverable**: Users can attack AI villages, watch battles, earn resources

---

### **Phase 6: Real-time Multiplayer & Polish** (Week 7-8+)
**Goal**: PvP matchmaking, polish, and game feel

#### Backend Tasks
- [ ] Implement matchmaking system:
  - Trophy/rating system (optional)
  - Find online opponents
  - Shield system (prevent attacks while online)
- [ ] WebSocket battle system:
  - Real-time troop deployment
  - Live battle updates
  - Spectator mode (optional)
- [ ] Leaderboard system
- [ ] Rate limiting and anti-cheat basics
- [ ] Optimize database queries (indexes, caching)

#### Frontend Tasks
- [ ] Real-time battle interface:
  - Deploy troops during live battle
  - See opponent's moves in real-time
- [ ] Sound effects (Howler.js):
  - Building placement sounds
  - Troop training sounds
  - Battle sounds (attacks, explosions)
  - Background music
- [ ] UI polish with Framer Motion:
  - Page transitions
  - Button hover effects
  - Resource counter animations
  - Victory/defeat animations
- [ ] Create tutorial/onboarding flow
- [ ] Add loading screens with game tips
- [ ] Optimize rendering performance
- [ ] Mobile responsiveness

#### Game Design
- [ ] Create sound effect library
- [ ] Design UI theme (color palette, fonts)
- [ ] Create particle effects for explosions, hits
- [ ] Add visual feedback for all actions
- [ ] Balance testing and adjustments

**Deliverable**: Polished, playable multiplayer game with good UX

---

## Database Schema (Initial)

### Users
```typescript
{
  id: uuid (PK)
  username: string (unique)
  email: string (unique)
  password_hash: string
  created_at: timestamp
  updated_at: timestamp
}
```

### Villages
```typescript
{
  id: uuid (PK)
  user_id: uuid (FK -> users.id)
  name: string
  trophies: integer (for matchmaking)
  created_at: timestamp
  updated_at: timestamp
}
```

### Resources
```typescript
{
  id: uuid (PK)
  village_id: uuid (FK -> villages.id)
  gold: integer
  elixir: integer
  last_collected_at: timestamp
  updated_at: timestamp
}
```

### Buildings
```typescript
{
  id: uuid (PK)
  village_id: uuid (FK -> villages.id)
  type: string (town_hall, gold_mine, archer_tower, etc.)
  level: integer (default 1, for future upgrades)
  position_x: integer
  position_y: integer
  health: integer (current health)
  max_health: integer
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### Troops (User's Army)
```typescript
{
  id: uuid (PK)
  village_id: uuid (FK -> villages.id)
  type: string (barbarian, archer, giant, etc.)
  count: integer (how many of this troop type)
  updated_at: timestamp
}
```

### Training Queue
```typescript
{
  id: uuid (PK)
  village_id: uuid (FK -> villages.id)
  troop_type: string
  quantity: integer
  started_at: timestamp
  completes_at: timestamp
  status: string (training, completed, cancelled)
}
```

### Battles
```typescript
{
  id: uuid (PK)
  attacker_id: uuid (FK -> villages.id)
  defender_id: uuid (FK -> villages.id)
  attacker_troops: jsonb (troops used)
  destruction_percentage: integer
  stars: integer (0-3 based on destruction)
  loot_gold: integer
  loot_elixir: integer
  battle_log: jsonb (optional, for replay)
  created_at: timestamp
}
```

---

## Technical Architecture

### Backend Structure (NestJS)
```
src/
├── auth/                 # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   └── guards/
├── users/                # User management
├── villages/             # Village CRUD
├── buildings/            # Building placement, management
├── resources/            # Resource generation, collection
├── troops/               # Troop training, army
├── battles/              # Battle simulation, matchmaking
├── websockets/           # Socket.io gateway
├── config/               # Configuration
├── database/             # Drizzle schema and migrations
├── common/               # Shared utilities, decorators
└── main.ts
```

### Frontend Structure (Next.js)
```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (game)/
│   ├── village/          # Main village view
│   ├── army/             # Troop training
│   ├── attack/           # Attack interface
│   ├── history/          # Battle history
│   └── leaderboard/
├── layout.tsx
└── page.tsx

components/
├── game/
│   ├── GameCanvas.tsx    # Pixi.js canvas wrapper
│   ├── Grid.tsx          # Village grid system
│   ├── Building.tsx      # Building component
│   ├── BuildingShop.tsx
│   ├── ResourceBar.tsx
│   ├── TroopCard.tsx
│   └── BattleView.tsx
├── ui/                   # shadcn components
└── layout/

lib/
├── game-engine/          # Pixi.js game logic
│   ├── renderer.ts
│   ├── sprites.ts
│   ├── animations.ts
│   └── battle-engine.ts
├── api/                  # API client functions
├── stores/               # Zustand stores
│   ├── useVillageStore.ts
│   ├── useAuthStore.ts
│   └── useBattleStore.ts
└── utils/

public/
├── sprites/              # Game sprites
├── sounds/               # Audio files
└── assets/
```

---

## Key Technical Decisions & Recommendations

### 1. Real-time Communication
- Use **Socket.io** for both backend and frontend
- REST API for CRUD operations (village, buildings, troops)
- WebSocket for:
  - Resource updates (live counter)
  - Training completion notifications
  - Live battle events (Phase 6)
  - Matchmaking

### 2. Game Rendering
- **Pixi.js** is perfect for 2D tile-based games
  - Hardware-accelerated rendering (WebGL)
  - Sprite batching for performance
  - Built-in animation support
  - Large community and examples
- Alternative: **Phaser 3** (more game-focused, might be overkill)

### 3. Animation Libraries
- **GSAP (GreenSock)**: Best for complex game animations (troop movement, projectiles)
- **Framer Motion**: Best for UI transitions and React component animations
- Use both strategically

### 4. State Management
- **Zustand** over Redux:
  - Simpler API
  - Less boilerplate
  - Better for real-time updates
  - Easier WebSocket integration

### 5. Grid System
- Use a **tile-based grid** (e.g., 40x40 tiles)
- Each building occupies multiple tiles
- Store positions as grid coordinates, not pixels
- Validate placement server-side

### 6. Battle Simulation
- **Server-side simulation** (authoritative) to prevent cheating
- Send battle log to client for replay rendering
- Client renders animations based on server results
- For Phase 5: Pre-calculate entire battle
- For Phase 6: Real-time, send updates every game tick

### 7. Asset Management
- Start with **simple geometric shapes** or free sprite packs
- Recommended free assets:
  - Kenney.nl (thousands of free game assets)
  - OpenGameArt.org
  - itch.io free asset packs
- Use **TexturePacker** or **sprite-atlas** to combine sprites

### 8. Performance Optimization
- Implement object pooling for troops/projectiles (Pixi.js)
- Use sprite sheets instead of individual images
- Lazy load game assets
- Implement viewport culling (only render visible area)
- Use Redis for caching frequent queries (optional for MVP)

---

## Development Workflow

### Git Strategy
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - feature branches
- Regular commits with conventional commit messages

### Testing Strategy (Post-MVP)
- Backend: Jest unit tests for services
- Frontend: React Testing Library for components
- E2E: Playwright for critical flows
- For MVP: Manual testing is acceptable

### Deployment (Future)
- Backend: Docker + Cloud hosting (Railway, Render, Fly.io)
- Frontend: Vercel (optimized for Next.js)
- Database: Managed PostgreSQL (Supabase, Neon, Railway)
- WebSocket: Ensure hosting supports WebSocket connections

---

## MVP Success Metrics
After completing Phase 5, you should have:
- [ ] Users can register and log in
- [ ] Users can place buildings in their village
- [ ] Resources auto-generate and can be collected
- [ ] Users can train 3+ troop types
- [ ] Users can attack AI villages
- [ ] Battle simulation works with visible results
- [ ] Loot system rewards attackers
- [ ] Responsive UI with game feel
- [ ] No critical bugs

---

## Estimated Timeline
- **Phase 1**: 1-2 weeks (Foundation)
- **Phase 2**: 1 week (Village & Resources)
- **Phase 3**: 1 week (Building Placement)
- **Phase 4**: 1 week (Army System)
- **Phase 5**: 2 weeks (Combat System)
- **Phase 6**: 2+ weeks (Multiplayer & Polish)

**Total MVP**: 8-10 weeks for a solo developer, 4-6 weeks for a small team

---

## Next Steps

1. **Start with Phase 1**: Set up both backend and frontend projects
2. **Create project repositories**: Monorepo or separate repos
3. **Set up local development environment**: PostgreSQL, Node.js
4. **Get free sprite assets**: Kenney.nl or placeholder graphics
5. **Build iteratively**: Complete each phase before moving to the next
6. **Test frequently**: Manually test each feature as you build
7. **Get feedback**: Share with friends after Phase 3-4

---

## Additional Resources

### Learning Resources
- **Pixi.js**: https://pixijs.com/tutorials
- **Socket.io**: https://socket.io/docs/v4/
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview
- **NestJS**: https://docs.nestjs.com/
- **Game Dev Patterns**: https://gameprogrammingpatterns.com/

### Inspiration & Reference
- Study Clash of Clans mechanics on YouTube
- Play similar browser games for UI/UX ideas
- Join game dev communities (r/gamedev, Discord servers)

### Free Asset Packs (2D Fantasy/Medieval)
- https://kenney.nl/assets?q=2d
- https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=9
- https://itch.io/game-assets/free/tag-2d

---

Good luck with your game! Start small, iterate fast, and have fun building! 🎮
