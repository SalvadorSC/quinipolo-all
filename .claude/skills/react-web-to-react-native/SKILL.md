---
name: react-web-to-react-native
description: Port React web components to React Native/Expo. Use when converting quinipolo-fe components to quinipolo-mobile screens or when user asks to port web UI to mobile.
---

# React Web to React Native Porting

## Instructions

1. Identify the FE component and its props, state, and side effects
2. Map HTML elements to React Native equivalents (div→View, span→Text, button→Pressable/Button, input→TextInput)
3. Replace CSS/Sass with StyleSheet or React Native Paper
4. Replace react-router with React Navigation (useNavigation, navigation.navigate)
5. Replace Ant Design/MUI with React Native Paper or React Native Reusables
6. Adapt drag-and-drop: @dnd-kit → react-native-draggable-flatlist or similar
7. Preserve business logic; move API calls, validation, and hooks as-is when possible

## Examples

**Input:** Port SurveyForm to mobile  
**Output:** Create SurveyFormScreen using ReorderableList equivalent, DatePicker, league selection; reuse validation and API logic

**Input:** Port GoalsInputs to React Native  
**Output:** Replace Ant Design ToggleButtonGroup with RN Paper SegmentedButtons or custom; keep goalsValidationUtils

## Best Practices

- Prefer React Native Reusables (per .cursorrules) over custom components
- Keep shared logic in quinipolo-shared when both FE and mobile need it
- Use Platform.select or .native.tsx for platform-specific code
- Preserve i18n keys; add to mobile locales if missing
- Match FE validation rules; port validationUtils, goalsValidationUtils as-is
