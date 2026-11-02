-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "launcherFocusTrap" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "launcherTabWindowMs" INTEGER,
ADD COLUMN     "launcherHoldFocusMs" INTEGER,
ADD COLUMN     "launcherMaxHoldCount" INTEGER;
