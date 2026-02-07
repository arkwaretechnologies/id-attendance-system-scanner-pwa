# Saving time_in / time_out in Manila (Philippines) time

The app shows times in Manila time. To have the **database** store Manila time so values match what you expect:

## Use Manila time inside your RPCs (no new parameters)

1. In **Supabase Dashboard** go to **Database → Functions**.
2. Open **record_time_in**. Where it sets the **time_in** column (e.g. in an INSERT), replace `now()` with:
   ```sql
   (now() AT TIME ZONE 'Asia/Manila')
   ```
3. Open **record_time_out**. Where it sets the **time_out** column, use the same expression:
   ```sql
   (now() AT TIME ZONE 'Asia/Manila')
   ```

**Column type:**

- If the column is **TIMESTAMP WITHOUT TIME ZONE**: the expression above stores the clock time in Manila (e.g. 10:30:00). The app will show it correctly.
- If the column is **TIMESTAMP WITH TIME ZONE**: use  
  `((now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')::timestamptz`  
  so the correct instant is stored and the app displays it in Manila.

See **supabase/migrations/use_manila_time_in_rpc.sql** for a short reference.

## Optional: pass timestamp from the app

You can later add optional parameters **time_in_at** and **time_out_at** to the RPCs and use them when setting the columns. The app can then send the exact scan time from the device. Until then, using the expressions above in the RPCs is enough for Manila time.
