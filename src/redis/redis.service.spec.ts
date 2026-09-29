import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisService } from './redis.service.js';

/**
 * ==============================================================================
 * Unit Tests: RedisService
 * ==============================================================================
 * ทดสอบการทำงานของ Redis In-Memory Client Wrapper:
 * 1. get: การแปลง JSON deserialization เมื่อพบคีย์ และการคืนค่า null เมื่อไม่พบ
 * 2. set: การแปลง JSON serialization พร้อม TTL
 * 3. del: การลบคีย์เดี่ยว
 * 4. delByPattern: การลบแบบ Non-blocking ด้วย scanStream pipeline
 * ==============================================================================
 */
describe('RedisService', () => {
  let service: RedisService;
  let clientMock: any;

  beforeEach(() => {
    service = new RedisService();

    clientMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
      scanStream: vi.fn(),
      pipeline: vi.fn(),
    };

    // Inject mock client เข้าไปโดยตรงใน private field
    (service as any).client = clientMock;
  });

  describe('get', () => {
    it('ควรคืนค่า Object ที่ parse แล้วเมื่อพบคีย์ใน Redis', async () => {
      const mockData = { id: 1, title: 'Cached Post' };
      clientMock.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get<typeof mockData>('test:key');

      expect(result).toEqual(mockData);
      expect(clientMock.get).toHaveBeenCalledWith('test:key');
    });

    it('ควรคืนค่า null เมื่อไม่พบคีย์ใน Redis', async () => {
      clientMock.get.mockResolvedValue(null);

      const result = await service.get('test:notfound');

      expect(result).toBeNull();
    });

    it('ควรคืนค่า null อย่างปลอดภัยเมื่อ JSON parse ผิดพลาด', async () => {
      clientMock.get.mockResolvedValue('invalid-json{');

      const result = await service.get('test:corrupted');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('ควรบันทึกข้อมูลพร้อมกำหนด TTL (EX) เมื่อมีการระบุ ttlSeconds', async () => {
      const data = { message: 'hello' };
      clientMock.set.mockResolvedValue('OK');

      await service.set('test:key', data, 60);

      expect(clientMock.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(data),
        'EX',
        60,
      );
    });

    it('ควรบันทึกข้อมูลโดยไม่มี TTL เมื่อไม่ได้ระบุ ttlSeconds', async () => {
      const data = { message: 'hello' };
      clientMock.set.mockResolvedValue('OK');

      await service.set('test:key', data);

      expect(clientMock.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(data),
      );
    });
  });

  describe('del', () => {
    it('ควรเรียก client.del ด้วย key ที่ระบุ', async () => {
      clientMock.del.mockResolvedValue(1);

      await service.del('test:key');

      expect(clientMock.del).toHaveBeenCalledWith('test:key');
    });
  });

  describe('delByPattern', () => {
    it('ควรใช้ scanStream และ pipeline ลบ keys ที่ตรงกับ pattern', async () => {
      const pipelineMock = {
        del: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
      };
      clientMock.pipeline.mockReturnValue(pipelineMock);

      // สร้าง mock stream สำหรับ scanStream
      const callbacks: Record<string, Function> = {};
      const mockStream = {
        on: vi.fn((event: string, cb: Function) => {
          callbacks[event] = cb;
          return mockStream;
        }),
        pause: vi.fn(),
        resume: vi.fn(),
      };
      clientMock.scanStream.mockReturnValue(mockStream);

      const promise = service.delByPattern('posts:v2:*');

      // จำลองเหตุการณ์ stream ส่ง keys มา 1 batch แล้วจบ
      expect(callbacks['data']).toBeDefined();
      await callbacks['data'](['posts:v2:p1', 'posts:v2:p2']);

      expect(mockStream.pause).toHaveBeenCalled();
      expect(pipelineMock.del).toHaveBeenCalledWith('posts:v2:p1');
      expect(pipelineMock.del).toHaveBeenCalledWith('posts:v2:p2');
      expect(pipelineMock.exec).toHaveBeenCalled();
      expect(mockStream.resume).toHaveBeenCalled();

      // จำลอง stream จบ
      callbacks['end']();
      await promise;
    });
  });

  describe('onModuleDestroy', () => {
    it('ควรปิดการเชื่อมต่อ Redis อย่างสมบูรณ์', async () => {
      await service.onModuleDestroy();
      expect(clientMock.quit).toHaveBeenCalled();
    });
  });
});
