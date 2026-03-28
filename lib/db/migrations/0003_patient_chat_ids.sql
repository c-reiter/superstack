ALTER TABLE "Patient"
ADD COLUMN IF NOT EXISTS "intakeChatId" uuid REFERENCES "Chat"("id"),
ADD COLUMN IF NOT EXISTS "consultChatId" uuid REFERENCES "Chat"("id");
