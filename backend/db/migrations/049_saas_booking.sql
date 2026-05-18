CREATE TABLE IF NOT EXISTS booking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone VARCHAR(128) NOT NULL DEFAULT 'UTC',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_availability_user_id ON booking_availability(user_id);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_name VARCHAR(512) NOT NULL,
  client_email VARCHAR(512) NOT NULL,
  client_phone VARCHAR(64),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
  confirmation_token VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booking_date);
