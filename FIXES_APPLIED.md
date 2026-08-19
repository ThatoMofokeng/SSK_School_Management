# Siyakha Student Management System - Logo and Sign-in Fixes

## Changes

- Replaced the application logo with the new Siyakha emblem at `public/SSKLogo02.png`.
- Converted the logo background to transparent for cleaner use in the UI.
- Updated the dashboard logo to use the new PNG and increased its display size.
- Updated the Next.js favicon, shortcut icon, and Apple icon to use the new logo.
- Redesigned the sign-in header so the logo is centered and clearly visible.
- Improved sign-in spacing, input styling, accessibility labels, and loading state.
- Removed the hard-coded `email_code` verification strategy from the username/password-only sign-in screen. That strategy can cause Clerk to register an unsupported verification state when email-code verification/MFA is not enabled in the Clerk instance.
- Kept Clerk's global error display so authentication errors are visible to the user instead of appearing only in the browser console.
- Changed role navigation from `router.push()` to `router.replace()` after successful authentication.

## Clerk configuration note

The sign-in page now follows the username/password flow. In the Clerk Dashboard, make sure the authentication methods used by the application are enabled, especially username sign-in and password authentication if those are what your users use.

If the Clerk project requires email-code verification or MFA, that verification method must also be enabled in Clerk and the corresponding verification strategy should be added to the sign-in flow.

## Verification

The source files and asset references were checked. A full Next.js production build could not be completed in this packaging environment because the dependency installation was incomplete (`next` was not available after the install attempt). Run `npm install` followed by `npm run build` locally before deployment.
