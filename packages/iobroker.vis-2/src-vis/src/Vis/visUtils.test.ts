import { describe, expect, it } from 'vitest';

import {
    addClass,
    extractBinding,
    isIdAttribute,
    isIdValue,
    isLocalStateId,
    parseDimension,
    removeClass,
} from './visUtils';

describe('addClass', () => {
    it('appends a class and keeps the order', () => {
        expect(addClass('a b', 'c')).toBe('a b c');
    });

    it('does not add a class twice', () => {
        expect(addClass('a b', 'b')).toBe('a b');
    });

    it('normalises the spacing of what was already there', () => {
        expect(addClass('  a   b  ', 'c')).toBe('a b c');
    });

    it('copes with an empty class and with nothing to add', () => {
        expect(addClass('', 'c')).toBe('c');
        expect(addClass('a', undefined)).toBe('a');
        expect(addClass('', undefined)).toBe('');
    });
});

describe('removeClass', () => {
    it('removes the class it is given', () => {
        expect(removeClass('a b c', 'b')).toBe('a c');
    });

    it('leaves the rest alone when the class is not there', () => {
        expect(removeClass('a b', 'x')).toBe('a b');
    });

    it('removes only the first of a repeated class', () => {
        // `indexOf` plus `splice` is what the function does; written down so a change to it is noticed
        expect(removeClass('a b a', 'a')).toBe('b a');
    });

    it('returns an empty class for an empty class', () => {
        expect(removeClass('', 'a')).toBe('');
    });
});

describe('parseDimension', () => {
    it('splits a length into number and unit', () => {
        expect(parseDimension('12px')).toEqual({ value: 12, dimension: 'px' });
        expect(parseDimension('50%')).toEqual({ value: 50, dimension: '%' });
        expect(parseDimension('2em')).toEqual({ value: 2, dimension: 'em' });
    });

    it('takes px as the unit when none is written', () => {
        expect(parseDimension('42')).toEqual({ value: 42, dimension: 'px' });
        expect(parseDimension(42)).toEqual({ value: 42, dimension: 'px' });
    });

    it('keeps the sign', () => {
        expect(parseDimension('-8px')).toEqual({ value: -8, dimension: 'px' });
    });

    it('falls back to zero for what is not a length', () => {
        expect(parseDimension('calc(100% - 4px)')).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension('')).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension(null)).toEqual({ value: 0, dimension: 'px' });
        expect(parseDimension(undefined)).toEqual({ value: 0, dimension: 'px' });
    });
});

describe('isLocalStateId', () => {
    it('knows a local state by its prefix', () => {
        expect(isLocalStateId('local_something')).toBe(true);
        expect(isLocalStateId('vis-2.0.control.instance')).toBe(false);
    });
});

describe('isIdAttribute', () => {
    it('takes every attribute whose name ends in oid', () => {
        expect(isIdAttribute('oid')).toBe(true);
        expect(isIdAttribute('oid1')).toBe(true);
        expect(isIdAttribute('table_oid')).toBe(true);
        expect(isIdAttribute('signals-oid-0')).toBe(true);
    });

    it('does not take an attribute that only holds text', () => {
        expect(isIdAttribute('html_prepend')).toBe(false);
        expect(isIdAttribute('ticks')).toBe(false);
    });

    it('takes a react field that says it is an id', () => {
        const info = { detailed: { name: 'detailed', type: 'id' as const } };
        expect(isIdAttribute('detailed', info)).toBe(true);
        expect(isIdAttribute('detailed1', info)).toBe(true);
    });

    it('leaves out an id field that asks not to be subscribed', () => {
        const info = { detailed: { name: 'detailed', type: 'id' as const, noSubscribe: true } };
        expect(isIdAttribute('detailed', info)).toBe(false);
    });
});

describe('isIdValue', () => {
    it('takes a value that is shaped like a state id', () => {
        expect(isIdValue('hm-rpc.0.ABC0000000.1.STATE')).toBe(true);
        expect(isIdValue('system.adapter.vis-2.0.alive')).toBe(true);
    });

    it('leaves out what only looks like one', () => {
        // fewer than three parts: a number and a path would be subscribed for nothing
        expect(isIdValue('12.5')).toBe(false);
        expect(isIdValue('img/logo.png')).toBe(false);
        expect(isIdValue('')).toBe(false);
        expect(isIdValue(42)).toBe(false);
        expect(isIdValue(null)).toBe(false);
    });

    it('leaves out the characters the js-controller refuses in an id', () => {
        expect(isIdValue('a.b.c[0]')).toBe(false);
        expect(isIdValue('a.b."c"')).toBe(false);
        expect(isIdValue('a.b.c*')).toBe(false);
    });

    it('leaves out a value that is far too long to be an id', () => {
        expect(isIdValue(`a.b.${'x'.repeat(300)}`)).toBe(false);
    });
});

describe('extractBinding', () => {
    it('finds nothing in a text without a binding', () => {
        expect(extractBinding('just text')).toBe(null);
        expect(extractBinding('')).toBe(null);
    });

    it('reads a plain binding', () => {
        const bindings = extractBinding('{hm-rpc.0.device.STATE}');
        expect(bindings).toHaveLength(1);
        expect(bindings![0].systemOid).toBe('hm-rpc.0.device.STATE');
        expect(bindings![0].visOid).toBe('hm-rpc.0.device.STATE.val');
        expect(bindings![0].token).toBe('{hm-rpc.0.device.STATE}');
    });

    it('keeps the part of the state that was asked for', () => {
        const bindings = extractBinding('{hm-rpc.0.device.STATE.ts}');
        expect(bindings![0].systemOid).toBe('hm-rpc.0.device.STATE');
        expect(bindings![0].visOid).toBe('hm-rpc.0.device.STATE.ts');
    });

    it('reads every binding of a text', () => {
        const bindings = extractBinding('{a.b.c} und {d.e.f}');
        expect(bindings).toHaveLength(2);
        expect(bindings!.map(b => b.systemOid)).toEqual(['a.b.c', 'd.e.f']);
    });

    it('reads the operations behind the semicolons', () => {
        // the argument of an operation goes in brackets, see the "Bindings" chapter of the README
        const bindings = extractBinding('{a.b.c;*(2);+(1)}');
        expect(bindings![0].systemOid).toBe('a.b.c');
        expect(bindings![0].operations?.map(operation => operation.op)).toEqual(['*', '+']);
        // the argument of an arithmetic operation arrives as a number, not as the text it was written as
        expect(bindings![0].operations?.[0].arg).toBe(2);
    });

    it('reads an operation that takes no argument', () => {
        const bindings = extractBinding('{a.b.c;round}');
        expect(bindings![0].operations?.map(operation => operation.op)).toEqual(['round']);
    });

    it('reads an operation whose argument is a path', () => {
        const bindings = extractBinding('{a.b.c;json(common.name.en)}');
        expect(bindings![0].operations?.[0].op).toBe('json');
        // a path is kept as one piece; only the operations that really take a list get one
        expect(bindings![0].operations?.[0].arg).toBe('common.name.en');
    });

    it('stops at fifty bindings in one text', () => {
        const many = Array.from({ length: 60 }, (_, index) => `{a.b.c${index}}`).join(' ');
        expect(extractBinding(many)).toHaveLength(50);
    });
});
