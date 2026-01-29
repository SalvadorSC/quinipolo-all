# Notification System Implementation Plan

## Overview
Implement a basic push notification system that alerts users when:
1. A new quinipolo is created in their league
2. A quinipolo is corrected in their league

Also build an in-app notification center to view notification history.

## Technical Approach

**Push Notification Provider:** Expo Push Notifications (native to Expo SDK)
- Simpler setup than Firebase for Expo apps
- No additional credential management needed
- 10M notifications/month free tier sufficient

## Implementation Phases

### Phase 1: Database Schema (Backend Foundation)

**Create Supabase migrations:**

1. **`notification_tokens` table** - Store device push tokens
   ```sql
   - id (uuid, primary key)
   - user_id (uuid, references profiles)
   - expo_push_token (text, unique)
   - device_info (jsonb) - platform, deviceName, osVersion
   - is_active (boolean)
   - created_at, updated_at, last_used_at (timestamps)
   - Indexes: user_id, is_active, expo_push_token
   ```

2. **`notifications` table** - Store notification history
   ```sql
   - id (uuid, primary key)
   - user_id (uuid, references profiles)
   - type (text) - 'quinipolo_created' | 'quinipolo_corrected'
   - quinipolo_id (uuid, references quinipolos)
   - league_id (uuid, references leagues)
   - title (text)
   - body (text)
   - data (jsonb) - Additional navigation context
   - read_status (boolean, default false)
   - created_at (timestamp)
   - Indexes: user_id, read_status, created_at
   ```

**Files to create:**
- `/quinipolo-be/migrations/create_notification_tables.sql`

### Phase 2: Backend Notification Service

**Install dependencies:**
```bash
cd quinipolo-be
npm install expo-server-sdk
```

**Create NotificationService:**
- File: `/quinipolo-be/services/NotificationService.js`
- Key functions:
  - `notifyNewQuinipolo(quinipoloId, leagueId)` - Send push to all league members
  - `notifyQuinipoloCorrected(quinipoloId, leagueId)` - Send push to all league members
  - `registerDeviceToken(userId, token, deviceInfo)` - Store/update token
  - `removeDeviceToken(token)` - Delete token on logout
  - `sendPushNotification(tokens[], title, body, data)` - Core sending logic

**Create NotificationController:**
- File: `/quinipolo-be/controllers/NotificationController.js`
- Endpoints:
  - `POST /api/notifications/tokens` - Register device token
  - `DELETE /api/notifications/tokens/:token` - Remove token
  - `GET /api/notifications/` - Get user notification history (paginated)
  - `PATCH /api/notifications/:id/read` - Mark notification as read
  - `PATCH /api/notifications/read-all` - Mark all as read

**Create routes:**
- File: `/quinipolo-be/routes/notifications.js`
- Register in [app.js:58](quinipolo-be/app.js#L58): `app.use('/api/notifications', notificationsRoutes);`

**Integrate into quinipolo flow:**
- File: [QuinipolosController.js:154-157](quinipolo-be/controllers/QuinipolosController.js#L154-L157)
  - Uncomment notification call after quinipolo creation
  - Add try-catch to prevent blocking if notification fails

- File: [QuinipolosController.js:1040](quinipolo-be/controllers/QuinipolosController.js#L1040)
  - Add notification call after correction is saved
  - Wrap in try-catch

Also integrate in:
- `createQuinipoloForAllLeagues` (line 169)
- `createQuinipoloForManagedLeagues` (line 284)
- `editQuinipoloCorrection` (line 1182)

### Phase 3: Mobile App - Permission & Token Management

**Install dependencies:**
```bash
cd quinipolo-mobile
npx expo install expo-notifications expo-device expo-constants
```

**Create notification service:**
- File: `/quinipolo-mobile/src/services/notificationService.ts`
- Functions:
  - `registerForPushNotifications()` - Request permissions, get token
  - `saveTokenToBackend(token)` - Send token to backend API
  - `removeTokenFromBackend(token)` - Delete token from backend
  - `setupNotificationListeners(navigation)` - Handle received notifications
  - `getNotifications(page, limit)` - Fetch notification history
  - `markAsRead(notificationId)` - Mark single notification as read
  - `markAllAsRead()` - Mark all notifications as read

**Configure notification handler:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Update UserContext:**
- File: [UserContext.tsx:175-188](quinipolo-mobile/src/context/UserContext.tsx#L175-L188)
- After successful login and profile fetch, add:
  ```typescript
  const pushToken = await NotificationService.registerForPushNotifications();
  if (pushToken) {
    await NotificationService.saveTokenToBackend(pushToken);
  }
  ```

- In `signOut` function (around line 277):
  - Remove token from backend before clearing user data

**Update app.json:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1890ff"
        }
      ]
    ]
  }
}
```

### Phase 4: Notification Center UI

**Create NotificationBell component:**
- File: `/quinipolo-mobile/src/components/NotificationBell.tsx`
- Shows bell icon with badge count for unread notifications
- Navigates to NotificationCenter screen on tap
- Props: `unreadCount: number`

**Create NotificationItem component:**
- File: `/quinipolo-mobile/src/components/NotificationItem.tsx`
- Individual notification card with icon, title, body, timestamp
- Visual indicator for read/unread status
- Tap handler for navigation

**Create NotificationCenter screen:**
- File: `/quinipolo-mobile/src/screens/NotificationCenterScreen.tsx`
- FlatList of notifications with pagination
- Pull-to-refresh functionality
- "Mark all as read" button
- Empty state when no notifications
- Tap notification → navigate to quinipolo/league screen

**Create notification badge hook:**
- File: `/quinipolo-mobile/src/hooks/useNotificationBadge.ts`
- Fetches unread count
- Updates app icon badge
- Provides refetch function

**Update navigation:**
- File: [HomeStackNavigator.tsx](quinipolo-mobile/src/navigation/HomeStackNavigator.tsx)
- Add `NotificationCenter: undefined` to `HomeStackParamList` type
- Add screen: `<Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />`
- Repeat for LeaguesStack and ProfileStack

**Integrate header with bell:**
- Use the backup [AppHeader.tsx](quinipolo-mobile/src/components.backup/AppHeader.tsx) component
- Add to main screens (HomeScreen, LeaguesScreen, ProfileScreen):
  ```typescript
  <AppHeader
    rightComponent={<NotificationBell unreadCount={unreadCount} />}
  />
  ```

### Phase 5: Deep Linking

**Setup notification tap handler:**
- File: `/quinipolo-mobile/App.tsx` (or main entry point)
- Add listener in useEffect:
  ```typescript
  Notifications.addNotificationResponseReceivedListener(response => {
    const { type, quinipoloId, leagueId } = response.notification.request.content.data;

    if (type === 'quinipolo_created' && quinipoloId) {
      navigationRef.navigate('HomeStack', {
        screen: 'AnswerQuinipolo',
        params: { quinipoloId }
      });
    } else if (type === 'quinipolo_corrected' && quinipoloId) {
      navigationRef.navigate('HomeStack', {
        screen: 'ViewQuinipolo',
        params: { quinipoloId }
      });
    }
  });
  ```

## Testing Checklist

### Backend Testing
- [ ] Run database migration successfully
- [ ] Register device token via API endpoint
- [ ] Create quinipolo → verify notification sent (check backend logs)
- [ ] Correct quinipolo → verify notification sent
- [ ] Fetch notification history via API
- [ ] Mark notification as read

### Mobile Testing (Physical Devices Required)
- [ ] Request notification permission on login
- [ ] Token registered with backend
- [ ] Receive push notification when quinipolo created
- [ ] Receive push notification when quinipolo corrected
- [ ] Tap notification → navigate to correct screen
- [ ] Badge count updates correctly
- [ ] Notification center displays history
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Token removed on logout

### Platform Testing
- [ ] iOS physical device
- [ ] Android physical device
- [ ] Foreground notification (in-app alert)
- [ ] Background notification (system tray)
- [ ] App killed notification (system tray)

## Critical Files Reference

**Backend:**
- [QuinipolosController.js:154-157](quinipolo-be/controllers/QuinipolosController.js#L154-L157) - Integration point for new quinipolo
- [QuinipolosController.js:1040](quinipolo-be/controllers/QuinipolosController.js#L1040) - Integration point for correction
- `/quinipolo-be/services/NotificationService.js` - **NEW** Notification logic
- `/quinipolo-be/controllers/NotificationController.js` - **NEW** API endpoints
- `/quinipolo-be/routes/notifications.js` - **NEW** Route definitions
- [app.js:58](quinipolo-be/app.js#L58) - Register routes

**Mobile:**
- [UserContext.tsx:175-188](quinipolo-mobile/src/context/UserContext.tsx#L175-L188) - Token registration on login
- [AppHeader.tsx](quinipolo-mobile/src/components.backup/AppHeader.tsx) - Header pattern for bell icon
- [HomeStackNavigator.tsx](quinipolo-mobile/src/navigation/HomeStackNavigator.tsx) - Add NotificationCenter screen
- `/quinipolo-mobile/src/services/notificationService.ts` - **NEW** Notification utilities
- `/quinipolo-mobile/src/screens/NotificationCenterScreen.tsx` - **NEW** Notification center UI
- `/quinipolo-mobile/src/components/NotificationBell.tsx` - **NEW** Bell icon component
- `/quinipolo-mobile/src/hooks/useNotificationBadge.ts` - **NEW** Badge count hook

## Notes & Constraints

- **Physical devices required** for testing (push notifications don't work on simulators)
- **Expo account required** for push notification service
- **Graceful degradation** - If user denies permission, app still works (just no push notifications)
- **Error handling** - Notification failures should not block quinipolo creation/correction
- **Token lifecycle** - Tokens can expire/change; update on every app launch
- **Future enhancements** - Notification preferences, scheduled notifications, analytics