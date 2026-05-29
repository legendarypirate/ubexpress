# Firebase Admin setup (server push)

Flutter app uses Firebase project **`express-dde3f`**. The API must use a **service account** from the **same** project.

## 1. Download service account JSON

1. Open https://console.firebase.google.com/project/express-dde3f/settings/serviceaccounts/adminsdk
2. Click **Generate new private key** → download JSON.
3. On the server, save as (example):

   `/var/www/ubexpress/delivery/firebase-service-account.json`

4. Restrict permissions:

   ```bash
   chmod 600 /var/www/ubexpress/delivery/firebase-service-account.json
   ```

   Do **not** commit this file to git (already in `.gitignore` if listed).

## 2. Place the JSON on the server

**Easiest:** copy the downloaded key to:

```text
/var/www/ubexpress/delivery/firebase-service-account.json
```

No env var required — the API auto-loads this file after deploy/restart.

**Optional — explicit path in `.env`:**

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Option B — PM2 `ecosystem.config.cjs`**

```js
env: {
  FIREBASE_SERVICE_ACCOUNT_PATH: "/var/www/ubexpress/delivery/firebase-service-account.json",
}
```

**Option C — JSON in env (no file)**

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"express-dde3f",...}
```

Must be valid one-line JSON (escape quotes if needed).

## 3. Restart API

```bash
cd /var/www/ubexpress/delivery
pm2 restart ubexpress-api
pm2 logs ubexpress-api --lines 20
```

You should see:

```text
[FCM] Firebase Admin ready.
```

If you see `NOT configured`, the env var is missing or the file path is wrong.

## 4. Test in Postman

**POST** `https://beedeliv.mn/api/push/send`

```json
{
  "title": "Тест",
  "body": "Hello",
  "user_ids": [YOUR_DRIVER_ID]
}
```

Expected: `"sent": 1`

---

## iOS: `messaging/third-party-auth-error`

Your APNs key type is correct (APNs enabled). If send still shows `sent=0 failed=1`:

### A. Firebase Console (APNs)

1. https://console.firebase.google.com/project/express-dde3f/settings/cloudmessaging
2. App **`com.ub.express`**
3. Upload your APNs `.p8` (e.g. **`AuthKey_CW3JG6DMR4.p8`**) to **both**:
   - Development APNs auth key
   - Production APNs auth key
4. **Key ID** = the part in the filename (e.g. `CW3JG6DMR4` for `AuthKey_CW3JG6DMR4.p8`) | **Team ID**: `B657WPQ8S9`
5. Remove any old APNs key (e.g. `S28R5547ZZ`) if you created a new one

### B. Google Cloud (same project as Firebase)

1. https://console.cloud.google.com/apis/library?project=express-dde3f
2. Enable **Firebase Cloud Messaging API**
3. (Optional) Enable **Cloud Messaging** legacy API

### C. Service account must be from `express-dde3f`

```bash
grep project_id /var/www/ubexpress/delivery/firebase-service-account.json
# must show: "project_id": "express-dde3f"
```

If wrong, download a **new** key from:
https://console.firebase.google.com/project/express-dde3f/settings/serviceaccounts/adminsdk

Then:

```bash
pm2 restart nextjs-app --update-env
curl -s https://beedeliv.mn/api/push/status
```

### D. Diagnose on server

```bash
cd /var/www/ubexpress/delivery
node scripts/diagnose-fcm.js 52
```

### E. Fresh iOS token

On iPhone: log out → log in again (updates `fcm_token` in DB), then Postman test again.
