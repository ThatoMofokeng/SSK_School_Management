# Rate Limiting Implementation Guide

## ✅ What's Been Done

Rate limiting has been added to prevent abuse of Server Actions. The following actions now have rate limiting:

### Subject Actions (✅ COMPLETED)
- `createSubject` - 5 requests per minute
- `updateSubject` - 10 requests per minute
- `deleteSubject` - 5 requests per minute

## 📋 Pattern to Follow

To add rate limiting to the remaining Server Actions, follow this pattern:

### Before (No Rate Limiting)
```typescript
export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    await requireRole("admin");

    // ... database operation ...

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};
```

### After (With Rate Limiting)
```typescript
export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    const { userId } = await requireRole("admin");  // ← Change 1: Capture userId
    await checkRateLimit(userId, "create-student"); // ← Change 2: Add rate limit check

    // ... database operation ...

    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    // ← Change 3: Handle RateLimitError
    if (err instanceof RateLimitError) {
      return { success: false, error: true, message: err.message };
    }
    logError("Server action failed", err, "actions");
    return { success: false, error: true };
  }
};
```

### Key Changes

1. **Capture `userId`**: Change `await requireRole(...)` to `const { userId } = await requireRole(...)`
2. **Add rate limit check**: Add `await checkRateLimit(userId, "action-name")` right after `requireRole()`
3. **Handle RateLimitError**: Add an `if` check before the generic error handler

## 📝 Actions That Need Rate Limiting

### High Priority (User-Facing Mutations)

#### Class Actions
- [ ] `createClass` → `await checkRateLimit(userId, "create-class")`
- [ ] `updateClass` → `await checkRateLimit(userId, "update-class")`
- [ ] `deleteClass` → `await checkRateLimit(userId, "delete-class")`

#### Teacher Actions
- [ ] `createTeacher` → `await checkRateLimit(userId, "create-teacher")`
- [ ] `updateTeacher` → `await checkRateLimit(userId, "update-teacher")`
- [ ] `deleteTeacher` → `await checkRateLimit(userId, "delete-teacher")`

#### Student Actions
- [ ] `createStudent` → `await checkRateLimit(userId, "create-student")`
- [ ] `updateStudent` → `await checkRateLimit(userId, "update-student")`
- [ ] `deleteStudent` → `await checkRateLimit(userId, "delete-student")`

#### Exam Actions
- [ ] `createExam` → `await checkRateLimit(userId, "create-exam")`
- [ ] `updateExam` → `await checkRateLimit(userId, "update-exam")`
- [ ] `deleteExam` → `await checkRateLimit(userId, "delete-exam")`

### Rate Limit Configurations

The rate limits are defined in `src/lib/ratelimit.ts`:

| Action Type | Limit | Window |
|-------------|-------|--------|
| `create-*` | 5 requests | 1 minute |
| `update-*` | 10 requests | 1 minute |
| `delete-*` | 5 requests | 1 minute |
| Default | 20 requests | 1 minute |

## 🔧 Testing Rate Limiting

### Manual Testing

1. Open your browser's developer console
2. Find the Server Action call in the Network tab
3. Replay it 6+ times rapidly
4. On the 6th request, you should see an error: `"Rate limit exceeded for create-student. Try again in XX seconds."`

### Automated Testing (Recommended)

```typescript
// tests/ratelimit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/ratelimit';

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await resetRateLimit('test-user', 'create-student');
  });

  it('should allow requests within limit', async () => {
    // Should not throw for first 5 requests
    for (let i = 0; i < 5; i++) {
      await expect(
        checkRateLimit('test-user', 'create-student')
      ).resolves.not.toThrow();
    }
  });

  it('should block requests exceeding limit', async () => {
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('test-user', 'create-student');
    }

    // 6th request should throw
    await expect(
      checkRateLimit('test-user', 'create-student')
    ).rejects.toThrow('Rate limit exceeded');
  });
});
```

## 🚀 Production Upgrade

### Current: In-Memory Rate Limiting

**Pros:**
- ✅ No external dependencies
- ✅ Works out of the box
- ✅ Zero cost

**Cons:**
- ⚠️ Resets on server restart
- ⚠️ Doesn't work across multiple containers
- ⚠️ Not suitable for horizontal scaling

### Recommended: Upstash Redis Rate Limiting

For production deployments with multiple server instances, upgrade to Redis:

#### 1. Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

#### 2. Set Up Upstash

1. Sign up at https://upstash.com (free tier: 10,000 commands/day)
2. Create a Redis database
3. Copy the REST URL and Token

#### 3. Add Environment Variables

```bash
# .env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxx
```

#### 4. Replace `src/lib/ratelimit.ts`

See the comments at the bottom of `ratelimit.ts` for the full Upstash implementation.

#### 5. Verify

- Deploy to staging
- Test rate limiting still works
- Check Upstash dashboard for request metrics

## 📊 Monitoring Rate Limits

### View Rate Limit Status

```typescript
import { getRateLimitStatus } from '@/lib/ratelimit';

// In a Server Component or API route
const status = await getRateLimitStatus(userId, 'create-student');
console.log(`Remaining requests: ${status.remaining}/${status.limit}`);
console.log(`Resets at: ${new Date(status.resetTime)}`);
```

### Log Rate Limit Events

Add logging to track when users hit rate limits:

```typescript
// In src/lib/ratelimit.ts, inside checkRateLimit():
if (record.count >= config.maxRequests) {
  const retryAfter = Math.ceil((record.resetTime - now) / 1000);

  // Log the rate limit event
  console.warn({
    event: 'rate_limit_exceeded',
    identifier,
    action,
    retryAfter,
    timestamp: new Date().toISOString(),
  });

  throw new RateLimitError(...);
}
```

## 🔍 Troubleshooting

### Issue: Rate limits reset too often

**Cause:** Server is restarting frequently (in-memory store gets cleared)

**Solution:** Upgrade to Redis/Upstash (persistent storage)

### Issue: Users complain about hitting limits

**Cause:** Limits may be too strict for legitimate use

**Solution:** Adjust limits in `src/lib/ratelimit.ts`:

```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'create': { maxRequests: 10, windowMs: 60 * 1000 }, // Increase from 5 to 10
  // ...
};
```

### Issue: Rate limiting not working

**Checklist:**
- [ ] Did you import `checkRateLimit` in `actions.ts`?
- [ ] Did you capture `userId` from `requireRole()`?
- [ ] Did you add the `if (err instanceof RateLimitError)` handler?
- [ ] Did you update the `CurrentState` type to include `message?: string`?

## ✅ Completion Checklist

- [x] Rate limiting utility created (`src/lib/ratelimit.ts`)
- [x] Subject actions protected (create/update/delete)
- [ ] Class actions protected
- [ ] Teacher actions protected
- [ ] Student actions protected
- [ ] Exam actions protected
- [ ] Tests written for rate limiting
- [ ] Rate limit monitoring added
- [ ] Production upgrade path documented
- [ ] Team trained on rate limit behavior

---

**Next Steps:**
1. Apply rate limiting to remaining actions using the pattern above
2. Write tests for rate limiting behavior
3. Add user-facing error messages in form components
4. Monitor rate limit logs in production
5. Upgrade to Upstash when deploying with multiple containers
