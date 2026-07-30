-- AlterTable
ALTER TABLE `workspacesettings` ADD COLUMN `welcomeTemplateEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `welcomeTemplateName` VARCHAR(191) NULL;
