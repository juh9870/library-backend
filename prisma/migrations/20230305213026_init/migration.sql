-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ADMIN', 'APPROVE', 'CREATE', 'ARCHIVE', 'EDIT', 'DELETE');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('GENRE', 'AUTHOR', 'MISC');

-- CreateEnum
CREATE TYPE "BookState" AS ENUM ('DRAFT', 'UNAPPROVED', 'VISIBLE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" "Permission"[],
    "username" VARCHAR(128) NOT NULL,
    "passwordHash" VARCHAR(72) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "imageFile" TEXT,
    "bookFile" TEXT,
    "description" TEXT NOT NULL,
    "state" "BookState" NOT NULL,
    "published_date" TIMESTAMP(3),
    "userId" UUID,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TagType" NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BookTag" (
    "A" UUID NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Book_state_idx" ON "Book"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_type_name_key" ON "Tag"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_BookTag_AB_unique" ON "_BookTag"("A", "B");

-- CreateIndex
CREATE INDEX "_BookTag_B_index" ON "_BookTag"("B");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookTag" ADD CONSTRAINT "_BookTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookTag" ADD CONSTRAINT "_BookTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
