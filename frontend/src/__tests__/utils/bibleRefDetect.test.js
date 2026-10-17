import { describe, it, expect } from 'vitest';
import { detectBibleRefs } from '../../utils/bibleRefDetect.js';

describe('detectBibleRefs', () => {
  describe('empty / null input', () => {
    it('returns empty array for null input', () => {
      expect(detectBibleRefs(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      expect(detectBibleRefs(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(detectBibleRefs('')).toEqual([]);
    });

    it('returns empty array for text with no Bible references', () => {
      expect(detectBibleRefs('The quick brown fox jumps over the lazy dog.')).toEqual([]);
    });
  });

  describe('well-known references', () => {
    it('detects "John 3:16"', () => {
      const result = detectBibleRefs('John 3:16');
      expect(result).toEqual([{ display: 'John 3:16', ref: 'John 3:16' }]);
    });

    it('detects "Genesis 1:1"', () => {
      const result = detectBibleRefs('Genesis 1:1');
      expect(result).toEqual([{ display: 'Genesis 1:1', ref: 'Genesis 1:1' }]);
    });
  });

  describe('abbreviation normalization', () => {
    it('normalizes "Jn 3:16" to "John 3:16"', () => {
      const result = detectBibleRefs('Jn 3:16');
      expect(result).toEqual([{ display: 'John 3:16', ref: 'John 3:16' }]);
    });

    it('normalizes "Rom 8:28" to "Romans 8:28"', () => {
      const result = detectBibleRefs('Rom 8:28');
      expect(result).toEqual([{ display: 'Romans 8:28', ref: 'Romans 8:28' }]);
    });

    it('normalizes "Matt 5:1" to "Matthew 5:1"', () => {
      const result = detectBibleRefs('Matt 5:1');
      expect(result).toEqual([{ display: 'Matthew 5:1', ref: 'Matthew 5:1' }]);
    });
  });

  describe('chapter-only references', () => {
    it('detects "Psalm 23" without a verse', () => {
      const result = detectBibleRefs('Psalm 23');
      expect(result).toEqual([{ display: 'Psalm 23', ref: 'Psalm 23' }]);
    });

    it('detects "John 3" as chapter-only', () => {
      const result = detectBibleRefs('Read John 3 today.');
      expect(result).toEqual([{ display: 'John 3', ref: 'John 3' }]);
    });
  });

  describe('verse ranges', () => {
    it('detects "Matt 5:1-12" and formats with en-dash', () => {
      const result = detectBibleRefs('Matt 5:1-12');
      expect(result).toEqual([{ display: 'Matthew 5:1–12', ref: 'Matthew 5:1–12' }]);
    });

    it('detects a range with an existing en-dash', () => {
      const result = detectBibleRefs('Romans 8:28–30');
      expect(result).toEqual([{ display: 'Romans 8:28–30', ref: 'Romans 8:28–30' }]);
    });
  });

  describe('deduplication', () => {
    it('deduplicates repeated references in a paragraph', () => {
      const text = 'As John 3:16 says, for God so loved. See also John 3:16.';
      const result = detectBibleRefs(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ display: 'John 3:16', ref: 'John 3:16' });
    });
  });

  describe('multiple references', () => {
    it('detects multiple different references in a paragraph', () => {
      const text = 'Compare John 3:16 with Romans 8:28 and Genesis 1:1.';
      const result = detectBibleRefs(text);
      expect(result).toHaveLength(3);
      const displays = result.map((r) => r.display);
      expect(displays).toContain('John 3:16');
      expect(displays).toContain('Romans 8:28');
      expect(displays).toContain('Genesis 1:1');
    });
  });

  describe('NT books', () => {
    it('detects "Rev 22:20"', () => {
      const result = detectBibleRefs('Rev 22:20');
      expect(result).toEqual([{ display: 'Revelation 22:20', ref: 'Revelation 22:20' }]);
    });

    it('detects "1 Cor 13:4"', () => {
      const result = detectBibleRefs('1 Cor 13:4');
      expect(result).toEqual([{ display: '1 Corinthians 13:4', ref: '1 Corinthians 13:4' }]);
    });
  });

  describe('numbered books', () => {
    it('detects "1 Samuel 17:4"', () => {
      const result = detectBibleRefs('1 Samuel 17:4');
      expect(result).toEqual([{ display: '1 Samuel 17:4', ref: '1 Samuel 17:4' }]);
    });

    it('detects "2 Kings 5:1"', () => {
      const result = detectBibleRefs('2 Kings 5:1');
      expect(result).toEqual([{ display: '2 Kings 5:1', ref: '2 Kings 5:1' }]);
    });
  });

  describe('word boundary enforcement', () => {
    it('does NOT match "John 3:16something" as a verse reference', () => {
      // The trailing \b in the regex prevents matching when a digit is followed
      // by non-word characters that are still digits or letters immediately after
      // the verse number.  "16something" fails the \b after the verse digits.
      const result = detectBibleRefs('John 3:16something');
      // Either no result, or no result with display "John 3:16"
      const john316 = result.find((r) => r.display === 'John 3:16');
      expect(john316).toBeUndefined();
    });
  });

  describe('result shape', () => {
    it('each result has display and ref set to the same value', () => {
      const result = detectBibleRefs('Romans 5:8');
      expect(result).toHaveLength(1);
      expect(result[0].display).toBe(result[0].ref);
    });
  });
});
