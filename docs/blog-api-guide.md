# 📘 NestJS Master Guide: From Zero to Backend Developer
*คู่มือเรียนรู้พื้นฐาน Backend Development ครบวงจรด้วย NestJS, PostgreSQL & Prisma*

> 🗺️ **ต้องการลำดับการเริ่มอ่านและไฟล์ที่ต้องสำรวจทีละสเต็ป?** เข้าไปดู [Roadmap การเรียนรู้ (LEARNING_ROADMAP.md)](./LEARNING_ROADMAP.md)

---

## 🎯 สารบัญ (Table of Contents)
1. [ภาพรวมสถาปัตยกรรม NestJS (NestJS Architecture Overview)](#1-ภาพรวมสถาปัตยกรรม-nestjs)
2. [การออกแบบฐานข้อมูลด้วย Prisma ORM (Database Design & Relations)](#2-การออกแบบฐานข้อมูลด้วย-prisma-orm)
3. [DTO และระบบการตรวจสอบความถูกต้อง (DTOs & Validation)](#3-dto-และระบบการตรวจสอบความถูกต้อง)
4. [ระบบดักจับ Error และ Exception Filters (Error Handling)](#4-ระบบดักจับ-error-และ-exception-filters)
5. [API Versioning และ Routing Precedence (v1 vs v2)](#5-api-versioning-และ-routing-precedence)
6. [การตั้งค่าและการรันระบบ (Setup & Running Guide)](#6-การตั้งค่าและการรันระบบ)
7. [การทำ Unit Testing ด้วย Vitest และ Mocking (Testing & Quality)](#7-การทำ-unit-testing-ด้วย-vitest-และ-mocking)
8. [ระบบยืนยันตัวตนและการจำกัดสิทธิ์ (Auth & RBAC)](#8-ระบบยืนยันตัวตนและการจำกัดสิทธิ์-auth--rbac)
9. [ระบบแคชและ Invalidation ด้วย Redis (In-Memory Caching)](#9-ระบบแคชและ-invalidation-ด้วย-redis-in-memory-caching)

---

## 1. ภาพรวมสถาปัตยกรรม NestJS

NestJS ใช้โครงสร้างแบบ **Three-Tier Architecture** ตามหลัก **Separation of Concerns (SoC)**:

```mermaid
flowchart TD
    subgraph Presentation ["1. Presentation Layer (การนำเสนอ & รับส่งข้อมูล)"]
        Controller["Controllers\n(users.controller.ts, posts.controller.ts)"]
        DTO["DTOs\n(create-post.dto.ts, etc.)"]
        Validation["ValidationPipe\n(whitelist, transform)"]
    end

    subgraph Business ["2. Business Logic Layer (ชั้นตรรกะทางธุรกิจ)"]
        Service["Services\n(posts.service.ts, users.service.ts)"]
        Rules["Business Rules\n(Check duplicate email, verify author & category)"]
    end

    subgraph Data ["3. Data Access Layer (ชั้นจัดการฐานข้อมูล)"]
        PrismaSvc["PrismaService\n(PrismaClient wrapper)"]
        DB[(PostgreSQL 16)]
    end

    Controller --> Validation
    Validation --> DTO
    Controller --> Service
    Service --> Rules
    Service --> PrismaSvc
    PrismaSvc --> DB
```

### 💡 Core Backend Principles:
| Concept | หน้าที่ใน NestJS | ตัวอย่างในโค้ด |
|---|---|---|
| **Controller** | กำหนด HTTP Methods (`GET`, `POST`, `PATCH`, `DELETE`) และจับคู่กับ URL path | `posts.controller.ts` |
| **Service** | ประมวลผลตรรกะ, คำนวณข้อมูล, ติดต่อฐานข้อมูล | `posts.service.ts` |
| **Module** | รวมกลุ่ม Component ที่เกี่ยวข้องกัน และกำหนดสิ่งที่เปิดให้คนอื่นใช้ (`exports`) | `posts.module.ts` |
| **Dependency Injection** | ส่ง Service เข้าไปใน Constructor อัตโนมัติ โดยไม่ต้อง `new` เอง | `constructor(private readonly prisma: PrismaService) {}` |

---

## 2. การออกแบบฐานข้อมูลด้วย Prisma ORM

ไฟล์กำหนด Schema อยู่ที่: `prisma/schema.prisma`

```mermaid
erDiagram
    users ||--o{ posts : "author (Cascade Delete)"
    categories ||--o{ posts : "category (Restrict Delete)"

    users {
        int id PK
        string email UK "ห้ามซ้ำ"
        string password "เข้ารหัส"
        string name "ชื่อผู้ใช้"
        datetime createdAt
        datetime updatedAt
    }

    categories {
        int id PK
        string name UK "ชื่อหมวดหมู่ห้ามซ้ำ"
        datetime createdAt
        datetime updatedAt
    }

    posts {
        int id PK
        string title "หัวข้อ"
        string content "เนื้อหา"
        boolean isPublished "สถานะเผยแพร่"
        int authorId FK "ชี้ไปที่ users.id"
        int categoryId FK "ชี้ไปที่ categories.id"
        datetime createdAt
        datetime updatedAt
    }
```

### 🔑 Referential Integrity Actions (เงื่อนไขความสัมพันธ์):
1. **`onDelete: Cascade` (User -> Post)**
   - หากลบ User เจ้าของบัญชี ระบบจะลบบทความทั้งหมดของเขาไปด้วยอัตโนมัติ
   - ป้องกันไม่ให้มีบทความที่ `authorId` ชี้ไปหา User ที่ไม่มีตัวตน
2. **`onDelete: Restrict` (Category -> Post)**
   - หาก Category ยังมี Post อ้างอิงอยู่ Database จะ**ปฏิเสธคำสั่งลบ**
   - ช่วยรักษาข้อมูลบทความ ไม่ให้หมวดหมู่ของบทความสูญหาย

---

## 3. DTO และระบบการตรวจสอบความถูกต้อง

**DTO (Data Transfer Object)** คือคลาสที่ใช้ระบุหน้าตาและข้อกำหนดของข้อมูลที่ Client ส่งมา

### ตัวอย่าง: `CreatePostDto` (`src/posts/dto/create-post.dto.ts`)
```typescript
export class CreatePostDto {
  @ApiProperty({ example: 'NestJS Guide', description: 'Title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 1, description: 'Author ID' })
  @IsInt()
  @Type(() => Number)
  authorId: number;
}
```

### 🛡️ ความปลอดภัยที่ได้จาก `ValidationPipe` ใน `src/main.ts`:
- `whitelist: true`: ตัดฟิลด์แปลกปลอมที่ Client แอบส่งมาทิ้ง ป้องกันการแฮกแก้ไขฟิลด์สำคัญ (Mass Assignment)
- `forbidNonWhitelisted: true`: แจ้ง Error 400 ทันทีหากส่งฟิลด์ที่ไม่ตรงกับ DTO
- `transform: true`: แปลงชนิดข้อมูลจาก JSON payload ให้เป็น Object Instance ของ DTO ตาม Type จริง

---

## 4. ระบบดักจับ Error และ Exception Filters

ไฟล์ตัวกรองอยู่ที่:
- `src/common/filters/http-exception.filter.ts`
- `src/common/filters/all-exceptions.filter.ts`

### มาตรฐานโครงสร้าง Error ตอบกลับ:
```json
{
  "statusCode": 400,
  "timestamp": "2026-09-29T12:00:00.000Z",
  "path": "/api/v1/posts",
  "message": [
    "title must be longer than or equal to 3 characters",
    "authorId must be an integer number"
  ]
}
```

> [!IMPORTANT]
> **ลำดับการลงทะเบียน Filter ใน main.ts มีความสำคัญมาก**:
> `app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());`
> ต้องวาง `AllExceptionsFilter` (จับ 500) ไว้ก่อน `HttpExceptionFilter` (จับ HTTP ปกติ) เพื่อให้ลำดับการประมวลผลดักจับ Error เฉพาะเจาะจงก่อน Error กว้างๆ

---

## 5. API Versioning และ Routing Precedence

ใน `src/main.ts` เปิดใช้งาน URI Versioning:
```typescript
app.setGlobalPrefix('api');
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

### การเปรียบเทียบ v1 vs v2:
| มิติ | Version 1 (`/api/v1`) | Version 2 (`/api/v2`) |
|---|---|---|
| **การดึงบทความทั้งหมด** | ส่งกลับเป็น Array ทั้งก้อน (Raw Flat Array) | แบ่งหน้าด้วย **Pagination** (`page`, `limit`) |
| **การค้นหา** | ไม่มีระบบค้นหา | รองรับ Search Keyword และ Filter ตาม Category |
| **ระบบแคช (Redis)** | ไม่มีแคช | มี In-Memory Cache (Cache-Aside TTL 60s) |
| **ข้อมูลสถิติ** | ไม่มี | มี Endpoint `/api/v2/posts/stats` รวมสถิติทั้งระบบ |
| **ข้อมูลเสริม** | ข้อมูลบทความพื้นฐาน | เพิ่มการคำนวณ **Reading Time** และ **Related Posts** |

### ⚠️ กฎสำคัญ: Route Precedence (ลำดับของ Route)
ใน `src/posts/posts-v2.controller.ts`:
```typescript
// ✅ ถูกต้อง: Static route ต้องอยู่ก่อน Dynamic param route
@Get('stats')
getStats() { ... }

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }
```
*หากวาง `@Get(':id')` ไว้ก่อน เมื่อมี Request มาที่ `/posts/stats` ตัวแปลงจะมองว่าคำว่า "stats" คือ ID แล้วแปลงเป็นตัวเลขไม่ผ่าน เกิด Error 400 ทันที!*

---

## 6. การตั้งค่าและการรันระบบ

### 🚀 รันโปรเจกต์ด้วยคำสั่งเดียว:
```bash
npm run start:dev
```
*สคริปต์ `scripts/start-dev.sh` จะเปิด Docker PostgreSQL (Port 5433) และ Redis 7 (Port 6379), ตรวจสอบความพร้อม, ซิงค์ Prisma Schema, และรัน NestJS Server อัตโนมัติ*

### 📚 ลิงก์สำคัญ:
- **Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **API Base URL**: [http://localhost:3000/api](http://localhost:3000/api)

### 🔍 การเชื่อมต่อดูข้อมูลใน PostgreSQL:
- **DBeaver**:
  - Host: `localhost`
  - Port: `5433` *(พอร์ตที่แมปจาก Docker Container)*
  - Database: `nestjs_blog`
  - User / Password: `postgres` / `postgres`
- **Prisma Studio**:
  ```bash
  npx prisma studio   # เปิดดูตารางผ่าน Web UI ที่ http://localhost:5555
  ```

---

## 7. การทำ Unit Testing ด้วย Vitest และ Mocking

โปรเจกต์นี้ใช้ **Vitest** ควบคู่กับ **`vitest-mock-extended`** เพื่อทดสอบ Business Logic ในแต่ละ Service โดยไม่ต้องต่อ Database หรือ Redis จริง

### ไฟล์ทดสอบทั้งหมด (45 tests):
- `src/auth/auth.service.spec.ts` (7 tests)
- `src/auth/guards/roles.guard.spec.ts` (3 tests)
- `src/categories/categories.service.spec.ts` (7 tests)
- `src/users/users.service.spec.ts` (7 tests)
- `src/posts/posts.service.spec.ts` (13 tests: V1 CRUD, Ownership, V2 Pagination, Cache Hit/Miss, Invalidation)
- `src/redis/redis.service.spec.ts` (8 tests: get, set with TTL, del, delByPattern via scanStream)

### 💡 Pattern การเขียน Unit Test (AAA Pattern):
```typescript
it('ควรสร้างหมวดหมู่สำเร็จเมื่อชื่อไม่ซ้ำ', async () => {
  // 1. Arrange: ตั้งค่า Mock ให้ findUnique ตอบ null (ไม่ซ้ำ)
  prismaMock.category.findUnique.mockResolvedValue(null);
  prismaMock.category.create.mockResolvedValue({ id: 1, name: 'Tech', createdAt: new Date(), updatedAt: new Date() });

  // 2. Act: เรียก method ที่ต้องการทดสอบ
  const result = await service.create({ name: 'Tech' });

  // 3. Assert: ตรวจสอบผลลัพธ์
  expect(result.name).toBe('Tech');
  expect(prismaMock.category.create).toHaveBeenCalledOnce();
});
```

### คำสั่งรัน Test:
```bash
npm test            # รันการทดสอบทั้งหมด (45 tests)
npm run test:watch  # รันแบบ Watch Mode
npm run test:cov    # รายงาน Coverage
```

---

## 8. ระบบยืนยันตัวตนและการจำกัดสิทธิ์ (Auth & RBAC)

### 🔒 1. Password Hashing ด้วย bcrypt
- รหัสผ่านก่อนบันทึกลงฟิลด์ `password` ใน Database จะต้องผ่าน `bcrypt.hash(password, 10)` เสมอ
- ตอน Login จะใช้ `bcrypt.compare(loginPassword, user.password)` ในการตรวจสอบความถูกต้อง

### 🔑 2. JWT & Passport Strategy
- หลังจาก Login สำเร็จ ระบบจะออก JWT Access Token บรรจุ Payload `{ sub: user.id, email, role }`
- ฝั่ง Client แนบ Token ใน Header: `Authorization: Bearer <token>`
- `JwtStrategy` ทำหน้าที่ตรวจสอบลายเซ็นและดึง User Object มาเก็บไว้ใน `req.user`
- เข้าถึงข้อมูลผู้ใช้ใน Controller ผ่าน Decorator `@CurrentUser()`

### 🛡️ 3. Role-Based Access Control (RBAC) & Ownership Protection
- **`@Roles(Role.ADMIN)`**: กำหนดบทบาทที่ได้รับอนุญาตให้เรียกใช้ Endpoint
- **`RolesGuard`**: ตรวจสอบว่า Role ใน Token ตรงกับที่กำหนดไว้หรือไม่ หากไม่ตรงจะโยน `403 Forbidden`
- **Ownership Verification**:
  - `POST /api/v1/posts`: ผู้ใช้สร้างบทความได้โดย **`authorId` จะผูกกับ ID ใน Token อัตโนมัติ**
  - `PATCH /api/v1/posts/:id` และ `DELETE /api/v1/posts/:id`:
    - `AUTHOR`: แก้ไขหรือลบได้**เฉพาะบทความของตนเอง**
    - `ADMIN`: สามารถแก้ไขหรือลบบทความของใครก็ได้

---

## 9. ระบบแคชและ Invalidation ด้วย Redis (In-Memory Caching)

### ⚡ 1. ทำไมระบบ Backend ต้องมี Cache Layer?
ในแอปพลิเคชันที่มีผู้ใช้งานพร้อมกันจำนวนมาก Endpoint ที่ถูกเรียกบ่อยที่สุดคือการอ่านข้อมูล (Read Queries เช่น `GET /api/v2/posts`) หากทุก Request วิ่งตรงไปยัง PostgreSQL Database:
- Database CPU จะทำงานหนักและเกิด Connection Pool Exhaustion
- Response Time ช้าลงตามขนาดข้อมูลและความซับซ้อนของ Query (`count`, `findMany`, `ORDER BY`, `LIMIT`)
- การนำ **Redis** ซึ่งเก็บข้อมูลใน **RAM (In-Memory)** มาเป็นตัวกลาง จะลด Response Time จาก ~50-100ms เหลือเพียง **< 5ms**!

### 🔄 2. กลยุทธ์ Cache-Aside Pattern (Lazy Loading)
ระบบนำ Pattern นี้มาประยุกต์ใช้ใน `PostsService.findAllV2`:
```mermaid
flowchart TD
    Req([Client Request:\nGET /api/v2/posts?page=1&limit=10]) --> Check{"1. ตรวจสอบ Redis Cache\nKey: posts:v2:p1:l10:s:c"}
    Check -- "Cache Hit (มีข้อมูล)" --> RetCached["คืนค่าจาก Redis ทันที (< 5ms)\n🎉 Database ไม่ต้องทำงาน"]
    Check -- "Cache Miss (ไม่มีข้อมูล)" --> QueryDB["2. คิวรี PostgreSQL ผ่าน Prisma\n(Promise.all count & findMany)"]
    QueryDB --> SaveCache["3. บันทึกผลลัพธ์ลง Redis\n(TTL = 60 วินาที)"]
    SaveCache --> RetFresh["คืนค่าข้อมูลล่าสุดให้ Client"]
    RetCached --> Resp([Client Response])
    RetFresh --> Resp
```

### 🧹 3. ระบบ Cache Invalidation (การล้างแคชอย่างปลอดภัย)
เมื่อแคชหมดอายุตามเวลา (TTL 60 วินาที) หรือมีการเปลี่ยนแปลงข้อมูล (Mutation):
- เมื่อมีการเรียกคำสั่ง **`create`**, **`update`**, หรือ **`remove`** ใน `PostsService`
- Service จะส่งคำสั่งล้างแคช: `await this.redisService.delByPattern('posts:v2:*');`
- เพื่อให้ Client ที่เรียก `GET /api/v2/posts` ในครั้งถัดไป ได้รับข้อมูลที่ตรงกับความจริงใน Database เสมอ (Data Consistency)

> [!CAUTION] Production Warning: ห้ามใช้ `KEYS *` เด็ดขาด!
> Redis ทำงานด้วยสถาปัตยกรรม Single-Threaded หากใช้คำสั่ง `KEYS *` ค้นหาข้อมูลใน Production ที่มีคีย์หลักแสน/หลักล้าน Redis จะถูกบล็อกจนระบบค้างทั้งหมด!
> ในโปรเจกต์นี้ `RedisService.delByPattern` ใช้ **`scanStream`** (`SCAN`) ซึ่งทำงานแบบ **Non-blocking Batch Iteration** ลบทีละชุดอย่างปลอดภัยต่อ Production 100%

### 🖥️ 4. วิธีตรวจสอบข้อมูลใน Redis (CLI & GUI Tools)
1. **ดูผ่าน Terminal ด้วย `redis-cli` (ผ่าน Docker Container):**
   ```bash
   # เข้าสู่ interactive shell ของ Redis ใน Docker
   docker exec -it nestjs-blog-redis redis-cli

   # คำสั่งพื้นฐานที่ใช้บ่อย:
   KEYS *                           # ดูชื่อคีย์ทั้งหมดในแคช
   GET "posts:v2:p1:l10:s:c"         # ดู Value ข้อมูล JSON ในคีย์
   TTL "posts:v2:p1:l10:s:c"         # ตรวจสอบเวลาที่เหลือก่อนแคชหมดอายุ (วินาที)
   FLUSHALL                         # ล้างข้อมูลทั้งหมดใน Redis
   exit                             # ออกจาก redis-cli
   ```
2. **ดูผ่านโปรแกรม GUI (แนะนำ: Redis Insight - ฟรี):**
   - ดาวน์โหลดที่ [redis.io/insight](https://redis.io/insight/)
   - กด **Add Redis Database** -> กรอก Host: `localhost`, Port: `6379`
   - สามารถดู Key, Value, TTL, และสถิติ Memory Usage ได้แบบ Real-time Graphical Interface

