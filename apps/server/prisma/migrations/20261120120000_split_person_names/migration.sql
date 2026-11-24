-- Split the single "name" column of "User" and "Invite" into "firstName" / "lastName".
-- Existing names are split at the first run of whitespace (any \s: spaces, tabs, newlines);
-- whitespace inside the last name is collapsed to single spaces:
--   'Ann Marie Smith' -> firstName 'Ann', lastName 'Marie Smith'
--   'Ann'             -> firstName 'Ann', lastName NULL (User) / '' (Invite)
-- Keep in sync with splitFullName() in src/utils/person-name.ts.

-- User: both parts optional.
ALTER TABLE "User" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

UPDATE "User"
SET "firstName" = NULLIF(substring("name" FROM '\S+'), ''),
    "lastName"  = NULLIF(btrim(regexp_replace(regexp_replace("name", '^\s*\S+', ''), '\s+', ' ', 'g')), '')
WHERE "name" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "name";

-- Invite: firstName required, lastName defaults to ''.
ALTER TABLE "Invite" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

UPDATE "Invite"
SET "firstName" = COALESCE(substring("name" FROM '\S+'), ''),
    "lastName"  = btrim(regexp_replace(regexp_replace("name", '^\s*\S+', ''), '\s+', ' ', 'g'));

ALTER TABLE "Invite" ALTER COLUMN "firstName" SET NOT NULL;

ALTER TABLE "Invite" DROP COLUMN "name";
