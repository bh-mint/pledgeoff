import { describe, it, expect } from 'vitest';
import { extractSearchKeywords } from '../keyword-extractor';

describe('extractSearchKeywords', () => {
  it('prioritizes title words, fills from description', () => {
    const text = 'AI code reviewer\n\nTool that learns coding standards from pull requests automatically';
    const result = extractSearchKeywords(text);
    expect(result).toBe('code reviewer tool learns coding standards');
  });

  it('handles vague title by using description words', () => {
    const text = 'startup idea\n\nAI meal planner that adapts to gym schedule and dietary preferences';
    const result = extractSearchKeywords(text);
    expect(result).toBe('startup idea meal planner adapts gym');
  });

  it('removes stop words', () => {
    const text = 'A tool for the team\n\nAn app that helps developers with code review automation';
    const result = extractSearchKeywords(text);
    expect(result).toContain('tool');
    expect(result).toContain('team');
    expect(result).not.toContain(' a ');
    expect(result).not.toContain('for');
  });

  it('returns at most 6 keywords', () => {
    const text = 'Real-time collaborative whiteboard\n\nA SaaS platform for remote teams to brainstorm visually together in real time';
    const result = extractSearchKeywords(text);
    expect(result.split(' ').length).toBeLessThanOrEqual(6);
  });

  it('handles text without description', () => {
    const text = 'AI content moderation platform';
    const result = extractSearchKeywords(text);
    expect(result).toBeTruthy();
    expect(result.split(' ').length).toBeGreaterThan(0);
  });
});
