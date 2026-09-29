#!/usr/bin/env bash
# ==============================================================================
# 🚀 Start Dev Script: Automation for Database, Redis & NestJS Development
# สคริปต์อัตโนมัติสำหรับจัดการ Docker Container (PostgreSQL + Redis) และรัน Server
# ==============================================================================

set -e

# คอนฟิก PostgreSQL
PG_CONTAINER="nestjs-blog-db"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="nestjs_blog"
HOST_PORT="5433" # ใช้ port 5433 เพื่อไม่ให้ชนกับ local postgres บน 5432

# คอนฟิก Redis
REDIS_CONTAINER="nestjs-blog-redis"
REDIS_PORT="6379"

# สีแสดงผล Terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐳 Checking Docker environment...${NC}"

if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker Desktop: https://www.docker.com/"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker daemon is not running. Please launch Docker Desktop application."
  exit 1
fi

# ==============================================================================
# 1. 🐘 จัดการ PostgreSQL Container
# ==============================================================================
PG_STATE=$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null || echo "not_found")

if [ "$PG_STATE" = "true" ]; then
  echo -e "${GREEN}✅ PostgreSQL container is already running on port $HOST_PORT.${NC}"
elif [ "$PG_STATE" = "false" ]; then
  echo -e "${YELLOW}▶️  Starting existing container '$PG_CONTAINER'...${NC}"
  docker start "$PG_CONTAINER"
else
  echo -e "${YELLOW}📦 Creating PostgreSQL container on port $HOST_PORT...${NC}"
  docker run --name "$PG_CONTAINER" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$HOST_PORT":5432 \
    -d postgres:16-alpine
fi

# รอจนกว่า PostgreSQL จะพร้อมรับ connection
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
RETRIES=30
until docker exec "$PG_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" &> /dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo "❌ PostgreSQL did not become ready in time."
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}✅ PostgreSQL is ready on port $HOST_PORT!${NC}"

# ==============================================================================
# 2. ⚡ จัดการ Redis Container (In-Memory Caching)
# ==============================================================================
REDIS_STATE=$(docker inspect -f '{{.State.Running}}' "$REDIS_CONTAINER" 2>/dev/null || echo "not_found")

if [ "$REDIS_STATE" = "true" ]; then
  echo -e "${GREEN}✅ Redis container is already running on port $REDIS_PORT.${NC}"
elif [ "$REDIS_STATE" = "false" ]; then
  echo -e "${YELLOW}▶️  Starting existing container '$REDIS_CONTAINER'...${NC}"
  docker start "$REDIS_CONTAINER"
else
  echo -e "${YELLOW}📦 Creating Redis container on port $REDIS_PORT...${NC}"
  docker run --name "$REDIS_CONTAINER" \
    -p "$REDIS_PORT":6379 \
    -d redis:7-alpine
fi

# ตรวจสอบว่า Redis ตอบรับ ping
echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
REDIS_RETRIES=15
until docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; do
  REDIS_RETRIES=$((REDIS_RETRIES - 1))
  if [ $REDIS_RETRIES -le 0 ]; then
    echo "❌ Redis did not become ready in time."
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}✅ Redis is ready on port $REDIS_PORT!${NC}"

# ==============================================================================
# 3. 🔄 ซิงค์ Prisma Schema
# ==============================================================================
echo -e "${YELLOW}🔄 Syncing Prisma schema with database...${NC}"
npx prisma db push --skip-generate
echo -e "${GREEN}✅ Database schema synced successfully!${NC}"

# ==============================================================================
# 4. 🚀 รัน NestJS Development Server
# ==============================================================================
echo ""
echo -e "${GREEN}🚀 Starting NestJS dev server (with hot reload)...${NC}"
exec npx nest start --watch
