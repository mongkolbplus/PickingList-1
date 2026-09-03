# Packing List Mobile (Expo)

แอป Mobile/PDA/Tablet สำหรับจัดสินค้าและบรรจุกล่อง เชื่อม Bplus ERP โดยตรง พร้อม Offline Queue

## รัน development

```bash
# จาก root monorepo
npm run dev:mobile

# หรือจาก apps/mobile
cd apps/mobile
npm run start
```

## Build

```bash
cd apps/mobile
npx eas build --platform android
npx eas build --platform ios
```

## โครงสร้าง

- `app/` — expo-router screens (10 หน้าตาม spec)
- `src/components` — UI ตามธีม `MobileApp/images`
- `src/services/database.ts` — SQLite session + offline queue
- `src/services/offlineQueue.ts` — retry เมื่อ online
- `packages/shared` — business logic ร่วมกับ web

## Offline Queue

เมื่อปิดงาน (`SavePackingScaninfo`) ขณะออฟไลน์ ระบบจะบันทึกลง SQLite และ retry อัตโนมัติเมื่อเชื่อมต่อกลับ
