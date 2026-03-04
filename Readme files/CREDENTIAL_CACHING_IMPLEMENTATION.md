# Credential Caching Implementation

## Overview
This implementation adds credential caching functionality to the ShadCN Admin application, allowing users to login faster on subsequent app launches by checking the local database first before making API calls.

## How It Works

### 1. **Startup Flow**
- When the application starts, `GlobalAuthRehydrator` in `main.tsx` calls `checkCachedCredentials()`
- This function checks the local database for saved user credentials
- If credentials are found, it attempts to login using the cached email/password
- If successful, the user is automatically logged in without manual intervention
- If failed, the user is redirected to the login screen

### 2. **Login Flow**
- When a user manually logs in through the login form, the system:
  1. Calls the API with the provided credentials
  2. If successful, saves the user credentials (including password) to the local database
  3. Sets the user session and navigates to the dashboard

### 3. **Logout Flow**
- When a user logs out, the system:
  1. Clears all cached credentials from the database (removes passwords)
  2. Calls the API logout endpoint
  3. Clears the local session

## Key Functions

### `checkCachedCredentials()`
- Checks the local database for the most recently updated user
- Attempts to login with cached credentials
- Returns login response if successful, null if failed

### `saveUserCredentials(user, password)`
- Saves user data including password to the local database
- Called after successful API login
- Enables future cached logins

### `hasCachedCredentials()`
- Checks if any user in the database has cached credentials
- Returns boolean indicating presence of cached credentials
- Useful for UI indicators (e.g., "Remember me" checkbox)

### `clearCachedCredentials()`
- Removes passwords from all users in the database
- Called during logout to ensure security
- Prevents unauthorized access to cached credentials

## Security Considerations

1. **Password Storage**: Passwords are stored in the local SQLite database. While this provides convenience, it's important to note that:
   - The database file is stored locally on the user's machine
   - Passwords are stored in plain text (consider encryption for production)
   - Users should be aware that credentials are cached locally

2. **Automatic Cleanup**: Passwords are automatically cleared on logout to prevent unauthorized access

3. **Fallback Mechanism**: If cached login fails, the system gracefully falls back to manual login

## Database Schema

The system uses the existing `users` table with the following relevant fields:
- `email`: User's email address
- `password`: Cached password for auto-login
- `updated_at`: Timestamp used to determine the most recent user

## Benefits

1. **Faster Login**: Users don't need to enter credentials every time they start the app
2. **Better UX**: Seamless experience for returning users
3. **Offline Capability**: Can attempt login even when offline (if credentials are cached)
4. **Reduced API Calls**: Fewer authentication requests to the server

## Usage

The system works automatically once implemented. Users will experience:
1. First login: Normal login process, credentials are saved
2. Subsequent app launches: Automatic login if credentials are valid
3. Logout: Credentials are cleared, next login requires manual input

## Testing

A test script `test-credential-cache.js` is provided to verify the functionality. Run it to test:
- Checking for cached credentials
- Attempting cached login
- Saving credentials
- Clearing credentials

## Files Modified

1. `src/api/auth.ts` - Added credential caching functions
2. `src/main.tsx` - Added startup credential check
3. `src/features/auth/sign-in/components/user-auth-form.tsx` - Added credential saving on login
4. `test-credential-cache.js` - Test script for verification

## Future Enhancements

1. **Encryption**: Encrypt passwords before storing in database
2. **Expiration**: Add credential expiration mechanism
3. **Multiple Users**: Support for multiple cached users
4. **Biometric**: Add biometric authentication for cached logins
5. **Settings**: Allow users to enable/disable credential caching

