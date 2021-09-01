import { spogtan } from './index';

interface Parameters {
  string: string;
  number: number;
  boolean: boolean;
  bigint: bigint;
  symbol: symbol;
  nullable: string | null;
  optional: string | undefined;
  object: Partial<Parameters>;
  array: Partial<Parameters>[];
}

test('simple values', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: 'string',
      number: 42,
      boolean: true,
      bigint: 42n,
      symbol: Symbol('symbol'),
      nullable: null,
      optional: undefined,
    },
    $.objectify(['string', 'number', 'boolean', 'bigint', 'symbol', 'nullable'], {
      optional: $.get('optional', false),
    }),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('deep value', () => {
  const $ = spogtan<Parameters>();
  const values = $.with({ string: 'string' }, () => ({
    array: () => [
      () => ({
        string: $.get('string'),
      }),
    ],
  }));
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('deep frame value', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: 'string',
      object: () => ({
        array: () => [
          () => ({
            string: $.get('string'),
          }),
        ],
      }),
    },
    $.get('object'),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('simple defaults', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    $.defaults({
      string: 'string',
      number: 42,
      boolean: true,
      bigint: 42n,
      symbol: Symbol('symbol'),
      nullable: null,
      optional: undefined,
    }),
    $.objectify(['string', 'number', 'boolean', 'bigint', 'symbol', 'nullable'], {
      optional: $.get('optional', false),
    }),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('inner defaults are overridden', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    $.defaults({
      string: 'better string',
      number: 43,
      boolean: false,
      bigint: 43n,
      symbol: Symbol('better symbol'),
      nullable: 'not null',
      optional: 'not undefined',
    }),
    $.with(
      $.defaults({
        string: 'string',
        number: 42,
        boolean: true,
        bigint: 42n,
        symbol: Symbol('symbol'),
        nullable: null,
        optional: undefined,
      }),
      $.objectify(['string', 'number', 'boolean', 'bigint', 'symbol', 'nullable'], {
        optional: $.get('optional', false),
      }),
    ),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('InheritedOp works', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    $.defaults({
      string: 'string',
      number: 42,
      boolean: true,
      bigint: 42n,
      symbol: Symbol('symbol'),
      nullable: null,
      optional: undefined,
    }),
    $.with(
      {
        string: (string) => string + '?!',
        number: (number) => (number ?? 0) + 1,
        boolean: (boolean) => !boolean,
        bigint: (bigint) => (bigint ?? 0n) + 1n,
        symbol: (symbol) => (symbol ? Symbol(symbol.toString() + '?!') : Symbol('?!')),
        nullable: (nullable) => nullable ?? 'nullable',
        optional: (optional) => optional ?? 'optional',
      },
      $.objectify(['string', 'number', 'boolean', 'bigint', 'symbol', 'nullable'], {
        optional: $.get('optional', false),
      }),
    ),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('valid merges', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: 'string',
      array: [{ number: 1 }],
      object: {
        number: 1,
      },
    },
    $.with(
      {
        string: spogtan.merge('?!'),
        array: spogtan.merge([{ number: 2 }]),
        object: spogtan.merge({ string: '2' }),
      },
      $.objectify(['string', 'array', 'object']),
    ),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('empty merges', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: spogtan.merge('?!'),
      array: spogtan.merge([{ number: 2 }]),
      object: spogtan.merge({ string: '2' }),
    },
    $.objectify(['string', 'array', 'object']),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('template string', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: 'string',
      number: 42,
      boolean: true,
      bigint: 42n,
      nullable: null,
      optional: 'optional',
    },
    $.template`${'string'} ${'number'} ${'boolean'} ${'bigint'} ${'nullable'} ${'optional'}`,
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});

test('template string inherited', () => {
  const $ = spogtan<Parameters>();
  const values = $.with(
    {
      string: 'string',
      nullable: null,
      optional: 'optional',
    },
    $.with(
      {
        string: $.template`${'$inherited'}?!`,
        nullable: $.template`${'$inherited'}?!`,
        optional: $.template`${'$inherited'}?!`,
      },
      $.objectify(['string', 'nullable'], {
        optional: $.get('optional', false),
      }),
    ),
  );
  expect(spogtan.evaluate(values)).toMatchSnapshot();
});
