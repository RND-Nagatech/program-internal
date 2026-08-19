# Program Internal

Portal internal untuk login terpusat dan launcher aplikasi divisi.

## Struktur

- `new-be`: Express TypeScript API, MongoDB, JWT login, master role/user/menu, dan endpoint launch SSO.
- `new-fe`: React/Vite frontend untuk login, launcher aplikasi, dan admin panel.

## Menjalankan Lokal

Backend:

```bash
cd new-be
cp .env.example .env
npm install
npm run seed
npm run dev
```

Frontend:

```bash
cd new-fe
npm install
npm run dev
```

Default frontend: `http://localhost:5173`
Default backend: `http://localhost:5010`

User seed default:

- Username: `admin@internal.local`
- Password: `admin123456`

Ganti nilai ini lewat `.env` sebelum seed untuk environment selain lokal.

## SSO Finance Subscriber

Portal mengirim JWT ke app finance lewat URL:

```text
{targetUrl}/sso/callback#token={portalJwt}&redirect={defaultPath}
```

Di `finance-subcriber/new-be`, set `PORTAL_JWT_SECRET` sama dengan `JWT_SECRET` portal. Frontend finance sudah memiliki route `/sso/callback` yang menyimpan token ke `secureStorage` dengan key existing `auth_token`.

Dokumentasi standar login/logout SSO untuk aplikasi target baru ada di:

- [`docs/sso-login-logout.md`](docs/sso-login-logout.md)
# program-internal
