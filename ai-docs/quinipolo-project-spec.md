# Quinipolo Project Specification

## Project Overview

Quinipolo is a sports prediction application with three main components:
- **quinipolo-be**: Node.js/Express backend with Supabase (PostgreSQL)
- **quinipolo-mobile**: React Native/Expo mobile app
- **quinipolo-fe**: React web frontend
- **quinipolo-scrapper**: Web scraping service for sports data

## Technology Stack

### Backend (quinipolo-be)
- Node.js + Express.js
- Supabase (PostgreSQL database)
- JWT authentication
- RESTful API architecture
- Migration-based schema management

### Mobile (quinipolo-mobile)
- React Native + Expo SDK
- TypeScript
- React Navigation
- Context API for state management
- Expo Notifications for push notifications
- AsyncStorage for local persistence

### Frontend (quinipolo-fe)
- React + TypeScript
- Material-UI components
- React Router
- i18next for internationalization

## Current Focus: Notification System

### Goal
Implement a push notification system that alerts users when:
1. A new quinipolo is created in their league
2. A quinipolo is corrected in their league
3. Also build an in-app notification center

### Architecture Requirements

#### Skills Needed
We need skills for:
- **Backend API Development**: Express controllers, services, routes, middleware
- **Database Migrations**: Supabase/PostgreSQL schema design and migrations
- **Mobile React Native**: Expo components, screens, navigation
- **Expo Notifications**: Push notification setup and handling
- **API Integration**: Connecting mobile app to backend APIs
- **State Management**: Context API patterns and AsyncStorage

#### Subagents Needed
We need subagents for:
- **Backend Developer**: API endpoints, business logic, notification service
- **Database Architect**: Schema design, migrations, indexes
- **Mobile Developer**: React Native screens, components, navigation
- **Integration Specialist**: Connecting backend and mobile, testing flows
- **Testing Engineer**: Writing and running tests, validation

## Coding Standards

### Backend Patterns
- Controllers handle HTTP requests/responses
- Services contain business logic
- Keep controllers thin, services thick
- Use try-catch for error handling
- Return consistent response formats
- Use migrations for all schema changes

### Mobile Patterns
- Functional components with hooks
- Context API for global state
- Services for API calls
- Screens for full-page views
- Components for reusable UI
- TypeScript strict mode enabled

### File Naming Conventions
- Backend: PascalCase for controllers/services (e.g., `NotificationController.js`)
- Mobile: PascalCase for components/screens (e.g., `NotificationCenterScreen.tsx`)
- Services: camelCase with service suffix (e.g., `notificationService.ts`)
- Routes: lowercase with hyphens (e.g., `notifications.js`)

## Integration Points

### Key Backend Files
- [QuinipolosController.js:154-157](quinipolo-be/controllers/QuinipolosController.js#L154-L157) - Create quinipolo
- [QuinipolosController.js:1040](quinipolo-be/controllers/QuinipolosController.js#L1040) - Correct quinipolo
- [app.js:58](quinipolo-be/app.js#L58) - Route registration

### Key Mobile Files
- [UserContext.tsx:175-188](quinipolo-mobile/src/context/UserContext.tsx#L175-L188) - Login flow
- [HomeStackNavigator.tsx](quinipolo-mobile/src/navigation/HomeStackNavigator.tsx) - Navigation setup
- [AppHeader.tsx](quinipolo-mobile/src/components.backup/AppHeader.tsx) - Header component pattern

## Project Structure

### Backend Structure
```
quinipolo-be/
  controllers/     # HTTP request handlers
  services/        # Business logic
  routes/          # Express route definitions
  models/          # Database models
  middleware/      # Express middleware
  migrations/      # Database migrations
  utils/           # Helper functions
```

### Mobile Structure
```
quinipolo-mobile/
  src/
    screens/       # Full-page views
    components/    # Reusable UI components
    navigation/    # React Navigation setup
    context/       # Context providers
    services/      # API calls and utilities
    hooks/         # Custom React hooks
    types/         # TypeScript type definitions
    utils/         # Helper functions
```

## Development Workflow

1. **Planning**: Use plan mode to create detailed implementation plans
2. **Backend First**: Start with database schema and API endpoints
3. **Mobile Second**: Implement UI and connect to backend
4. **Testing**: Test on physical devices (push notifications require real devices)
5. **Integration**: Ensure all pieces work together
6. **Commit**: Organize commits by feature/component

## Success Criteria

- Users receive push notifications on real devices
- Notifications navigate to correct screens when tapped
- In-app notification center displays history
- Read/unread status tracking works
- Tokens are properly managed (register/remove)
- No blocking errors if notifications fail
- Works on both iOS and Android
