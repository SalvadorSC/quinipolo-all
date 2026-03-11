---
name: expo-deep-linking
description: Configure Expo deep linking for quinipolo-mobile. Use when implementing join-league share links, reset password redirects, or app linking.
---

# Expo Deep Linking

## Instructions

1. Configure scheme in app.json (e.g. `quinipolo://`)
2. Use expo-linking: `Linking.getInitialURL()` and `Linking.addEventListener('url')`
3. Parse URL path and query (e.g. `/join-league/:shareToken`, `?token=` for reset)
4. Store pendingShareToken or reset token; navigate after auth if needed
5. Handle both cold start (getInitialURL) and warm start (addEventListener)

## Examples

**Input:** Implement join league by share link  
**Output:** Handle `quinipolo://join-league/TOKEN`; store token; after login, call join API and navigate to LeagueDashboard

**Input:** Reset password deep link  
**Output:** Handle `quinipolo://reset-password?token=...`; navigate to ResetPasswordScreen with token

## Best Practices

- Test on iOS and Android; use Expo Go or dev client
- Fallback for web: window.location for reset link
- Clear pendingShareToken after use
- Use expo-linking for URL parsing; handle universal links if needed
