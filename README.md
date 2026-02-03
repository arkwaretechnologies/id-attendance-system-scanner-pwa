# ID Attendance Scanner PWA

Standalone RFID attendance scanner that works **offline**. Scans are queued locally and synced to Supabase (and SMS via the admin app API) when back online.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (same as admin app)
   - `VITE_ADMIN_APP_URL` (admin app base URL for `/api/sms/attendance` when syncing)
2. `npm install`
3. `npm run dev`
4. `npm run build` for production; deploy the `dist/` output to a stable HTTPS origin.

## Usage

- **Online:** Lookup and record attendance via Supabase; SMS is sent via the admin app API.
- **Offline:** Student list is read from local cache; scans are stored in a queue and synced when the device is back online.

## Link from admin app

Set `NEXT_PUBLIC_SCANNER_PWA_URL` in the admin app to this PWA’s URL (e.g. `https://scanner.yourdomain.com`) so the sidebar “Scanner (PWA)” link opens it.
