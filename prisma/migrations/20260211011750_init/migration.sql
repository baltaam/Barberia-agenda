/*
  Warnings:

  - You are about to drop the column `themeColor` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the `Appointment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Professional` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Professional" DROP CONSTRAINT "Professional_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_tenantId_fkey";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "themeColor";

-- DropTable
DROP TABLE "Appointment";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Professional";

-- DropTable
DROP TABLE "Service";
