-- AlterTable
ALTER TABLE `subjects` MODIFY `icon` VARCHAR(10) NOT NULL DEFAULT '📚';

-- CreateTable
CREATE TABLE `interview_companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `website` VARCHAR(255) NULL,
    `industry` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interview_companies_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_descriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `role` VARCHAR(150) NOT NULL,
    `jdText` LONGTEXT NOT NULL,
    `requiredSkills` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `job_descriptions_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `companyId` INTEGER NULL,
    `jdId` INTEGER NULL,
    `source` ENUM('MANUAL', 'AI_JD', 'EXPERIENCE') NOT NULL DEFAULT 'MANUAL',
    `category` ENUM('TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'CODING', 'HR') NOT NULL DEFAULT 'TECHNICAL',
    `question` TEXT NOT NULL,
    `answer` LONGTEXT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    `whyAsked` TEXT NULL,
    `practiced` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interview_questions_userId_idx`(`userId`),
    INDEX `interview_questions_companyId_idx`(`companyId`),
    INDEX `interview_questions_jdId_idx`(`jdId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_experiences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `companyId` INTEGER NULL,
    `role` VARCHAR(150) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'INTERVIEWING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interview_experiences_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interview_rounds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `experienceId` INTEGER NOT NULL,
    `type` ENUM('HR', 'TECHNICAL', 'SYSTEM_DESIGN', 'CODING', 'BEHAVIORAL', 'CASE_STUDY') NOT NULL DEFAULT 'TECHNICAL',
    `roundNumber` INTEGER NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `outcome` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `interview_rounds_experienceId_idx`(`experienceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `interview_companies` ADD CONSTRAINT `interview_companies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_descriptions` ADD CONSTRAINT `job_descriptions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `interview_companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_questions` ADD CONSTRAINT `interview_questions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_questions` ADD CONSTRAINT `interview_questions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `interview_companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_questions` ADD CONSTRAINT `interview_questions_jdId_fkey` FOREIGN KEY (`jdId`) REFERENCES `job_descriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_experiences` ADD CONSTRAINT `interview_experiences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_experiences` ADD CONSTRAINT `interview_experiences_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `interview_companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interview_rounds` ADD CONSTRAINT `interview_rounds_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `interview_experiences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
