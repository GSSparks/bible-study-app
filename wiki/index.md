# Scriptorium — Wiki Index

Scriptorium is a self-hosted, multi-user Bible study platform built on Node.js/Express (backend), React/Vite (frontend), PostgreSQL via Prisma, and the CrossWire SWORD engine for Bible/commentary/dictionary text. An optional Anthropic Claude integration powers the AI study assistant, word study, and lesson-drafting features.

This wiki contains one summary file per source file in the repository. Each summary covers purpose, key exports or props, dependencies, and notable patterns.

---

## Root Configuration

| File | Wiki |
|---|---|
| `CLAUDE.md` | [root/CLAUDE.md.md](root/CLAUDE.md.md) |
| `docker-compose.yml` | [root/docker-compose.yml.md](root/docker-compose.yml.md) |
| `Dockerfile` | [root/Dockerfile.md](root/Dockerfile.md) |
| `README.md` | [root/README.md.md](root/README.md.md) |
| `.env.example` | [root/env.example.md](root/env.example.md) |
| `TODO.md` | [root/TODO.md.md](root/TODO.md.md) |

---

## Backend

### Core

| File | Wiki |
|---|---|
| `backend/src/index.js` | [backend-core/index.js.md](backend-core/index.js.md) |
| `backend/src/app.js` | [backend-core/app.js.md](backend-core/app.js.md) |
| `backend/src/config.js` | [backend-core/config.js.md](backend-core/config.js.md) |
| `backend/src/db/prisma.js` | [backend-core/db.prisma.js.md](backend-core/db.prisma.js.md) |
| `backend/package.json` | [backend-core/package.json.md](backend-core/package.json.md) |
| `backend/vitest.config.js` | [backend-core/vitest.config.js.md](backend-core/vitest.config.js.md) |
| `backend/src/scripts/seedModules.js` | [backend-core/seedModules.js.md](backend-core/seedModules.js.md) |
| `backend/__mocks__/node-sword-interface.js` | [backend-core/mock-node-sword-interface.js.md](backend-core/mock-node-sword-interface.js.md) |

### Middleware

| File | Wiki |
|---|---|
| `backend/src/middleware/auth.js` | [backend-middleware/auth.js.md](backend-middleware/auth.js.md) |
| `backend/src/middleware/errorHandler.js` | [backend-middleware/errorHandler.js.md](backend-middleware/errorHandler.js.md) |
| `backend/src/middleware/upload.js` | [backend-middleware/upload.js.md](backend-middleware/upload.js.md) |

### Routes

| File | Wiki |
|---|---|
| `backend/src/routes/admin.js` | [backend-routes/admin.js.md](backend-routes/admin.js.md) |
| `backend/src/routes/auth.js` | [backend-routes/auth.js.md](backend-routes/auth.js.md) |
| `backend/src/routes/bible.js` | [backend-routes/bible.js.md](backend-routes/bible.js.md) |
| `backend/src/routes/bibleMaps.js` | [backend-routes/bibleMaps.js.md](backend-routes/bibleMaps.js.md) |
| `backend/src/routes/books.js` | [backend-routes/books.js.md](backend-routes/books.js.md) |
| `backend/src/routes/branding.js` | [backend-routes/branding.js.md](backend-routes/branding.js.md) |
| `backend/src/routes/connections.js` | [backend-routes/connections.js.md](backend-routes/connections.js.md) |
| `backend/src/routes/context.js` | [backend-routes/context.js.md](backend-routes/context.js.md) |
| `backend/src/routes/devotionals.js` | [backend-routes/devotionals.js.md](backend-routes/devotionals.js.md) |
| `backend/src/routes/dictionary.js` | [backend-routes/dictionary.js.md](backend-routes/dictionary.js.md) |
| `backend/src/routes/factbook.js` | [backend-routes/factbook.js.md](backend-routes/factbook.js.md) |
| `backend/src/routes/merriam.js` | [backend-routes/merriam.js.md](backend-routes/merriam.js.md) |
| `backend/src/routes/modules.js` | [backend-routes/modules.js.md](backend-routes/modules.js.md) |
| `backend/src/routes/notes.js` | [backend-routes/notes.js.md](backend-routes/notes.js.md) |
| `backend/src/routes/pdf.js` | [backend-routes/pdf.js.md](backend-routes/pdf.js.md) |
| `backend/src/routes/personalModulesRouter.js` | [backend-routes/personalModulesRouter.js.md](backend-routes/personalModulesRouter.js.md) |
| `backend/src/routes/phraseStudy.js` | [backend-routes/phraseStudy.js.md](backend-routes/phraseStudy.js.md) |
| `backend/src/routes/readingPlans.js` | [backend-routes/readingPlans.js.md](backend-routes/readingPlans.js.md) |
| `backend/src/routes/scriptoriums.js` | [backend-routes/scriptoriums.js.md](backend-routes/scriptoriums.js.md) |
| `backend/src/routes/search.js` | [backend-routes/search.js.md](backend-routes/search.js.md) |
| `backend/src/routes/strongs.js` | [backend-routes/strongs.js.md](backend-routes/strongs.js.md) |
| `backend/src/routes/studies.js` | [backend-routes/studies.js.md](backend-routes/studies.js.md) |
| `backend/src/routes/swordImages.js` | [backend-routes/swordImages.js.md](backend-routes/swordImages.js.md) |
| `backend/src/routes/topics.js` | [backend-routes/topics.js.md](backend-routes/topics.js.md) |
| `backend/src/routes/uploads.js` | [backend-routes/uploads.js.md](backend-routes/uploads.js.md) |
| `backend/src/routes/users.js` | [backend-routes/users.js.md](backend-routes/users.js.md) |
| `backend/src/routes/wall.js` | [backend-routes/wall.js.md](backend-routes/wall.js.md) |
| `backend/src/routes/wikipedia.js` | [backend-routes/wikipedia.js.md](backend-routes/wikipedia.js.md) |
| `backend/src/routes/wordStudy.js` | [backend-routes/wordStudy.js.md](backend-routes/wordStudy.js.md) |

### Services

| File | Wiki |
|---|---|
| `backend/src/services/authService.js` | [backend-services/authService.js.md](backend-services/authService.js.md) |
| `backend/src/services/bibleMapsService.js` | [backend-services/bibleMapsService.js.md](backend-services/bibleMapsService.js.md) |
| `backend/src/services/brandingService.js` | [backend-services/brandingService.js.md](backend-services/brandingService.js.md) |
| `backend/src/services/connectionService.js` | [backend-services/connectionService.js.md](backend-services/connectionService.js.md) |
| `backend/src/services/contextBuilder.js` | [backend-services/contextBuilder.js.md](backend-services/contextBuilder.js.md) |
| `backend/src/services/devotionalService.js` | [backend-services/devotionalService.js.md](backend-services/devotionalService.js.md) |
| `backend/src/services/factbookSummaryService.js` | [backend-services/factbookSummaryService.js.md](backend-services/factbookSummaryService.js.md) |
| `backend/src/services/mdModuleService.js` | [backend-services/mdModuleService.js.md](backend-services/mdModuleService.js.md) |
| `backend/src/services/metricsService.js` | [backend-services/metricsService.js.md](backend-services/metricsService.js.md) |
| `backend/src/services/moduleVisibilityService.js` | [backend-services/moduleVisibilityService.js.md](backend-services/moduleVisibilityService.js.md) |
| `backend/src/services/ocrService.js` | [backend-services/ocrService.js.md](backend-services/ocrService.js.md) |
| `backend/src/services/pdfService.js` | [backend-services/pdfService.js.md](backend-services/pdfService.js.md) |
| `backend/src/services/personalModuleService.js` | [backend-services/personalModuleService.js.md](backend-services/personalModuleService.js.md) |
| `backend/src/services/readingPlanService.js` | [backend-services/readingPlanService.js.md](backend-services/readingPlanService.js.md) |
| `backend/src/services/referenceParser.js` | [backend-services/referenceParser.js.md](backend-services/referenceParser.js.md) |
| `backend/src/services/scriptoriumService.js` | [backend-services/scriptoriumService.js.md](backend-services/scriptoriumService.js.md) |
| `backend/src/services/studyService.js` | [backend-services/studyService.js.md](backend-services/studyService.js.md) |
| `backend/src/services/swordService.js` | [backend-services/swordService.js.md](backend-services/swordService.js.md) |
| `backend/src/services/wallService.js` | [backend-services/wallService.js.md](backend-services/wallService.js.md) |

### Database

| File | Wiki |
|---|---|
| `backend/prisma/schema.prisma` | [backend-database/schema.prisma.md](backend-database/schema.prisma.md) |
| `backend/prisma/migrations/` (all 34 migrations) | [backend-database/migrations.md](backend-database/migrations.md) |

---

## Frontend

### Core

| File | Wiki |
|---|---|
| `frontend/src/main.jsx` | [frontend-core/main.jsx.md](frontend-core/main.jsx.md) |
| `frontend/src/App.jsx` | [frontend-core/App.jsx.md](frontend-core/App.jsx.md) |
| `frontend/src/api/client.js` | [frontend-core/client.js.md](frontend-core/client.js.md) |
| `frontend/index.html` | [frontend-core/index.html.md](frontend-core/index.html.md) |
| `frontend/vite.config.js` | [frontend-core/vite.config.js.md](frontend-core/vite.config.js.md) |
| `frontend/tailwind.config.js` | [frontend-core/tailwind.config.js.md](frontend-core/tailwind.config.js.md) |
| `frontend/postcss.config.js` | [frontend-core/postcss.config.js.md](frontend-core/postcss.config.js.md) |
| `frontend/package.json` | [frontend-core/package.json.md](frontend-core/package.json.md) |
| `frontend/vitest.config.js` | [frontend-core/vitest.config.js.md](frontend-core/vitest.config.js.md) |

### Components — Layout & Shell

| File | Wiki |
|---|---|
| `frontend/src/components/AppShell.jsx` | [frontend-components/AppShell.jsx.md](frontend-components/AppShell.jsx.md) |
| `frontend/src/components/MainLayout.jsx` | [frontend-components/MainLayout.jsx.md](frontend-components/MainLayout.jsx.md) |
| `frontend/src/components/WorkspaceLayout.jsx` | [frontend-components/WorkspaceLayout.jsx.md](frontend-components/WorkspaceLayout.jsx.md) |
| `frontend/src/components/BootstrapScreen.jsx` | [frontend-components/BootstrapScreen.jsx.md](frontend-components/BootstrapScreen.jsx.md) |

### Components — Auth

| File | Wiki |
|---|---|
| `frontend/src/components/useAuth.js` | [frontend-components/useAuth.js.md](frontend-components/useAuth.js.md) |
| `frontend/src/components/LoginModal.jsx` | [frontend-components/LoginModal.jsx.md](frontend-components/LoginModal.jsx.md) |
| `frontend/src/components/ChangePasswordModal.jsx` | [frontend-components/ChangePasswordModal.jsx.md](frontend-components/ChangePasswordModal.jsx.md) |

### Components — Major Views

| File | Wiki |
|---|---|
| `frontend/src/components/CellView.jsx` | [frontend-components/CellView.jsx.md](frontend-components/CellView.jsx.md) |
| `frontend/src/components/BiblePanel.jsx` | [frontend-components/BiblePanel.jsx.md](frontend-components/BiblePanel.jsx.md) |
| `frontend/src/components/BooksView.jsx` | [frontend-components/BooksView.jsx.md](frontend-components/BooksView.jsx.md) |
| `frontend/src/components/BookPane.jsx` | [frontend-components/BookPane.jsx.md](frontend-components/BookPane.jsx.md) |
| `frontend/src/components/BookPanel.jsx` | [frontend-components/BookPanel.jsx.md](frontend-components/BookPanel.jsx.md) |
| `frontend/src/components/CommentaryPane.jsx` | [frontend-components/CommentaryPane.jsx.md](frontend-components/CommentaryPane.jsx.md) |
| `frontend/src/components/DictionaryPane.jsx` | [frontend-components/DictionaryPane.jsx.md](frontend-components/DictionaryPane.jsx.md) |
| `frontend/src/components/NotesView.jsx` | [frontend-components/NotesView.jsx.md](frontend-components/NotesView.jsx.md) |
| `frontend/src/components/LibraryView.jsx` | [frontend-components/LibraryView.jsx.md](frontend-components/LibraryView.jsx.md) |
| `frontend/src/components/AdminView.jsx` | [frontend-components/AdminView.jsx.md](frontend-components/AdminView.jsx.md) |
| `frontend/src/components/FellowsView.jsx` | [frontend-components/FellowsView.jsx.md](frontend-components/FellowsView.jsx.md) |
| `frontend/src/components/ProfileWallView.jsx` | [frontend-components/ProfileWallView.jsx.md](frontend-components/ProfileWallView.jsx.md) |
| `frontend/src/components/SettingsView.jsx` | [frontend-components/SettingsView.jsx.md](frontend-components/SettingsView.jsx.md) |
| `frontend/src/components/ReadingPlanView.jsx` | [frontend-components/ReadingPlanView.jsx.md](frontend-components/ReadingPlanView.jsx.md) |
| `frontend/src/components/ScriptoriumsView.jsx` | [frontend-components/ScriptoriumsView.jsx.md](frontend-components/ScriptoriumsView.jsx.md) |
| `frontend/src/components/DailyDevotional.jsx` | [frontend-components/DailyDevotional.jsx.md](frontend-components/DailyDevotional.jsx.md) |
| `frontend/src/components/BibleMapView.jsx` | [frontend-components/BibleMapView.jsx.md](frontend-components/BibleMapView.jsx.md) |
| `frontend/src/components/CursusView.jsx` | [frontend-components/CursusView.jsx.md](frontend-components/CursusView.jsx.md) |

### Components — Study & AI

| File | Wiki |
|---|---|
| `frontend/src/components/StudyDetail.jsx` | [frontend-components/StudyDetail.jsx.md](frontend-components/StudyDetail.jsx.md) |
| `frontend/src/components/StudyMode.jsx` | [frontend-components/StudyMode.jsx.md](frontend-components/StudyMode.jsx.md) |
| `frontend/src/components/StudyBuilder.jsx` | [frontend-components/StudyBuilder.jsx.md](frontend-components/StudyBuilder.jsx.md) |
| `frontend/src/components/StudyAssistant.jsx` | [frontend-components/StudyAssistant.jsx.md](frontend-components/StudyAssistant.jsx.md) |
| `frontend/src/components/AICompanionView.jsx` | [frontend-components/AICompanionView.jsx.md](frontend-components/AICompanionView.jsx.md) |
| `frontend/src/components/AIChatPane.jsx` | [frontend-components/AIChatPane.jsx.md](frontend-components/AIChatPane.jsx.md) |
| `frontend/src/components/ScriptoriumStudiesTab.jsx` | [frontend-components/ScriptoriumStudiesTab.jsx.md](frontend-components/ScriptoriumStudiesTab.jsx.md) |

### Components — Scripture & Reading

| File | Wiki |
|---|---|
| `frontend/src/components/ReaderPane.jsx` | [frontend-components/ReaderPane.jsx.md](frontend-components/ReaderPane.jsx.md) |
| `frontend/src/components/PassageGuidePane.jsx` | [frontend-components/PassageGuidePane.jsx.md](frontend-components/PassageGuidePane.jsx.md) |
| `frontend/src/components/PassageQuickView.jsx` | [frontend-components/PassageQuickView.jsx.md](frontend-components/PassageQuickView.jsx.md) |
| `frontend/src/components/PassageMapsModal.jsx` | [frontend-components/PassageMapsModal.jsx.md](frontend-components/PassageMapsModal.jsx.md) |
| `frontend/src/components/CrossRefPane.jsx` | [frontend-components/CrossRefPane.jsx.md](frontend-components/CrossRefPane.jsx.md) |
| `frontend/src/components/VerseDrawer.jsx` | [frontend-components/VerseDrawer.jsx.md](frontend-components/VerseDrawer.jsx.md) |
| `frontend/src/components/VerseHoverCard.jsx` | [frontend-components/VerseHoverCard.jsx.md](frontend-components/VerseHoverCard.jsx.md) |
| `frontend/src/components/VerseCommentaryEditor.jsx` | [frontend-components/VerseCommentaryEditor.jsx.md](frontend-components/VerseCommentaryEditor.jsx.md) |
| `frontend/src/components/StrongsPopup.jsx` | [frontend-components/StrongsPopup.jsx.md](frontend-components/StrongsPopup.jsx.md) |
| `frontend/src/components/StrongsDrawer.jsx` | [frontend-components/StrongsDrawer.jsx.md](frontend-components/StrongsDrawer.jsx.md) |
| `frontend/src/components/FootnotePopup.jsx` | [frontend-components/FootnotePopup.jsx.md](frontend-components/FootnotePopup.jsx.md) |
| `frontend/src/components/RefNav.jsx` | [frontend-components/RefNav.jsx.md](frontend-components/RefNav.jsx.md) |
| `frontend/src/components/BookChapterPicker.jsx` | [frontend-components/BookChapterPicker.jsx.md](frontend-components/BookChapterPicker.jsx.md) |

### Components — Documents

| File | Wiki |
|---|---|
| `frontend/src/components/DocumentReader.jsx` | [frontend-components/DocumentReader.jsx.md](frontend-components/DocumentReader.jsx.md) |
| `frontend/src/components/PDFBody.jsx` | [frontend-components/PDFBody.jsx.md](frontend-components/PDFBody.jsx.md) |
| `frontend/src/components/DocumentPane.jsx` | [frontend-components/DocumentPane.jsx.md](frontend-components/DocumentPane.jsx.md) |
| `frontend/src/components/DocumentPicker.jsx` | [frontend-components/DocumentPicker.jsx.md](frontend-components/DocumentPicker.jsx.md) |
| `frontend/src/components/DocumentModal.jsx` | [frontend-components/DocumentModal.jsx.md](frontend-components/DocumentModal.jsx.md) |
| `frontend/src/components/DocumentTabStrip.jsx` | [frontend-components/DocumentTabStrip.jsx.md](frontend-components/DocumentTabStrip.jsx.md) |
| `frontend/src/components/Library.jsx` | [frontend-components/Library.jsx.md](frontend-components/Library.jsx.md) |

### Components — Notes

| File | Wiki |
|---|---|
| `frontend/src/components/NotePanel.jsx` | [frontend-components/NotePanel.jsx.md](frontend-components/NotePanel.jsx.md) |
| `frontend/src/components/NotesSidebar.jsx` | [frontend-components/NotesSidebar.jsx.md](frontend-components/NotesSidebar.jsx.md) |
| `frontend/src/components/SelectionNotePopup.jsx` | [frontend-components/SelectionNotePopup.jsx.md](frontend-components/SelectionNotePopup.jsx.md) |
| `frontend/src/components/SelectableNoteRegion.jsx` | [frontend-components/SelectableNoteRegion.jsx.md](frontend-components/SelectableNoteRegion.jsx.md) |

### Components — Search & Content

| File | Wiki |
|---|---|
| `frontend/src/components/SearchBar.jsx` | [frontend-components/SearchBar.jsx.md](frontend-components/SearchBar.jsx.md) |
| `frontend/src/components/SearchResultsPane.jsx` | [frontend-components/SearchResultsPane.jsx.md](frontend-components/SearchResultsPane.jsx.md) |
| `frontend/src/components/RichContent.jsx` | [frontend-components/RichContent.jsx.md](frontend-components/RichContent.jsx.md) |
| `frontend/src/components/RichEditor.jsx` | [frontend-components/RichEditor.jsx.md](frontend-components/RichEditor.jsx.md) |
| `frontend/src/components/ResourceFooter.jsx` | [frontend-components/ResourceFooter.jsx.md](frontend-components/ResourceFooter.jsx.md) |
| `frontend/src/components/LinksPane.jsx` | [frontend-components/LinksPane.jsx.md](frontend-components/LinksPane.jsx.md) |
| `frontend/src/components/TopicGuidePane.jsx` | [frontend-components/TopicGuidePane.jsx.md](frontend-components/TopicGuidePane.jsx.md) |

### Components — Social

| File | Wiki |
|---|---|
| `frontend/src/components/PostFeed.jsx` | [frontend-components/PostFeed.jsx.md](frontend-components/PostFeed.jsx.md) |
| `frontend/src/components/ShareFindingModal.jsx` | [frontend-components/ShareFindingModal.jsx.md](frontend-components/ShareFindingModal.jsx.md) |

### Components — Utility

| File | Wiki |
|---|---|
| `frontend/src/components/TabStrip.jsx` | [frontend-components/TabStrip.jsx.md](frontend-components/TabStrip.jsx.md) |
| `frontend/src/components/AddTabControl.jsx` | [frontend-components/AddTabControl.jsx.md](frontend-components/AddTabControl.jsx.md) |
| `frontend/src/components/Avatar.jsx` | [frontend-components/Avatar.jsx.md](frontend-components/Avatar.jsx.md) |
| `frontend/src/components/AvatarRoll.jsx` | [frontend-components/AvatarRoll.jsx.md](frontend-components/AvatarRoll.jsx.md) |
| `frontend/src/components/UserMenu.jsx` | [frontend-components/UserMenu.jsx.md](frontend-components/UserMenu.jsx.md) |
| `frontend/src/components/ModuleManager.jsx` | [frontend-components/ModuleManager.jsx.md](frontend-components/ModuleManager.jsx.md) |
| `frontend/src/components/ModulePicker.jsx` | [frontend-components/ModulePicker.jsx.md](frontend-components/ModulePicker.jsx.md) |
| `frontend/src/components/ModuleSwitcher.jsx` | [frontend-components/ModuleSwitcher.jsx.md](frontend-components/ModuleSwitcher.jsx.md) |
| `frontend/src/components/ContextZoomMenu.jsx` | [frontend-components/ContextZoomMenu.jsx.md](frontend-components/ContextZoomMenu.jsx.md) |
| `frontend/src/components/MapPanel.jsx` | [frontend-components/MapPanel.jsx.md](frontend-components/MapPanel.jsx.md) |
| `frontend/src/components/PlaceholderView.jsx` | [frontend-components/PlaceholderView.jsx.md](frontend-components/PlaceholderView.jsx.md) |

### Hooks

| File | Wiki |
|---|---|
| `frontend/src/hooks/useTabbedWindow.js` | [frontend-hooks/useTabbedWindow.js.md](frontend-hooks/useTabbedWindow.js.md) |
| `frontend/src/hooks/useWorkspaceLayout.js` | [frontend-hooks/useWorkspaceLayout.js.md](frontend-hooks/useWorkspaceLayout.js.md) |
| `frontend/src/hooks/useResizableWidth.js` | [frontend-hooks/useResizableWidth.js.md](frontend-hooks/useResizableWidth.js.md) |
| `frontend/src/hooks/useResizableHeight.js` | [frontend-hooks/useResizableHeight.js.md](frontend-hooks/useResizableHeight.js.md) |
| `frontend/src/hooks/useHorizontalScroll.js` | [frontend-hooks/useHorizontalScroll.js.md](frontend-hooks/useHorizontalScroll.js.md) |

### Utilities & Data

| File | Wiki |
|---|---|
| `frontend/src/utils/bibleRefDetect.js` | [frontend-utils/bibleRefDetect.js.md](frontend-utils/bibleRefDetect.js.md) |
| `frontend/src/utils/bibleBooks.js` | [frontend-utils/bibleBooks.js.md](frontend-utils/bibleBooks.js.md) |
| `frontend/src/utils/bookHtml.js` | [frontend-utils/bookHtml.js.md](frontend-utils/bookHtml.js.md) |
| `frontend/src/utils/dictHtml.js` | [frontend-utils/dictHtml.js.md](frontend-utils/dictHtml.js.md) |
| `frontend/src/utils/osisToHuman.js` | [frontend-utils/osisToHuman.js.md](frontend-utils/osisToHuman.js.md) |
| `frontend/src/utils/parseInterlinear.js` | [frontend-utils/parseInterlinear.js.md](frontend-utils/parseInterlinear.js.md) |
| `frontend/src/utils/rehypeVerseRefs.js` | [frontend-utils/rehypeVerseRefs.js.md](frontend-utils/rehypeVerseRefs.js.md) |
| `frontend/src/utils/robinsonMorphology.js` | [frontend-utils/robinsonMorphology.js.md](frontend-utils/robinsonMorphology.js.md) |
| `frontend/src/utils/searchStem.js` | [frontend-utils/searchStem.js.md](frontend-utils/searchStem.js.md) |
| `frontend/src/utils/abbreviateTitle.js` | [frontend-utils/abbreviateTitle.js.md](frontend-utils/abbreviateTitle.js.md) |
| `frontend/src/utils/avatar.js` | [frontend-utils/avatar.js.md](frontend-utils/avatar.js.md) |
| `frontend/src/data/biblicalMapData.js` | [frontend-utils/biblicalMapData.js.md](frontend-utils/biblicalMapData.js.md) |

### Tests

| File | Wiki |
|---|---|
| `frontend/src/__tests__/setup.js` | [frontend-utils/test-setup.js.md](frontend-utils/test-setup.js.md) |
| `frontend/src/__tests__/api/client.test.js` | [frontend-utils/test-client.js.md](frontend-utils/test-client.js.md) |
| `frontend/src/__tests__/utils/bibleRefDetect.test.js` | [frontend-utils/test-bibleRefDetect.js.md](frontend-utils/test-bibleRefDetect.js.md) |
| `frontend/src/__tests__/utils/bookHtml.test.js` | [frontend-utils/test-bookHtml.js.md](frontend-utils/test-bookHtml.js.md) |
