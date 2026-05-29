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

## 2. Configure environment

**Option A — file path (recommended)**

In `/var/www/ubexpress/delivery/.env`:

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
