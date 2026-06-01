# API Testing with Postman — Complete Guide

**Audience:** Beginners in API testing  
**Prerequisites:** Application running (see [GETTING-STARTED.md](GETTING-STARTED.md))  
**Time Required:** 2-4 hours  
**Goal:** Learn to test REST APIs using Postman

---

## Why Start with Postman?

Postman is the easiest way to start learning API testing because:
- You see results immediately
- No code required to get started
- You can just "click and try"
- The application runs locally, so you can't break anything
- Visual interface makes it easy to understand HTTP requests/responses

---

## What You'll Need

### Download Postman Desktop App
1. Download from: https://www.postman.com/downloads/
2. Version: Free tier is sufficient (no need for Team/Enterprise)
3. Create an account (you can use Google login)

---

## Part 1: Import Starter Collection

### Step 1: Open Postman

Launch the Postman Desktop app you just installed.

---

### Step 2: Import Files

1. Click **Import** in the top-left
2. Select **File** → find and import these 2 files from the project:
   - `postman/cabin-api-learning.postman_collection.json`
   - `postman/cabin-local.postman_environment.json`

You should see:
- Collection: **Cabin API Learning** in the left sidebar
- Environment: **Cabin Local API** available in dropdown

---

### Step 3: Activate Environment

1. In the top-right corner, you'll see a dropdown that says "No Environment"
2. Click it and select **Cabin Local API**

**Why this matters:** The environment contains variables like `baseUrl`, `authToken`, `adminUsername`, etc. that are used across all requests.

---

## Part 2: Your First API Requests

Follow this exact order — each step builds on the previous one.

---

### 1️⃣ Health Check (No Authentication Required)

**Location:** Folder `System` → Request `Health check`

1. Click **Send**
2. Expected result: Status `200 OK`

**Response body:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-01T12:00:00.000Z",
  "database": "connected"
}
```

**What you're learning:**
- How to send a GET request
- How to read JSON response
- What HTTP status codes mean (200 = success)

**Try this:** Click the **Tests** tab to see how automatic assertions work.

---

### 2️⃣ Login (Authentication)

**Location:** Folder `Auth` → Request `Login admin`

1. Click the **Body** tab to see what data you're sending
2. Click **Send**
3. Expected result: Status `200 OK` + JWT token in response

**Response body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "userId": "...",
  "role": "admin",
  "cabinId": "...",
  "isSuperAdmin": false
}
```

**What you're learning:**
- POST requests with JSON body
- How authentication works
- JWT (JSON Web Token) concept

**Magic moment:** Open the **Tests** tab — you'll see JavaScript that automatically saves the token to your environment!

**Verify it worked:**
1. Click on **Cabin Local API** (environment dropdown in top-right)
2. In Quick Look, you should see populated values for:
   - `authToken`
   - `cabinId`
   - `userId`

**This is powerful!** You don't need to copy/paste tokens manually anymore.

---

### 3️⃣ Get My Profile (Authenticated Request)

**Location:** Folder `Auth` → Request `Get my profile`

1. Click the **Headers** tab — notice the `Authorization: Bearer {{authToken}}` header
2. Click **Send**
3. Expected result: Status `200 OK` + your user profile

**Response body:**
```json
{
  "id": "...",
  "username": "admin",
  "email": null,
  "color": "#AB47BC",
  "animalIcon": "fox",
  "role": "admin",
  "isEmailVerified": true
}
```

**What you're learning:**
- Authenticated requests (using the token from login)
- How the backend knows who you are

**Try this:** 
- Delete the `Authorization` header and click Send → you'll get `401 Unauthorized`
- Add it back and Send again → it works!

---

### 4️⃣ Get Current Cabin

**Location:** Folder `Auth` → Request `Get current cabin`

1. Click **Send**
2. Expected result: Status `200 OK` + cabin details

**What you're learning:**
- How tenant scoping works (you're scoped to one cabin)

---

### 5️⃣ Create a Reservation

**Location:** Folder `Reservations` → Request `Create reservation`

1. Click the **Body** tab to see the JSON payload:
   ```json
   {
     "from": "2026-06-12",
     "to": "2026-06-14",
     "purpose": "Vikend na chate",
     "notes": "Vezmeme deskovky",
     "handoverNote": "Drevo je v kulne"
   }
   ```
2. Click **Send**
3. Expected result: Status `201 Created` + new reservation with ID

**What you're learning:**
- POST requests for creating data
- How the backend validates data
- Status code `201` means "created successfully"

**Try this:**
- Change `"from"` to an invalid date like `"invalid"` → you'll get `400 Bad Request` with validation error
- Change it back to a valid date and Send again

---

### 6️⃣ List All Reservations

**Location:** Folder `Reservations` → Request `List reservations`

1. Click **Send**
2. Expected result: Status `200 OK` + array of reservations (including the one you just created)

**What you're learning:**
- GET requests that return arrays
- How to work with collections of data

**Notice:** The reservation you created in step 5 appears in this list!

---

## Part 3: Explore More Endpoints

Now that you understand the basics, explore these folders in the collection:

### Shopping and Inventory
- Create a shopping list
- Add items to the list
- Mark items as purchased
- Split costs between users
- Manage pantry inventory

**Try this flow:**
1. `POST /api/shopping-lists` → Create a list
2. Check the **Tests** tab → it saved `shoppingListId` to environment
3. Other requests can now use `{{shoppingListId}}`

### Channels (Chat)
- List all chat channels
- Create a new channel
- Post messages to a channel

### Gallery
- List folders
- Create a new folder
- Upload photos (this one is tricky — it uses `form-data` instead of JSON!)

**For photo upload:**
1. Click **Body** tab → select `form-data`
2. Add field `folderId` with value `{{folderId}}`
3. Add field `photos` with type `File` → select an image from your computer
4. Click **Send**

### Admin and Logs
- Get system statistics
- View log files
- Search logs by request ID, user, or status code

---

## Part 4: Advanced Techniques

### Using Variables

Variables make your life easier. Look at any request body and you'll see:
- `{{baseUrl}}` — points to http://localhost:3000
- `{{authToken}}` — automatically set after login
- `{{cabinId}}` — automatically set after login

**Try creating your own variable:**
1. Click on **Cabin Local API** environment
2. Add a new variable: `testDate` = `2026-07-01`
3. In a Create Reservation request, use `"from": "{{testDate}}"`

### Pre-request Scripts

Open any request → **Pre-request Script** tab.

This JavaScript runs **before** the request is sent. Useful for:
- Generating random data
- Computing timestamps
- Setting dynamic headers

**Example:**
```javascript
// Generate random email
pm.environment.set("randomEmail", `test${Date.now()}@example.com`);
```

### Tests and Assertions

Open any request → **Tests** tab.

This JavaScript runs **after** the response is received. Useful for:
- Validating response status
- Checking response body
- Saving values to environment

**Example:**
```javascript
// Check status is 200
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

// Check response has expected field
pm.test("Response contains username", function () {
    pm.expect(pm.response.json()).to.have.property("username");
});
```

---

## Part 5: Swagger UI (Alternative Interface)

If Postman feels overwhelming, try Swagger UI instead:

1. Make sure the app is running (`npm run dev`)
2. Open browser: http://localhost:3000/api/docs
3. Click **Authorize** (top-right)
4. Paste your token from Postman environment (`authToken` value)
5. Click **Authorize** → **Close**
6. Now you can try any endpoint with **Try it out**

**Swagger vs Postman:**
- **Swagger:** Quick exploration, see all endpoints at once
- **Postman:** Organized collections, save requests, write tests

Use both! They complement each other.

---

## Part 6: Common Patterns in This API

### Pattern 1: Tenant Scoping
Most endpoints are scoped to your cabin (tenant). The backend reads `cabinId` from your JWT token automatically.

### Pattern 2: Owner-Only Actions
Some endpoints check if you're the owner:
- You can edit/delete your own reservations
- Admin can edit/delete anyone's data
- Guest can only view, not create/delete

**Try this:**
1. Create a reservation as `admin`
2. Try to delete it → works!
3. Login as `guest` (you'll need to create this user first)
4. Try to delete admin's reservation → `403 Forbidden`

### Pattern 3: Validation
All create/update endpoints validate input with Zod schemas.

**Try this:**
- Send invalid data → get `400 Bad Request` with specific error messages
- Error response format:
  ```json
  {
    "message": "Chyba validace",
    "errors": [
      {
        "path": "email",
        "message": "Invalid email format"
      }
    ]
  }
  ```

### Pattern 4: Pagination (Not Yet Implemented)
Currently, all list endpoints return all records. In production, you'd add:
- `?page=1&limit=20`
- Response includes `total`, `page`, `hasMore`

---

## Exercises to Practice

### Exercise 1: Complete Reservation Flow
1. Login as admin
2. Create a reservation for next week
3. List all reservations
4. Update your reservation (extend by 1 day)
5. Delete the reservation

### Exercise 2: Shopping List Workflow
1. Create a shopping list "Letní nákup"
2. Add 3 items to the list
3. Mark 1 item as purchased
4. Add split information (share cost with another user)
5. List all items in the list

### Exercise 3: Multi-User Scenario
1. Create a second user (POST `/api/admin/users`)
2. Login as that user → get their token
3. Create a reservation as the second user
4. Login back as admin
5. View both users' reservations

### Exercise 4: Error Handling
1. Try to login with wrong password → `401`
2. Try to create reservation with past dates → `400`
3. Try to access protected endpoint without token → `401`
4. Try to delete someone else's data as guest → `403`

---

## Next Steps

Once you're comfortable with Postman:

1. **Write test suites:** Create a collection with automatic assertions for all critical flows
2. **Try Newman:** Run your Postman collections from command line
   ```bash
   npm install -g newman
   newman run postman/cabin-api-learning.postman_collection.json -e postman/cabin-local.postman_environment.json
   ```
3. **Move to Playwright:** Learn browser automation → [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)

---

## Reference Documentation

- **API Overview:** [../API-QUICKSTART.md](../API-QUICKSTART.md)
- **OpenAPI Spec:** `src/backend/openapi.ts`
- **Postman Learning:** https://learning.postman.com/
- **HTTP Status Codes:** https://httpstatuses.com/

---

## Troubleshooting

### Request returns 401 Unauthorized
- Check that you're logged in (ran Login request)
- Check that environment has `authToken` populated
- Check that the request has `Authorization: Bearer {{authToken}}` header

### Request returns 403 Forbidden
- You're authenticated but don't have permission
- Check your role (admin vs user vs guest)
- Check if you're trying to modify data you don't own

### Request returns 500 Internal Server Error
- This is a backend bug!
- Check the terminal where `npm run dev` is running
- Look for red error messages
- Copy the error and report it

### Environment variables not working
- Make sure **Cabin Local API** environment is selected (top-right dropdown)
- Click the eye icon next to environment dropdown to see all variables
- If `authToken` is empty, run Login request again

---

**🎉 Congratulations! You now know how to test APIs with Postman. This is a valuable skill for any developer or QA engineer.**
