# Getting Started — First Steps

**Audience:** Complete beginners  
**Time Required:** 15 minutes  
**Goal:** Get the application running and verify everything works

---

## Step 1: Start the Application

Open a terminal in VS Code (keyboard shortcut: `` Ctrl+` ``) and run:

```powershell
npm run dev
```

**What happens:**
- Backend starts at `http://localhost:3000`
- Frontend starts at `http://localhost:5173`
- You'll see green messages confirming both servers are running

**Keep the terminal open!** As long as the application is running, you'll see all logs and any errors here.

---

## Step 2: Open the Application in Browser

In any browser, navigate to:

👉 **http://localhost:5173**

You should see the landing page or login screen.

---

## Step 3: Create a Test Admin Account

**Why you need this:**
- For learning Postman and Playwright, you need a working account
- Pre-filled examples in the documentation use `admin` / `tajneheslo123`
- This account **is not** in the database by default — you must create it

**How to do it:**

Open a **second terminal** in VS Code (click the `+` icon next to the running terminal) and run:

```powershell
npm run create-learning-admin
```

**What happens:**
- Script creates or updates user `admin` with password `tajneheslo123`
- You'll see: `Admin reset successfully!`

**✅ Done!** You now have a functional admin for testing.

---

## Step 4: Verify Login Works

1. In the browser (http://localhost:5173), click **Log In**
2. Enter:
   - Username: `admin`
   - Password: `tajneheslo123`
3. Click **Log In**

**What happens:**
- You should be redirected to the Dashboard
- Your username appears in the top-right corner

**If this works → everything is ready! 🎉**

---

## Step 5: Verify Backend API Works

Open in browser:

👉 **http://localhost:3000/api/health**

You should see something like:

```json
{
  "status": "ok",
  "timestamp": "2026-06-01T10:30:00.000Z",
  "database": "connected"
}
```

**✅ If you see `"status": "ok"`, the backend is working correctly!**

---

## What's Next?

Now that you have the application running, you can start learning:

### 🎯 Learn API Testing with Postman
Continue to: **[POSTMAN-GUIDE.md](POSTMAN-GUIDE.md)**

### 🎯 Learn Browser Testing with Playwright
Continue to: **[PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)**

### 🎯 Manual Testing in Browser
See: **[../SPRINT-0-SMOKE-TEST.md](../SPRINT-0-SMOKE-TEST.md)** for manual test scenarios

---

## Common Issues

### "Application not running" / "Port already in use"
**Solution:**
1. Check if the application is already running in another terminal
2. Close all VS Code terminals
3. Run `npm run dev` again

### "Cannot connect to database"
**Solution:**
1. Check that Docker Desktop is running (if using Docker)
2. Or verify PostgreSQL is running locally
3. Check `.env` file has correct `DATABASE_URL`

### "Admin login fails" / "Invalid credentials"
**Solution:**
- Verify you ran the create-learning-admin script (Step 3)
- Verify username and password are exactly: `admin` / `tajneheslo123` (no spaces)
- Try running the script again

### "Frontend shows blank page"
**Solution:**
1. Verify both servers are running in the terminal (backend and frontend)
2. Verify the URL is `http://localhost:5173` (not 3000)
3. Try hard refresh: `Ctrl+Shift+R`

---

## Need Help?

If something doesn't work:
1. Check the terminal where `npm run dev` is running — error messages often appear there
2. Copy the error message and ask for help
3. Check [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) — it might be a known gap that's not yet implemented

---

**🎉 Congratulations! If you got this far and everything works, you're ready to start learning!**
