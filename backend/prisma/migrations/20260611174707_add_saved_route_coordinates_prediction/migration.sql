-- AlterTable
ALTER TABLE "saved_routes" ADD COLUMN     "ai_prediction_result" JSONB,
ADD COLUMN     "destination_latitude" DOUBLE PRECISION,
ADD COLUMN     "destination_longitude" DOUBLE PRECISION,
ADD COLUMN     "source_latitude" DOUBLE PRECISION,
ADD COLUMN     "source_longitude" DOUBLE PRECISION;
