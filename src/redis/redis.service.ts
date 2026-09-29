import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * ==============================================================================
 * ⚡ RedisService (In-Memory Data Store Client)
 * ==============================================================================
 * จัดการการเชื่อมต่อและคำสั่งพื้นฐานกับ Redis เพื่อทำ Caching
 *
 * 💡 Backend Performance & Reliability Concepts:
 * 1. Cache-Aside Pattern:
 *    - `get<T>(key)`: ดึงข้อมูลจากแคช หากพบจะคืนค่าทันที (Cache Hit)
 *    - `set(key, val, ttl)`: บันทึกข้อมูลลงแคชพร้อมกำหนดเวลาหมดอายุ (TTL)
 * 2. Non-Blocking Invalidation (`delByPattern`):
 *    - ⚠️ ห้ามใช้คำสั่ง `KEYS *` ใน Production เด็ดขาด! เพราะ Redis ทำงานแบบ Single-Thread
 *      คำสั่ง `KEYS *` จะบล็อก Server จนค้างหากมี Key หลักแสนตัว
 *    - เราใช้ `scanStream({ match: pattern })` ซึ่งเป็นคำสั่ง `SCAN` ทำงานแบบ Non-blocking
 *      ทยอยค้นหาและลบทีละ batch จึงปลอดภัยต่อ Production 100%
 * ==============================================================================
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        // ลองเชื่อมต่อใหม่สูงสุด 5 ครั้ง ห่างกันครั้งละ 2 วินาที
        if (times > 5) {
          this.logger.error('❌ Failed to connect to Redis after 5 retries');
          return null;
        }
        return Math.min(times * 2000, 5000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log(`⚡ Connected to Redis on ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed.');
    }
  }

  /**
   * 🔍 ดึงข้อมูลจากแคชตาม Key
   * @param key คีย์ที่ต้องการดึง
   * @returns ข้อมูลที่แปลงจาก JSON หรือ null หากไม่พบ
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Error reading cache for key "${key}":`, error);
      return null;
    }
  }

  /**
   * 💾 บันทึกข้อมูลลงแคช
   * @param key คีย์ที่ใช้เก็บ
   * @param value ข้อมูลที่ต้องการแคช (จะถูกแปลงเป็น JSON string)
   * @param ttlSeconds เวลาหมดอายุของแคช (วินาที)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error saving cache for key "${key}":`, error);
    }
  }

  /**
   * 🗑️ ลบแคชตาม Key ที่ระบุ
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key "${key}":`, error);
    }
  }

  /**
   * 🧹 ล้างแคชทั้งหมดที่ตรงกับ Pattern (เช่น "posts:v2:*")
   * ใช้ Redis SCAN Stream แบบ Non-blocking เพื่อความปลอดภัยใน Production
   */
  async delByPattern(pattern: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (!this.client) {
          return resolve();
        }
        const stream = this.client.scanStream({
          match: pattern,
          count: 100, // สแกนทีละ 100 keys ต่อ batch
        });

        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            stream.pause();
            try {
              const pipeline = this.client.pipeline();
              keys.forEach((key) => pipeline.del(key));
              await pipeline.exec();
            } catch (err) {
              this.logger.error(`Pipeline delete error for pattern "${pattern}":`, err);
            } finally {
              stream.resume();
            }
          }
        });

        stream.on('end', () => {
          resolve();
        });

        stream.on('error', (err) => {
          this.logger.error(`Error purging cache pattern "${pattern}":`, err);
          resolve(); // Resolve to avoid breaking caller if cache deletion fails
        });
      } catch (error) {
        this.logger.error(`Error purging cache pattern "${pattern}":`, error);
        resolve();
      }
    });
  }

  /**
   * เข้าถึง Underlying ioredis client โดยตรง (หากต้องการคำสั่งเฉพาะทาง)
   */
  getClient(): Redis {
    return this.client;
  }
}
