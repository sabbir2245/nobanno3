# Frontend Changes

## 1. Product Detail Screen (`app/product/[id].tsx`)
- Default quantity changed from `10` to `0`
- Replaced `+`/`-` stepper buttons with a `TextInput` (number-pad keyboard)
- User types quantity directly; value is capped at farmer's available stock (`maxQty`)
- Cost section only shown when quantity > 0
- Validation: alert if trying to add 0 or negative quantity to cart
- Removed "Min. Order" stat box

## 2. Farmer Tab Layout (`app/(farmer)/_layout.tsx`)
- `edit-post/[id]` screen added with `href: null` to hide it from the tab bar (accessible only via `router.push`)

## 3. Farmer Dashboard (`app/(farmer)/dashboard.tsx`)
- Removed orders section entirely (no order cards, no wallet strip)
- Only shows "My Posts" with custom inline post cards
- Each post card has an **Edit** button with confirmation popup ("Are you sure you want to edit?")
- Each post card has a **Delete** button with confirmation popup ("Are you sure you want to delete?")
- Profile avatar shows uploaded profile picture if set (falls back to initial letter)
- Added "Create New Post" button at the top of the posts section

## 3. Edit Profile Screen (`app/auth/update-profile.tsx`)
- Added profile picture picker at the top of the form
- Uses `expo-image-picker` to select from gallery (square crop, `aspect: [1,1]`)
- Profile picture is saved via `api.updateProfileInfo` with `profile_picture` field
- Works for both farmer and customer accounts

## 4. Profile Picture Display
- **Customer account** (`app/(customer)/account.tsx`): shows profile picture in avatar
- **Farmer account** (`app/(farmer)/account.tsx`): shows profile picture in avatar
- **Farmer dashboard** (`app/(farmer)/dashboard.tsx`): shows profile picture in avatar
- All fall back to initial-letter avatar when no picture is set

## 5. Login Screen (`app/auth/login.tsx`)
- Removed language toggle button (EN/BN)
- Moved password eye icon upward (`bottom: 14` → `bottom: 28`)

## 6. Review Form Modal (`components/ReviewFormModal.tsx`)
- Image picker functionality commented out (state, functions, UI section)
- Review submission now calls `api.createReview` instead of `api.createReviewWithImages`

## 7. API Service (`services/api.ts`)
- Added `deletePost` method
- Added `profile_picture` field to `User` interface
- Added `profile_picture` support in `updateProfileInfo`

## 8. Global Styles (`styles/global.ts`)
- Added `avatarImage` style for profile picture display in customer account

## 9. User Interface (`services/api.ts`)
- Extended `User` type with optional `profile_picture: string | null`
