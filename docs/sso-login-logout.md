# Standar SSO Login dan Logout Program Internal

Dokumen ini menjadi acuan untuk semua aplikasi internal yang login utamanya lewat `program-internal`.

## Tujuan

User hanya login di Program Internal. Dari LaunchPad, user bisa membuka aplikasi lain tanpa login ulang. Saat user logout dari Program Internal, aplikasi yang pernah dibuka dari LaunchPad juga harus ikut logout dan kembali ke login Program Internal.

Login lokal di aplikasi target boleh tetap ada sebagai fallback admin/development, tetapi flow normal user kantor harus melalui Program Internal.

## Istilah

- **Portal**: aplikasi `program-internal`.
- **Aplikasi target**: aplikasi yang dibuka dari LaunchPad, misalnya `finance-subcriber`, HR, warehouse, dan lainnya.
- **SSO token**: JWT yang diterbitkan oleh Program Internal.
- **Target URL**: domain aplikasi target, misalnya `http://localhost:8080`.
- **Default path**: halaman awal aplikasi target setelah SSO sukses, misalnya `/dashboard` atau `/subscriber`.

## Alur Login

1. User login di Program Internal.
2. Program Internal menyimpan session user dan JWT portal.
3. User membuka aplikasi dari LaunchPad.
4. Portal memanggil endpoint launch:

```text
POST /api/launcher/:menuId/launch
Authorization: Bearer {portalJwt}
```

5. Backend portal memvalidasi permission role user.
6. Kalau diizinkan, backend portal mengembalikan URL SSO:

```text
{targetUrl}/sso/callback#token={portalJwt}&redirect={defaultPath}
```

7. Frontend portal membuka URL tersebut di tab baru.
8. Aplikasi target membaca token dari fragment URL, menyimpan token, lalu redirect ke `redirect`.

## JWT Portal

JWT portal minimal berisi:

```json
{
  "userId": "...",
  "username": "finance@nagatech.id",
  "name": "Finance User",
  "role": "finance",
  "iss": "program-internal",
  "exp": 1234567890
}
```

Aplikasi target harus menerima token dengan secret yang sama:

```env
PORTAL_JWT_SECRET=sama_dengan_portal
```

Jika backend aplikasi target sudah memakai `JWT_SECRET`, boleh samakan `JWT_SECRET` dan `PORTAL_JWT_SECRET`.

## Env Portal

Backend portal:

```env
PORT=5010
MONGO_URI=mongodb://127.0.0.1:27017/program_internal
JWT_SECRET=change_this_to_a_strong_secret
JWT_EXPIRES_IN=8h
```

Frontend portal:

```env
VITE_API_BASE_URL=http://localhost:5010/api
```

Target URL aplikasi sebaiknya disimpan di master menu, bukan hardcode env. Jadi saat menambah HR/warehouse, cukup tambah menu baru dengan `targetUrl` dan `defaultPath`.

## Env Aplikasi Target

Frontend aplikasi target perlu tahu URL Program Internal untuk fallback login setelah SSO logout/expired:

```env
VITE_PROGRAM_INTERNAL_URL=http://localhost:5173
```

Backend aplikasi target:

```env
PORTAL_JWT_SECRET=change_this_to_a_strong_secret
```

## Route Wajib di Aplikasi Target

Setiap aplikasi target yang mendukung SSO wajib menyediakan:

```text
/sso/callback
/sso/logout
```

### `/sso/callback`

Tugas:

1. Ambil `token` dan `redirect` dari URL fragment.
2. Decode payload JWT untuk mengambil `name`, `username`, dan `role`.
3. Simpan token dan user info ke storage aplikasi target.
4. Tandai session berasal dari Program Internal.
5. Redirect ke halaman tujuan.

Contoh storage key:

```text
auth_token={portalJwt}
user_name={name atau username}
user_role={role}
auth_source=program-internal
```

Contoh URL:

```text
http://localhost:8080/sso/callback#token=xxx&redirect=/dashboard
```

Setelah sukses:

```text
http://localhost:8080/dashboard
```

### `/sso/logout`

Tugas:

1. Hapus `auth_token`, `user_name`, dan `user_role`.
2. Pertahankan atau set ulang tanda `auth_source=program-internal` sebelum redirect, agar fallback login tetap ke portal.
3. Redirect ke login Program Internal.

Contoh:

```text
window.location.replace(`${VITE_PROGRAM_INTERNAL_URL}/login`)
```

Jangan redirect ke `/login` aplikasi target untuk session SSO.

## Logout Terpusat

Portal menyimpan daftar aplikasi yang pernah dibuka dari LaunchPad.

Saat user logout dari Program Internal:

1. Portal membuka endpoint logout tiap aplikasi:

```text
{targetUrl}/sso/logout
```

2. Portal menghapus session sendiri.
3. Portal redirect ke `/login`.
4. Aplikasi target membersihkan session dan redirect ke login Program Internal.

## Fallback Saat Token Expired

Aplikasi target harus membedakan sumber login:

- Jika `auth_source=program-internal`, fallback ke:

```text
{VITE_PROGRAM_INTERNAL_URL}/login
```

- Jika bukan SSO, fallback boleh ke:

```text
/login
```

Ini perlu diterapkan di:

- Protected route/auth guard.
- Axios/fetch interceptor saat mendapat HTTP `401`.
- Listener storage antar tab, jika aplikasi bisa terbuka di banyak tab.

## Permission

Ada dua lapis permission:

1. **Portal permission**  
   Mengatur menu aplikasi boleh dibuka role apa saja.

2. **Permission internal aplikasi target**  
   Mengatur fitur detail di dalam aplikasi target.

LaunchPad boleh menampilkan semua menu aktif sebagai katalog. Tetapi endpoint launch portal tetap wajib menolak role yang tidak diizinkan:

```text
403 Role Anda tidak memiliki akses ke menu ini.
```

UI boleh menampilkan tombol disabled seperti `Tidak Ada Akses`, tetapi keamanan utama tetap harus di backend portal.

## Checklist Aplikasi Target Baru

Saat menambah aplikasi baru, lakukan checklist ini:

- Tambahkan menu di Program Internal:
  - `name`
  - `division`
  - `targetUrl`
  - `defaultPath`
  - `allowedRoles`
  - `isActive`
- Backend aplikasi target menerima JWT portal dengan `PORTAL_JWT_SECRET`.
- Frontend aplikasi target punya env `VITE_PROGRAM_INTERNAL_URL`.
- Frontend aplikasi target punya route `/sso/callback`.
- Frontend aplikasi target punya route `/sso/logout`.
- Storage session menyimpan `auth_source=program-internal`.
- Logout lokal aplikasi target disembunyikan untuk session SSO.
- Auth guard mengarah ke login Program Internal untuk session SSO.
- Interceptor `401` mengarah ke login Program Internal untuk session SSO.
- Jika logout portal dipakai, aplikasi target ikut clear session.
- Login lokal tetap hanya untuk fallback admin/development.

## Contoh Implementasi Ringkas Frontend Target

```ts
const PROGRAM_INTERNAL_URL = import.meta.env.VITE_PROGRAM_INTERNAL_URL || "http://localhost:5173";

function isProgramInternalSession() {
  return secureStorage.getItem("auth_source") === "program-internal";
}

function getLoginFallbackUrl() {
  return isProgramInternalSession() ? `${PROGRAM_INTERNAL_URL}/login` : "/login";
}
```

Callback:

```ts
const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const token = params.get("token");
const redirect = params.get("redirect") || "/";

secureStorage.setItem("auth_token", token);
secureStorage.setItem("user_name", payload.name || payload.username);
secureStorage.setItem("user_role", payload.role);
secureStorage.setItem("auth_source", "program-internal");

window.location.replace(redirect);
```

Logout:

```ts
secureStorage.removeItem("auth_token");
secureStorage.removeItem("user_name");
secureStorage.removeItem("user_role");
secureStorage.setItem("auth_source", "program-internal");

window.location.replace(`${PROGRAM_INTERNAL_URL}/login`);
```

Interceptor:

```ts
if (response.status === 401) {
  const fallbackUrl = getLoginFallbackUrl();
  secureStorage.removeItem("auth_token");
  secureStorage.removeItem("user_name");
  secureStorage.removeItem("user_role");
  window.location.href = fallbackUrl;
}
```

## Catatan Penting

- Jangan kirim token SSO lewat query string biasa. Gunakan fragment URL `#token=...` agar token tidak ikut terkirim ke server melalui HTTP request.
- Jangan hanya mengandalkan UI disabled untuk permission. Backend portal harus tetap validasi role.
- Untuk production, gunakan HTTPS dan JWT secret yang kuat.
- Untuk domain berbeda, pastikan CORS dan redirect URL sudah sesuai.
