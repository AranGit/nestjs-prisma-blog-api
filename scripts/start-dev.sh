#!/usr/bin/env bash
# ==============================================================================
# 🚀 Start Dev Script: Automation for Database & NestJS Development
# สคริปต์อัตโนมัติสำหรับจัดการ Docker Container, Database และรัน Server ในคำสั่งเดียว
# ==============================================================================

# `set -e`: สั่งให้สคริปต์หยุดทำงานทันที (exit immediately) หากมีคำสั่งใดคืนค่า error (non-zero status)
# Ensures script terminates immediately on any failure.
set -e

# กำหนดตัวแปรคอนฟิกสำหรับ Docker & PostgreSQL
# Configuration variables for PostgreSQL container
CONTAINER_NAME="nestjs-blog-db"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="nestjs_blog"
# หมายเหตุ: ใช้ Port 5433 เพื่อหลีกเลี่ยงการชนกับ PostgreSQL ในเครื่อง (Host) ที่อาจรันบน 5432
# Note: Using host port 5433 to prevent collision with local PostgreSQL on port 5432
HOST_PORT="5433"

# กำหนด ANSI Escape Codes สำหรับแสดงสีสันใน Terminal เพื่อความสวยงามและอ่านง่าย
# ANSI color codes for readable terminal feedback
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color (รีเซ็ตสีกลับเป็นปกติ)

echo -e "${GREEN}🐳 Checking Docker environment...${NC}"

# ตรวจสอบว่าได้ติดตั้ง Docker CLI แล้วหรือยัง
# 1. Verify Docker CLI exists
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker Desktop first: https://www.docker.com/"
  exit 1
fi

# ตรวจสอบว่า Docker Daemon (เช่น Docker Desktop) กำลังเปิดใช้งานอยู่หรือไม่
# 2. Verify Docker daemon is running
if ! docker info &> /dev/null; then
  echo "❌ Docker daemon is not running. Please launch Docker Desktop application."
  exit 1
fi

# ==============================================================================
# 📦 ตรวจสอบและจัดการสถานะของ Container (Create / Start existing)
# ==============================================================================
# ใช้ `docker inspect` ตรวจสอบสถานะ: true (รันอยู่), false (หยุดอยู่), หรือ not_found (ยังไม่เคยสร้าง)
CONTAINER_STATE=$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")

if [ "$CONTAINER_STATE" = "true" ]; then
  echo -e "${GREEN}✅ PostgreSQL container is already running on port $HOST_PORT.${NC}"
elif [ "$CONTAINER_STATE" = "false" ]; then
  # หากเคยสร้าง container ไว้แล้ว แค่สั่ง start ขึ้นมาใหม่ ไม่ต้อง pull หรือสร้างใหม่
  echo -e "${YELLOW}▶️  Starting existing container '$CONTAINER_NAME'...${NC}"
  docker start "$CONTAINER_NAME"
else
  # หากยังไม่เคยมี container ให้สร้างใหม่ด้วยภาพ postgres:16-alpine (น้ำหนักเบาและเสถียร)
  echo -e "${YELLOW}📦 Creating PostgreSQL container on port $HOST_PORT...${NC}"
  docker run --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$HOST_PORT":5432 \
    -d postgres:16-alpine
fi

# ==============================================================================
# ⏳ รอจนกว่า PostgreSQL จะพร้อมรับ Connection (Health Check Polling)
# ==============================================================================
# ถึงแม้ Docker container จะ start แล้ว แต่ database engine ภายในอาจกำลัง boot อยู่
# เราจึงใช้ pg_isready เช็คซ้ำๆ ทุก 1 วินาที จนกว่าจะตอบรับ เพื่อป้องกัน connection error
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
RETRIES=30
until docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "❌ PostgreSQL did not become ready in time (timed out after 30s)."
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}✅ PostgreSQL is ready on port $HOST_PORT!${NC}"

# ==============================================================================
# 🔄 ซิงค์ Database Schema ด้วย Prisma
# ==============================================================================
# `npx prisma db push`: นำโครงสร้างใน prisma/schema.prisma ไปสร้างตารางใน Database ทันที
# เหมาะสำหรับการพัฒนาในโหมด Development ที่ต้องการความรวดเร็ว
# Flags `--skip-generate`: ข้ามการ generate client ซ้ำเพื่อประหยัดเวลา
echo -e "${YELLOW}🔄 Syncing Prisma schema with database...${NC}"
npx prisma db push --skip-generate
echo -e "${GREEN}✅ Database schema synced successfully!${NC}"

# ==============================================================================
# 🚀 เริ่มรัน NestJS Application ในโหมด Watch (Hot Reload)
# ==============================================================================
# `exec`: แทนที่ process ของ bash script ด้วย process ของ nest start
# เพื่อให้ signal เช่น SIGINT (Ctrl+C) ส่งตรงไปยัง Node.js process โดยตรง
echo ""
echo -e "${GREEN}🚀 Starting NestJS dev server (with hot reload)...${NC}"
exec npx nest start --watch
