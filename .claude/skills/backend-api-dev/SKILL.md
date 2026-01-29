---
name: backend-api-dev
description: Develop Express.js backend APIs with controllers, services, and routes. Use when creating or modifying Node.js backend endpoints, business logic, or Express middleware.
---

# Backend API Development

## Instructions

When developing backend APIs for the quinipolo project:

1. **Structure**
   - Controllers handle HTTP requests/responses only
   - Services contain business logic and database operations
   - Routes define endpoint paths and middleware
   - Keep controllers thin, services thick

2. **File Organization**
   - Controllers: `quinipolo-be/controllers/` (PascalCase, e.g., `NotificationController.js`)
   - Services: `quinipolo-be/services/` (PascalCase, e.g., `NotificationService.js`)
   - Routes: `quinipolo-be/routes/` (lowercase, e.g., `notifications.js`)

3. **Code Patterns**
   ```javascript
   // Controller Pattern
   async functionName(req, res) {
     try {
       const result = await ServiceName.method(params);
       res.status(200).json({ success: true, data: result });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ success: false, error: error.message });
     }
   }
   ```

4. **Error Handling**
   - Always wrap async operations in try-catch
   - Return consistent response format: `{ success: boolean, data/error: any }`
   - Log errors to console for debugging
   - Non-blocking: notification failures should not block main operations

5. **Integration**
   - Register routes in `app.js` around line 58
   - Use existing authentication middleware where needed
   - Follow RESTful conventions for endpoints

## Best Practices

- Use async/await for asynchronous operations
- Validate input parameters
- Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- Keep endpoints focused and single-purpose
- Document complex business logic with comments
- Test endpoints with actual API calls

## Examples

**Service Method:**
```javascript
async sendPushNotification(tokens, title, body, data) {
  // Business logic here
  return result;
}
```

**Controller Method:**
```javascript
async registerToken(req, res) {
  try {
    const { token, deviceInfo } = req.body;
    await NotificationService.registerDeviceToken(req.user.id, token, deviceInfo);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

**Route Definition:**
```javascript
router.post('/tokens', authenticate, NotificationController.registerToken);
router.get('/', authenticate, NotificationController.getNotifications);
```
