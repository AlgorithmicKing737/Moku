/**
 * @deprecated Import directly from the specific reader core modules:
 *   - chapterLoader.ts  → ensureReaderSession, sortChapters
 *   - navigation.ts     → getAdjacentChapters, setCurrentReaderPage, goToNextReaderPage, goToPreviousReaderPage
 *
 * This file is kept for backward-compatibility only.
 */
export {
    ensureReaderSession,
} from './chapterLoader';

export {
    sortChapters,
    getAdjacentChapters,
    setCurrentReaderPage,
    goToNextReaderPage,
    goToPreviousReaderPage,
} from './navigation';
