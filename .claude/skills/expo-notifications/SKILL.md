---
name: expo-notifications
description: Implement Expo push notifications including permission requests, token management, and notification handlers. Use when setting up push notifications, handling notification events, or configuring app.json for notifications.
---

# Expo Push Notifications

## Instructions

When implementing push notifications for the quinipolo-mobile project:

1. **Installation**
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```

2. **Notification Handler Setup**
   Configure in App.tsx or main entry point:
   ```typescript
   import * as Notifications from 'expo-notifications';

   Notifications.setNotificationHandler({
     handleNotification: async () => ({
       shouldShowAlert: true,
       shouldPlaySound: true,
       shouldSetBadge: true,
     }),
   });
   ```

3. **Request Permission & Get Token**
   ```typescript
   import * as Device from 'expo-device';
   import * as Notifications from 'expo-notifications';
   import Constants from 'expo-constants';

   export async function registerForPushNotifications() {
     let token;

     if (Device.isDevice) {
       const { status: existingStatus } = await Notifications.getPermissionsAsync();
       let finalStatus = existingStatus;

       if (existingStatus !== 'granted') {
         const { status } = await Notifications.requestPermissionsAsync();
         finalStatus = status;
       }

       if (finalStatus !== 'granted') {
         return null;
       }

       token = (await Notifications.getExpoPushTokenAsync({
         projectId: Constants.expoConfig?.extra?.eas?.projectId,
       })).data;
     }

     return token;
   }
   ```

4. **Notification Listeners**
   Add in useEffect hook:
   ```typescript
   useEffect(() => {
     // Foreground notification handler
     const subscription = Notifications.addNotificationReceivedListener(notification => {
       console.log('Notification received:', notification);
     });

     // Background/tap handler
     const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
       const data = response.notification.request.content.data;
       // Navigate based on data
     });

     return () => {
       subscription.remove();
       responseSubscription.remove();
     };
   }, []);
   ```

5. **Deep Linking from Notifications**
   ```typescript
   Notifications.addNotificationResponseReceivedListener(response => {
     const { type, quinipoloId, leagueId } = response.notification.request.content.data;

     if (type === 'quinipolo_created' && quinipoloId) {
       navigation.navigate('HomeStack', {
         screen: 'AnswerQuinipolo',
         params: { quinipoloId }
       });
     }
   });
   ```

6. **app.json Configuration**
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

## Best Practices

- **Physical devices only**: Push notifications don't work on simulators
- **Permission gracefully**: App should work without notifications
- **Update tokens**: Check/update token on every app launch
- **Unregister on logout**: Remove token from backend when user signs out
- **Handle all states**: Foreground, background, and killed app states
- **Test thoroughly**: Test on both iOS and Android devices
- **Expo account required**: Need Expo account for push notification service

## Integration Points

**On Login (UserContext.tsx):**
```typescript
const pushToken = await NotificationService.registerForPushNotifications();
if (pushToken) {
  await NotificationService.saveTokenToBackend(pushToken);
}
```

**On Logout (UserContext.tsx):**
```typescript
const token = await Notifications.getExpoPushTokenAsync();
if (token) {
  await NotificationService.removeTokenFromBackend(token.data);
}
```

## Backend Notification Format

When sending from backend (using expo-server-sdk):
```javascript
{
  to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  sound: 'default',
  title: 'New Quinipolo!',
  body: 'A new quinipolo has been created in Liga Principal',
  data: {
    type: 'quinipolo_created',
    quinipoloId: 'uuid-here',
    leagueId: 'uuid-here'
  }
}
```

## Error Handling

```typescript
try {
  const token = await registerForPushNotifications();
  if (!token) {
    console.log('Permission denied or not a physical device');
    // Continue without notifications
  }
} catch (error) {
  console.error('Failed to get push token:', error);
  // Don't block app functionality
}
```

## Testing Checklist

- [ ] Permission prompt appears on first launch
- [ ] Token successfully sent to backend
- [ ] Foreground notifications show alert
- [ ] Background notifications appear in system tray
- [ ] Tapping notification navigates to correct screen
- [ ] Badge count updates correctly
- [ ] Works on iOS physical device
- [ ] Works on Android physical device
- [ ] Token removed on logout
