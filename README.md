# Balaji Foods — Order Desk

Order management for the Balaji Foods exhibition stall.
React + Vite frontend, Node.js + Express REST API, MongoDB Atlas via Mongoose.

## Menu (prices are fixed on the server)

| Item       | Price            |
|------------|------------------|
| Pav Bhaji  | ₹105 per serving (bhaji + 2 pav) |
| Extra Pav  | ₹10 per piece    |
| Mojito     | ₹50 per glass    |

The menu lives in `backend/src/menu.js`. The server ignores any prices or totals sent by the
browser and recalculates every order from this file.

## Prerequisites

- Node.js 18 or newer (`node -v`)
- A MongoDB Atlas cluster (the free M0 tier works)

### MongoDB Atlas setup (about 5 minutes)

1. In Atlas, open **Database Access** and create a database user with a password.
2. Open **Network Access** and add your current IP address. For a stall on changing Wi-Fi or a
   phone hotspot, `0.0.0.0/0` works too, but make sure the user password is strong.
3. Go to **Database → Connect → Drivers** and copy the `mongodb+srv://...` connection string.
   Put your password in it, and add the database name `balaji_foods` before the `?`.

## Install

From the project folder (`Balaji Foods`):

```powershell
npm run setup
Copy-Item backend\.env.example backend\.env
```

Then open `backend\.env` and set `MONGODB_URI` to your Atlas connection string.

## Run at the stall (one server, recommended)

```powershell
npm run build
npm start
```

Open http://localhost:5000. To use it from a phone or tablet on the same Wi-Fi, open
`http://<this-computer's-IP>:5000` (find the IP with `ipconfig`). If Windows Firewall asks, allow
Node.js on private networks.

## Development mode (hot reload)

Use two terminals:

```powershell
npm run dev:api     # API on http://localhost:5000
npm run dev:web     # UI on http://localhost:5173 (proxies /api to the API)
```

## Hosted deployment

- **Backend on Render** (https://balajifoods-cxtl.onrender.com): Root Directory `backend`,
  Build `yarn install; yarn build`, Start `yarn start`. Set `MONGODB_URI` under Environment, and
  allow `0.0.0.0/0` in Atlas Network Access. The backend also serves the UI, so the Render URL
  works on its own.
- **Frontend on Vercel** (https://balajifoods-delta.vercel.app): `vercel.json` forwards `/api/*`
  to the Render backend, so the browser stays on one origin and no CORS setup is needed. If the
  backend URL changes, update the `destination` in both `vercel.json` files.

## REST API

| Method | Path                          | Purpose |
|--------|-------------------------------|---------|
| GET    | `/api/orders?status=all\|pending\|completed` | List orders, newest first |
| GET    | `/api/orders/:id`             | Order details |
| POST   | `/api/orders`                 | Create: `{ customerName?, items: [{ productId, quantity }] }` |
| PUT    | `/api/orders/:id`             | Edit: any of `customerName`, `items`, `status` |
| PATCH  | `/api/orders/:id/complete`    | Mark completed |
| DELETE | `/api/orders/:id`             | Delete |
| GET    | `/api/dashboard`              | Pending/completed counts and today's completed sales (IST) |
| GET    | `/api/menu`                   | Menu and prices |
| GET    | `/api/health`                 | Server and database status |

Product IDs are `pav-bhaji`, `extra-pav` and `mojito`. Quantities must be whole numbers from 1 to 999.

Example:

```powershell
curl.exe -X POST http://localhost:5000/api/orders -H "Content-Type: application/json" -d "{\"customerName\":\"Rahul\",\"items\":[{\"productId\":\"pav-bhaji\",\"quantity\":2}]}"
```

## How it works

- **Order numbers** (#001, #002, …) come from an atomic `$inc` on a `counters` document in
  MongoDB. They are safe with several devices taking orders at once, and a number is never
  reused after a delete.
- **Today's sales** add up orders completed between 00:00 and 24:00 India Standard Time.
- The dashboard refreshes every 15 seconds, so several devices stay in sync.

## Configuration (`backend/.env`)

| Variable      | Meaning |
|---------------|---------|
| `MONGODB_URI` | Atlas connection string (required) |
| `PORT`        | API port, default `5000` |
| `CORS_ORIGIN` | Comma-separated origins allowed in development, default `http://localhost:5173` |

`.env` is listed in `.gitignore`. Never commit it.

## Troubleshooting

- **"Failed to start: … querySrv"** or a timeout: check the internet connection and the Atlas
  Network Access IP list.
- **"bad auth"**: the username or password in `MONGODB_URI` is wrong. URL-encode special
  characters in the password, for example `@` becomes `%40`.
- **The UI says "Cannot reach the server"**: the backend isn't running. Start it with `npm start`.
