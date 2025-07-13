# Universal App - Expo Router + NativeWind

A universal app built with Expo Router v3 and NativeWind that works on web, iOS, and Android from a single codebase.

## Features

- 🚀 **Expo Router v3** with file-based routing
- 🎨 **NativeWind** for Tailwind-style styling
- 🔐 **JWT Authentication** with secure storage
- 📱 **Universal Components** that work on all platforms
- 🌐 **Built-in API Routes** for backend functionality
- 🔄 **Real-time Updates** with WebSocket support
- 📸 **Image Upload** handling for all platforms
- 🌓 **Dark Mode** support
- 📦 **TypeScript** with strict mode

## Project Structure

```
app/
├── (auth)/          # Authentication screens
├── (tabs)/          # Main app tabs
├── api/             # API routes
└── _layout.tsx      # Root layout

components/
├── ui/              # Reusable UI components
├── club/            # Club-specific components
├── event/           # Event-specific components
└── tournament/      # Tournament components

lib/
├── api-client.ts    # API client with interceptors
├── storage.ts       # Secure storage wrapper
├── websocket.ts     # WebSocket configuration
└── db.ts           # Database connection

hooks/
├── useAuth.ts       # Authentication hook
├── useClub.ts       # Club management hook
└── useEvent.ts      # Event management hook
└── useTournament.ts # Tournament hook
└── useWebSocket.ts  # WebSocket hook
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on specific platforms:**
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web Browser
   ```

## Key Technologies

- **Expo SDK 50** - Universal app platform
- **Expo Router v3** - File-based routing
- **NativeWind v4** - Tailwind CSS for React Native
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Socket.io** - Real-time communication
- **Expo Secure Store** - Secure storage for tokens

## Platform-Specific Features

### Web
- Full responsive design
- PWA support
- Server-side rendering ready

### Mobile (iOS & Android)
- Native navigation
- Secure token storage
- Push notifications ready
- Camera and file access

## API Routes

The app includes built-in API routes using Expo Router's API Routes feature:

- `/api/auth/*` - Authentication endpoints
- `/api/clubs/*` - Club management
- `/api/events/*` - Event management
- `/api/tournaments/*` - Tournament system
- `/api/upload/*` - File upload handling

## Authentication Flow

1. User logs in/registers
2. JWT tokens stored securely
3. Automatic token refresh
4. Protected routes redirect to login

## Styling with NativeWind

Use Tailwind classes directly in your components:

```tsx
<View className="flex-1 bg-white dark:bg-gray-900">
  <Text className="text-xl font-bold text-gray-900 dark:text-white">
    Hello World
  </Text>
</View>
```

## Environment Configuration

Create `.env.local` for local development:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=http://localhost:3000
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
MONGODB_URI=mongodb://localhost:27017/app
```

## Building for Production

### Web
```bash
npx expo export --platform web
```

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Contributing

1. Follow TypeScript strict mode
2. Use existing component patterns
3. Ensure cross-platform compatibility
4. Add proper error handling
5. Include loading states

## License

MIT