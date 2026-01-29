---
name: react-native-expo
description: Develop React Native components and screens using Expo SDK and TypeScript. Use when creating or modifying mobile UI, navigation, or Expo-specific features.
---

# React Native with Expo Development

## Instructions

When developing React Native components for the quinipolo-mobile project:

1. **File Organization**
   - Screens: `src/screens/` (PascalCase, e.g., `NotificationCenterScreen.tsx`)
   - Components: `src/components/` (PascalCase, e.g., `NotificationBell.tsx`)
   - Services: `src/services/` (camelCase, e.g., `notificationService.ts`)
   - Hooks: `src/hooks/` (camelCase with 'use' prefix, e.g., `useNotificationBadge.ts`)
   - Types: `src/types/` (PascalCase, e.g., `NotificationTypes.ts`)

2. **Component Patterns**
   - Use functional components with hooks
   - TypeScript strict mode enabled
   - Props interfaces defined at top of file
   - Export component as default

   ```typescript
   interface NotificationBellProps {
     unreadCount: number;
     onPress?: () => void;
   }

   export default function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
     return (
       <TouchableOpacity onPress={onPress}>
         {/* Component JSX */}
       </TouchableOpacity>
     );
   }
   ```

3. **Navigation**
   - Use React Navigation v6
   - Type-safe navigation with param lists
   - Stack navigators for hierarchical flows
   - Add screens to appropriate navigator files

   ```typescript
   type HomeStackParamList = {
     Home: undefined;
     NotificationCenter: undefined;
     ViewQuinipolo: { quinipoloId: string };
   };
   ```

4. **State Management**
   - Context API for global state
   - useState for local component state
   - useEffect for side effects
   - Custom hooks for reusable logic

5. **Styling**
   - StyleSheet.create for performance
   - Consistent spacing and colors
   - Responsive design with Dimensions
   - Platform-specific styles when needed

6. **Services Pattern**
   ```typescript
   export const notificationService = {
     async getNotifications(page: number, limit: number) {
       // API call logic
     },
     async markAsRead(notificationId: string) {
       // API call logic
     }
   };
   ```

## Best Practices

- Always type props and return types
- Use optional chaining (?.) for safe access
- Handle loading and error states
- Provide feedback for user actions (loading spinners, success messages)
- Use FlatList for lists (better performance)
- Implement pull-to-refresh for data lists
- Handle safe area insets on iOS
- Test on both iOS and Android

## Common Expo Imports

```typescript
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
```

## Examples

**Screen Component:**
```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { notificationService } from '../services/notificationService';

export default function NotificationCenterScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(1, 20);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={({ item }) => <NotificationItem item={item} />}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

**Custom Hook:**
```typescript
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

export function useNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  return { unreadCount, refetch: fetchUnreadCount };
}
```
