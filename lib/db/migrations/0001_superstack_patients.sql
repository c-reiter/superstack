CREATE TABLE IF NOT EXISTS "Patient" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "name" text NOT NULL DEFAULT 'New patient',
  "summary" text NOT NULL DEFAULT '',
  "setupComplete" boolean NOT NULL DEFAULT false,
  "profile" text NOT NULL DEFAULT '{}',
  "intakeMessages" text NOT NULL DEFAULT '[]',
  "consultMessages" text NOT NULL DEFAULT '[]',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
