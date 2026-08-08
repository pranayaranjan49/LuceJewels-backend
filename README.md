# Royal Jewels — Backend API

MERN backend for a jewelry e-commerce site. Covers auth (email/phone OTP), product
catalog, categories, orders (transaction-safe stock deduction), user management,
and admin marketing campaigns (bulk email/SMS).

---

## 1. Setup

```bash
cd jewelry-backend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `MONGO_URI` | MongoDB Atlas → Database → Connect → Drivers |
| `JWT_SECRET` | any long random string (`openssl rand -hex 32`) |
| `SMTP_USER` / `SMTP_PASS` | Gmail → enable 2FA → create an **App Password** |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | **Optional.** Twilio Console dashboard. Leave blank to disable phone login — email login and everything else still works |
| `TWILIO_VERIFY_SERVICE_SID` | **Optional.** Twilio Console → Verify → Services → create a service |
| `CLOUDINARY_*` | Cloudinary dashboard home page |

Run it:
```bash
npm run dev        # nodemon, auto-restarts on changes
npm run seed        # creates admin user + 6 categories + 6 sample products
```

Server starts at `http://localhost:5000`. Health check: `GET /api/health`.

> **Note on Twilio:** it's fully optional. `src/utils/sendSms.js` only initializes
> the Twilio client the moment a phone-OTP or SMS-campaign request is made — not
> at server startup — so missing/blank Twilio env vars will never crash the app.
> A user hitting phone login without it configured gets a clean `503` error
> ("Phone/SMS is not configured on this server. Use email login instead."), and
> SMS campaign sends are skipped without failing the whole broadcast. Note that
> registration (even via email) still collects a phone number on the User model —
> that's just stored as contact info for shipping, it is never SMS-verified
> unless you use the phone-OTP flow.

> **Note on transactions:** `createOrder` uses a MongoDB session/transaction, which
> requires a replica set. Atlas clusters (even the free M0) are replica sets by
> default, so this works out of the box — a plain local `mongod` standalone
> instance will NOT support it. Use Atlas, or run `mongod --replSet rs0` locally.

---

## 2. Project Structure
```
jewelry-backend/
├── server.js                 # app entry, middleware, route mounting
├── .env.example
├── src/
│   ├── config/                # db.js, cloudinary.js
│   ├── models/                # User, Otp, Category, Product, Order, Campaign
│   ├── middleware/            # auth (JWT), errorHandler, upload (multer)
│   ├── controllers/           # business logic per resource
│   ├── routes/                # express routers
│   ├── utils/                 # sendEmail, sendSms, generateToken, apiFeatures
│   └── seed/seed.js           # demo data
```

---

## 3. API Reference & How to Test

Base URL: `http://localhost:5000/api`
All admin routes need header: `Authorization: Bearer <token>` from a user with `role: admin`.

### Auth

**Register/Login by email (OTP flow)**
```bash
# Step 1: request OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","email":"you@example.com"}'
# -> check your inbox for the 6-digit code

# Step 2: verify (new user needs name + phone; existing user just needs code)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","email":"you@example.com","code":"123456","name":"Test User","phone":"+919876543210"}'
# -> returns { token, user }  — save the token
```

**Register/Login by phone (Twilio Verify)**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"channel":"phone","phone":"+919876543210"}'

curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"channel":"phone","phone":"+919876543210","code":"123456","name":"Test User","email":"you@example.com"}'
```

**Get profile**
```bash
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

To test as **admin** quickly without SMS/email setup: run `npm run seed`, then in
MongoDB Atlas manually note the admin's `_id`, and mint yourself a token by
temporarily logging the JWT in `authController.js`, OR simplest — just flip
your own seeded/registered user's `role` to `"admin"` directly in Atlas after
your first OTP login, then log in again to get a fresh token with `role: admin`.

### Categories
```bash
curl http://localhost:5000/api/categories                       # public list

curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "name=Rings" -F "description=Fine ring collection" -F "image=@./ring-banner.jpg"
```

### Products
```bash
# Public browse — filter/search/sort/paginate
curl "http://localhost:5000/api/products?category=<categoryId>&sort=-price&page=1&limit=12"
curl "http://localhost:5000/api/products?search=gold+ring"
curl "http://localhost:5000/api/products?price[gte]=10000&price[lte]=50000"

curl http://localhost:5000/api/products/<productId>              # single product

# Admin create (multipart, up to 5 images)
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "name=Gold Solitaire Ring" -F "category=<categoryId>" \
  -F "description=Handcrafted 22K gold ring" -F "price=45999" -F "stock=12" \
  -F "material=Gold" -F "purity=22K" -F "weight=4.2" \
  -F "images=@./img1.jpg" -F "images=@./img2.jpg"

# Admin quick stock/price edit
curl -X PATCH http://localhost:5000/api/products/<productId>/stock \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"stock":25,"discountPrice":39999}'

curl http://localhost:5000/api/products/low-stock?threshold=5 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

curl -X DELETE http://localhost:5000/api/products/<productId> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Orders
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <USER_TOKEN>" -H "Content-Type: application/json" \
  -d '{
    "items":[{"product":"<productId>","quantity":1}],
    "shippingAddress":{"line1":"123 MG Road","city":"Bhubaneswar","state":"Odisha","pincode":"751001","country":"India","phone":"+919876543210"}
  }'

curl http://localhost:5000/api/orders/my -H "Authorization: Bearer <USER_TOKEN>"

curl http://localhost:5000/api/orders -H "Authorization: Bearer <ADMIN_TOKEN>"

curl -X PATCH http://localhost:5000/api/orders/<orderId>/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'
```

### Users (admin panel)
```bash
curl "http://localhost:5000/api/users?search=john&page=1" -H "Authorization: Bearer <ADMIN_TOKEN>"
curl http://localhost:5000/api/users/<userId> -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Campaigns (bulk offer/announcement broadcast)
```bash
curl -X POST http://localhost:5000/api/campaigns/send \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"title":"Diwali Sale - 20% Off!","message":"Shop our gold collection this festive season.","channel":"email"}'

curl http://localhost:5000/api/campaigns -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Testing tip:** import these curl commands into Postman/Insomnia as a collection,
or use the free **Thunder Client** VS Code extension for a UI instead of raw curl.

---

## 4. Demo Data

`npm run seed` creates:
- 1 admin user (`ADMIN_EMAIL` from `.env`, role `admin`, pre-verified)
- 6 categories: Rings, Necklaces, Earrings, Bangles, Bracelets, Pendants
- 6 sample products spread across those categories with realistic price/stock/material/purity/gemstone fields, ready to show a client immediately without manual data entry

Re-running `npm run seed` is safe — it skips anything that already exists (checked by slug/email).

---

## 5. Deployment (for tomorrow's live link)

1. Push this repo to GitHub
2. **Render** → New Web Service → connect repo → Build: `npm install` → Start: `npm start`
3. Add all `.env` values as environment variables in Render's dashboard
4. Set `CLIENT_URL` to your deployed frontend's Vercel URL (comma-separate if multiple)
5. Health check `https://your-api.onrender.com/api/health` should return `{success:true}`

Render free tier cold-starts after inactivity — for a client demo, hit the health
endpoint ~5 min before your presentation to warm it up.
