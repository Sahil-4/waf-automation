import { describe, it, expect, vi } from 'vitest';
import { RuntimeContext } from './context';
import { Logger } from './logger';
import type { WafConfig } from './index';

function makeConfig(variables?: Record<string, string>): WafConfig {
  return {
    name: 'test',
    browser: { headless: true },
    variables,
    steps: [],
  };
}

describe('RuntimeContext', () => {
  it('set/get roundtrip', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('foo', 'bar');
    expect(ctx.get('foo')).toBe('bar');
  });

  it('get returns undefined for an unset key', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    expect(ctx.get('missing')).toBeUndefined();
  });

  it('all() returns a snapshot of every stored key', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('a', 1);
    ctx.set('b', 'two');
    expect(ctx.all()).toEqual({ a: 1, b: 'two' });
  });

  it('constructor merges config.variables into the store', () => {
    const ctx = new RuntimeContext(
      makeConfig({ pageCounter: '1', outputDir: './output' }),
      new Logger(),
    );
    expect(ctx.all()).toEqual({ pageCounter: '1', outputDir: './output' });
  });

  it('constructor works with no variables field at all', () => {
    const ctx = new RuntimeContext(makeConfig(undefined), new Logger());
    expect(ctx.all()).toEqual({});
  });

  it('interpolates a string value', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('name', 'world');
    expect(ctx.interpolate('hello {{ctx.name}}')).toBe('hello world');
  });

  it('interpolates a number value', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('count', 5);
    expect(ctx.interpolate('count: {{ctx.count}}')).toBe('count: 5');
  });

  it('interpolates a boolean value', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('flag', true);
    expect(ctx.interpolate('flag: {{ctx.flag}}')).toBe('flag: true');
  });

  it('interpolates an object/array value as JSON', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('items', [{ title: 'a' }, { title: 'b' }]);
    expect(ctx.interpolate('{{ctx.items}}')).toBe('[{"title":"a"},{"title":"b"}]');
  });

  it('interpolates null and undefined as an empty string', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('nullVal', null);
    ctx.set('undefinedVal', undefined);
    expect(ctx.interpolate('[{{ctx.nullVal}}]')).toBe('[]');
    expect(ctx.interpolate('[{{ctx.undefinedVal}}]')).toBe('[]');
  });

  it('leaves an unresolved token as-is and warns', () => {
    const logger = new Logger();
    const warnSpy = vi.spyOn(logger, 'warn');
    const ctx = new RuntimeContext(makeConfig(), logger);
    expect(ctx.interpolate('{{ctx.missing}}')).toBe('{{ctx.missing}}');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('{{ctx.missing}}'));
  });

  it('interpolates multiple tokens in one string', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    ctx.set('a', 'foo');
    ctx.set('b', 'bar');
    expect(ctx.interpolate('{{ctx.a}}-{{ctx.b}}')).toBe('foo-bar');
  });

  it('passes through a string with no tokens unchanged', () => {
    const ctx = new RuntimeContext(makeConfig(), new Logger());
    expect(ctx.interpolate('no tokens here')).toBe('no tokens here');
  });
});
