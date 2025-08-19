# Mobile Platform Setup Guide

## Prerequisites Completed ✅
- Capacitor dependencies installed
- Capacitor configuration file created
- Edge functions configured in Supabase

## Next Steps for Mobile Development

### 1. Export to GitHub and Pull Locally
1. Click "Export to GitHub" button in Lovable
2. Clone your repository locally:
   ```bash
   git clone <your-repo-url>
   cd <your-project>
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Mobile Platforms
```bash
# Add iOS platform (requires macOS with Xcode)
npx cap add ios

# Add Android platform (requires Android Studio)
npx cap add android
```

### 4. Update Platform Dependencies
```bash
# For iOS
npx cap update ios

# For Android  
npx cap update android
```

### 5. Build and Sync
```bash
# Build the web app
npm run build

# Sync with native platforms
npx cap sync
```

### 6. Run on Device/Emulator
```bash
# Run on Android
npx cap run android

# Run on iOS (macOS only)
npx cap run ios
```

## Mobile Features Included

### 🔥 Hot Reload Enabled
The app is configured to connect to the Lovable sandbox for live development.

### 📱 Mobile-Optimized Components
- **MobileOptimizedCollaboration**: Touch gestures, PWA features, offline support
- **Push Notifications**: Native notification support with Supabase integration
- **Responsive Design**: All components are mobile-first responsive

### 🚀 PWA Features
- Install app prompt
- Offline action queue
- Service worker ready
- Mobile session tracking

### 🔔 Push Notifications
- Permission management
- Cross-platform delivery
- Supabase edge function integration
- Device session tracking

## Configuration Details

### Capacitor Config
- **App ID**: `app.lovable.2e56b6e9875e4e78b5184792b76006d6`
- **App Name**: `contentlab-nexus-flow`
- **Hot Reload**: Enabled with Lovable sandbox URL
- **Splash Screen**: Configured with branding
- **Push Notifications**: Ready for FCM/APNs

### Edge Functions
All mobile-related edge functions are configured:
- `ai-collaboration-assistant` (JWT required)
- `mobile-push-notifications` (JWT required)  
- `predictive-analytics-engine` (JWT required)

## Testing on Physical Device

1. **Android**: Requires Android Studio and USB debugging enabled
2. **iOS**: Requires macOS, Xcode, and Apple Developer account for device testing

## Troubleshooting

### Common Issues
- **Build Errors**: Ensure all dependencies are installed with `npm install`
- **Sync Issues**: Run `npx cap sync` after any web app changes
- **Platform Errors**: Update platforms with `npx cap update ios/android`

### Hot Reload Issues
If hot reload isn't working:
1. Check network connectivity
2. Ensure the Lovable sandbox URL is accessible
3. Verify the `server.url` in `capacitor.config.ts`

## Next Development Steps

1. **Test Mobile Features**: Try the collaboration gestures and PWA install
2. **Configure Push Notifications**: Set up FCM for Android and APNs for iOS
3. **Add Native Plugins**: Install additional Capacitor plugins as needed
4. **Performance Testing**: Test on actual devices for optimization

---

**📖 Read the complete mobile development guide**: https://lovable.dev/blogs/TODO