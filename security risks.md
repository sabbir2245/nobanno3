# Security Risks

## Backend (Django)

### Critical / High

#### 1. Hardcoded SECRET_KEY
- **File:** `backend/nobanno/settings.py:18`
- **Risk:** Secret key is in plaintext in version-controlled source. Anyone with this key can forge session cookies, generate valid password reset tokens, and decrypt signed data.

#### 2. DEBUG = True
- **File:** `backend/nobanno/settings.py:20`
- **Risk:** Displays full stack traces, local variables, and environment config on errors. Leaks internal state and source snippets.

#### 3. CORS_ALLOW_ALL_ORIGINS + SessionAuthentication
- **File:** `backend/nobanno/settings.py:140-149`
- **Risk:** If an authenticated admin visits a malicious site in a browser, that site can make credentialed API calls. Session cookies are sent cross-origin.

#### 4. ALLOWED_HOSTS = `'*'`
- **File:** `backend/nobanno/settings.py:23`
- **Risk:** Host header injection vulnerability when DEBUG=False. Enables cache poisoning, password reset poisoning.

#### 5. Plaintext database & email credentials
- **File:** `backend/.env:1-5, 19-20`
- **Risk:** DB password is `pass` (dictionary-level weak). Gmail SMTP app password is in plaintext on disk.

#### 6. No rate limiting on auth endpoints
- **Files:** `CustomLoginView`, `RegisterView`, `ForgotPasswordView`, `ResetPasswordView`
- **Risk:** All auth endpoints are wide open to brute-force. Login credentials can be sprayed. OTP (6-digit, 1M combos) can be brute-forced with no lockout.

#### 7. Any authenticated user can DELETE any post
- **File:** `backend/api/update.py:44-57`
- **Risk:** `perform_destroy()` is not overridden — no ownership check. Any customer, deliveryman, or another farmer can DELETE any post at `DELETE /posts/<pk>/update/`.

#### 8. Any farmer can ship any order
- **File:** `backend/api/views.py:330-338`
- **Risk:** `ship()` uses raw `Order.objects.get()` instead of `self.get_object()`, bypasses queryset filtering. `check_object_permissions()` only checks role, not ownership. No `transaction.atomic()` or `select_for_update()`.

#### 9. OTP brute-force on password reset
- **File:** `backend/api/forget.py:145-183`
- **Risk:** 6-digit numeric OTP with no rate limiting, exponential backoff, account lockout, or CAPTCHA. Can be brute-forced at high velocity.

### Medium

#### 10. Customer can self-complete orders
- **File:** `backend/api/views.py:420-442`
- **Risk:** Customer can mark their own order as completed from `pending`, `shipped`, `assigned`, or `out_for_delivery` — immediately releases farmer payout.

#### 11. Race condition on deliveryman assignment
- **File:** `backend/api/views.py:340-353`
- **Risk:** Two deliverymen can simultaneously claim the same order. No `select_for_update()` or unique constraint preventing double-assignment.

#### 12. Account enumeration via forgot-password
- **File:** `backend/api/forget.py:33-42`
- **Risk:** "No user found with this email" vs "OTP has been sent" reveals whether an email is registered.

#### 13. No HTTPS enforcement
- **File:** `backend/nobanno/settings.py`
- **Risk:** Missing `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`. All traffic is HTTP.

#### 14. OrderSerializer exposes PII
- **File:** `backend/api/serializers.py:266`
- **Risk:** `fields = '__all__'` exposes `delivery_address` (customer PII) to farmers who shouldn't see it.

#### 15. PostSerializer exposes precise geo-coordinates
- **File:** `backend/api/serializers.py:126`
- **Risk:** Farmer pickup location (`latitude`/`longitude`) is exposed to all users.

#### 16. Review duplicate-check race condition
- **File:** `backend/api/views.py:484-493`
- **Risk:** Two simultaneous review requests from the same customer for the same post can both pass the duplicate check. DB `unique_together` catches it but returns a 500.

#### 17. TOCTOU in Order cancel()
- **File:** `backend/api/views.py:444-467`
- **Risk:** Status check (`pending`) reads unlocked `order` before `select_for_update()`. An order that was just shipped could be cancelled.

### Low

#### 18. Debug print() statements leak data
- **Files:** `backend/api/views.py:482-507`, `backend/api/serializers.py:350`
- **Risk:** Python `print()` writes request POST data, user IDs, filenames to stdout/stderr.

#### 19. User balance exposed in serializers
- **File:** `backend/api/serializers.py:22-29`
- **Risk:** Balance is read-only but returned in every user serialization.

#### 20. SMTP error details leaked to client
- **File:** `backend/api/forget.py:132-135`
- **Risk:** Raw SMTP exception message returned to client (server hostname, connection errors).

#### 21. Reviews survive order cancellation
- **File:** `backend/api/serializers.py:376-385`
- **Risk:** If a completed order is later cancelled, the review remains visible. No cascade or invalidation logic.

---

## Frontend (React Native)

### High

#### 22. All API traffic over HTTP
- **File:** `frontend/constants/api.ts:11`
- **Risk:** Login passwords, auth tokens, PII, order data — all in cleartext. Trivial MITM on any shared network.

#### 23. Auth token stored in plaintext AsyncStorage
- **File:** `frontend/contexts/AuthContext.tsx:62-65, 88-92`
- **Risk:** `@react-native-async-storage/async-storage` is unencrypted. Rooted/jailbroken device or malicious app can exfiltrate token and user data.
- **Fix:** Use `expo-secure-store` (iOS Keychain / Android Keystore).

#### 24. Verbose logging leaks tokens and PII
- **Files:** `frontend/services/api.ts`, `frontend/contexts/AuthContext.tsx`, `frontend/app/auth/login.tsx`
- **Risk:** `console.log` outputs passwords, auth tokens (first 12 chars), full user objects, API error stacks. Visible in `adb logcat` from any app on the device.

#### 25. Missing ATS config (iOS blocks HTTP)
- **File:** `frontend/app.json:16-19`
- **Risk:** No `NSAppTransportSecurity` in `infoPlist`. iOS blocks all HTTP connections in release builds — app will silently fail.

### Medium

#### 26. Hardcoded internal IP address
- **File:** `frontend/constants/api.ts:9`
- **Risk:** RFC 1918 IP (`10.114.87.226`) baked into source. Leaks network topology. Commented-out IPs from previous environments are also exposed.

#### 27. No SSL certificate pinning
- **File:** `frontend/services/api.ts:129, 261, 342, 427`
- **Risk:** Standard `fetch()` with no certificate pinning. Any valid cert (or corporate proxy CA) is accepted.

#### 28. Token not invalidated on logout
- **File:** `frontend/contexts/AuthContext.tsx:129-133`
- **Risk:** No server-side logout endpoint. Token remains valid forever after client-side removal.

### Low

#### 29. Custom URL scheme without validation
- **File:** `frontend/app.json:9`
- **Risk:** `nobanno://` scheme registered. Any app can trigger deep links; no origin validation.

#### 30. No runtime validation of API responses
- **File:** `frontend/services/api.ts:161`
- **Risk:** `as T` cast performs no runtime validation. Compromised backend or type mismatch leads to trust of unvalidated data.

#### 31. No dependency vulnerability scanning
- **File:** `frontend/package.json`
- **Risk:** No `npm audit` script, no security tooling. CVEs in 30+ dependencies go undetected.
