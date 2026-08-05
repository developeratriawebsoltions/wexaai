-- AlterTable: change header, body, footer to TEXT to support long Meta CDN URLs
ALTER TABLE `Template`
  MODIFY COLUMN `header` TEXT NULL,
  MODIFY COLUMN `body` TEXT NOT NULL,
  MODIFY COLUMN `footer` TEXT NULL;
