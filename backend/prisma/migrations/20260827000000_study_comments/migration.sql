-- CreateTable
CREATE TABLE "StudyComment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyComment_lessonId_idx" ON "StudyComment"("lessonId");
CREATE UNIQUE INDEX "StudyCommentLike_commentId_userId_key" ON "StudyCommentLike"("commentId", "userId");
CREATE INDEX "StudyCommentLike_userId_idx" ON "StudyCommentLike"("userId");

-- AddForeignKey
ALTER TABLE "StudyComment" ADD CONSTRAINT "StudyComment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "StudyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyComment" ADD CONSTRAINT "StudyComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyCommentLike" ADD CONSTRAINT "StudyCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "StudyComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyCommentLike" ADD CONSTRAINT "StudyCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;