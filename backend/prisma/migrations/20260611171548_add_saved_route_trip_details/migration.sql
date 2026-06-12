-- AlterTable
ALTER TABLE "saved_routes" ADD COLUMN     "distance_km" DOUBLE PRECISION,
ADD COLUMN     "estimated_duration" TEXT,
ADD COLUMN     "route_geometry" JSONB,
ADD COLUMN     "travel_date" TIMESTAMP(3),
ADD COLUMN     "travel_time" TEXT;
