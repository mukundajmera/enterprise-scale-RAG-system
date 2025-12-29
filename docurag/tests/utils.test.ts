/**
 * @jest-environment jsdom
 */
import { formatBytes, formatRelativeTime, isAllowedFileType, getConfidenceLevel, escapeHtml } from '@/lib/utils';

describe('Utils', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });
  });

  describe('isAllowedFileType', () => {
    it('should allow PDF files', () => {
      expect(isAllowedFileType('application/pdf')).toBe(true);
    });

    it('should allow text files', () => {
      expect(isAllowedFileType('text/plain')).toBe(true);
    });

    it('should allow markdown files', () => {
      expect(isAllowedFileType('text/markdown')).toBe(true);
    });

    it('should reject image files', () => {
      expect(isAllowedFileType('image/jpeg')).toBe(false);
    });

    it('should reject executable files', () => {
      expect(isAllowedFileType('application/x-executable')).toBe(false);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return High for scores >= 0.85', () => {
      expect(getConfidenceLevel(0.85)).toBe('High');
      expect(getConfidenceLevel(0.95)).toBe('High');
      expect(getConfidenceLevel(1.0)).toBe('High');
    });

    it('should return Medium for scores >= 0.7', () => {
      expect(getConfidenceLevel(0.7)).toBe('Medium');
      expect(getConfidenceLevel(0.8)).toBe('Medium');
    });

    it('should return Low for scores < 0.7', () => {
      expect(getConfidenceLevel(0.5)).toBe('Low');
      expect(getConfidenceLevel(0.69)).toBe('Low');
      expect(getConfidenceLevel(0)).toBe('Low');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml("It's a \"test\"")).toBe("It&#39;s a &quot;test&quot;");
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});
