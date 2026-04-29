import { describe, it, expect } from 'vitest';
import { createIdea, IdeaTooShortError, IdeaTooLongError } from '../idea.js';

describe('createIdea', () => {
  it('creates a valid idea', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: 'An app that does something interesting' });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.text).toBe('An app that does something interesting');
      expect(result.value.id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('trims whitespace before validation', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: '  An interesting app idea  ' });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.text).toBe('An interesting app idea');
    }
  });

  it('rejects text shorter than 10 characters after trimming', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: '   short   ' });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaTooShortError);
      expect(result.error.code).toBe('IDEA_TOO_SHORT');
    }
  });

  it('rejects empty text', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: '' });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaTooShortError);
    }
  });

  it('rejects text longer than 2000 characters', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: 'a'.repeat(2001) });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(IdeaTooLongError);
      expect(result.error.code).toBe('IDEA_TOO_LONG');
    }
  });

  it('accepts text of exactly 10 characters', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: '1234567890' });
    expect(result.isOk()).toBe(true);
  });

  it('accepts text of exactly 2000 characters', () => {
    const result = createIdea({ userId: crypto.randomUUID(), text: 'a'.repeat(2000) });
    expect(result.isOk()).toBe(true);
  });
});
