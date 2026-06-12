-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "raw_data" JSONB;

-- AlterTable
ALTER TABLE "route_predictions" ADD COLUMN     "destination_latitude" DOUBLE PRECISION,
ADD COLUMN     "destination_longitude" DOUBLE PRECISION,
ADD COLUMN     "estimated_travel_time" TEXT,
ADD COLUMN     "route_colour" TEXT,
ADD COLUMN     "route_geometry" JSONB,
ADD COLUMN     "source_latitude" DOUBLE PRECISION,
ADD COLUMN     "source_longitude" DOUBLE PRECISION,
ADD COLUMN     "transport_mode" TEXT NOT NULL DEFAULT 'car';

-- CreateTable
CREATE TABLE "historical_traffic_data" (
    "id" TEXT NOT NULL,
    "road_name" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "traffic_volume" INTEGER NOT NULL,
    "average_speed" DOUBLE PRECISION NOT NULL,
    "congestion_level" TEXT NOT NULL,
    "incident_count" INTEGER NOT NULL DEFAULT 0,
    "roadwork_active" BOOLEAN NOT NULL DEFAULT false,
    "weather" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historical_traffic_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_training_runs" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "records_used" INTEGER NOT NULL DEFAULT 0,
    "accuracy_score" DOUBLE PRECISION,
    "trained_by_admin_id" TEXT,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "model_file_path" TEXT,

    CONSTRAINT "model_training_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "model_training_runs" ADD CONSTRAINT "model_training_runs_trained_by_admin_id_fkey" FOREIGN KEY ("trained_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
