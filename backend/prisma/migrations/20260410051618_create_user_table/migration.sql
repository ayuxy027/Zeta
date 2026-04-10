-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "auth0Sub" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "public"."User"("auth0Sub");
