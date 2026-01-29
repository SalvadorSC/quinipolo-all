---
name: api-integration
description: Integrate mobile app with backend APIs using fetch/axios. Use when creating API service functions, handling authentication, or connecting frontend to backend endpoints.
---

# API Integration

## Instructions

When integrating mobile app with backend APIs:

1. **Service File Pattern**
   Location: `src/services/`

   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

   async function getAuthToken() {
     return await AsyncStorage.getItem('authToken');
   }

   export const notificationService = {
     async getNotifications(page = 1, limit = 20) {
       const token = await getAuthToken();
       const response = await fetch(
         `${API_BASE_URL}/api/notifications?page=${page}&limit=${limit}`,
         {
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
           },
         }
       );

       if (!response.ok) {
         throw new Error('Failed to fetch notifications');
       }

       return await response.json();
     },

     async registerToken(pushToken: string, deviceInfo: object) {
       const token = await getAuthToken();
       const response = await fetch(`${API_BASE_URL}/api/notifications/tokens`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ token: pushToken, deviceInfo }),
       });

       if (!response.ok) {
         throw new Error('Failed to register token');
       }

       return await response.json();
     },

     async markAsRead(notificationId: string) {
       const token = await getAuthToken();
       const response = await fetch(
         `${API_BASE_URL}/api/notifications/${notificationId}/read`,
         {
           method: 'PATCH',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
           },
         }
       );

       return await response.json();
     }
   };
   ```

2. **Environment Variables**
   Create `.env` file in mobile root:
   ```
   EXPO_PUBLIC_API_URL=https://api.quinipolo.com
   ```

3. **Error Handling**
   ```typescript
   try {
     const data = await notificationService.getNotifications();
     setNotifications(data);
   } catch (error) {
     console.error('API Error:', error);
     Alert.alert('Error', 'Failed to load notifications');
   } finally {
     setLoading(false);
   }
   ```

4. **Loading States**
   ```typescript
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);

   const fetchData = async () => {
     setLoading(true);
     setError(null);
     try {
       const data = await service.getData();
       setData(data);
     } catch (err) {
       setError(err.message);
     } finally {
       setLoading(false);
     }
   };
   ```

5. **Authentication Headers**
   - Always include Bearer token for protected endpoints
   - Store JWT in AsyncStorage
   - Handle 401 responses (token expired)
   - Redirect to login if authentication fails

## Best Practices

- **Environment variables**: Never hardcode API URLs
- **Error messages**: User-friendly messages, technical details in console
- **Loading states**: Show spinners during API calls
- **Retry logic**: Consider implementing for failed requests
- **Timeout**: Set reasonable timeout for requests
- **HTTPS**: Always use HTTPS in production
- **Type safety**: Define TypeScript interfaces for responses

## Response Format

Backend should return consistent format:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## Common Patterns

**GET Request:**
```typescript
async function getData() {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/endpoint`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
```

**POST Request:**
```typescript
async function postData(body: object) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/endpoint`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return await response.json();
}
```

**PATCH Request:**
```typescript
async function updateData(id: string, updates: object) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/endpoint/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return await response.json();
}
```

**DELETE Request:**
```typescript
async function deleteData(id: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/endpoint/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
```

## Testing Integration

- Test with actual backend running locally
- Use network inspector to debug requests
- Verify request/response formats
- Test error scenarios (network off, 401, 500)
- Test with real authentication tokens
