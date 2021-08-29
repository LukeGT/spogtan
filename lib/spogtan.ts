import * as util from 'util';

// A LateValue is a function that defines how to construct a value at a later time, when `evaluate` is called.
// If the function has an argument, the value that this parameter would have if the late value were not
// specified is passed in. In this way you can modify values higher in the stack.
type LateValue<T> = (inherited?: T) => Evaluable<T>;
// An Evaluable value is one that can be evaluated by being passed to the `evaluate` function.
// It can be a nested structure of arrays and objects with any values replaceable with LateValues.
type Evaluable<T> =
  | T
  | LateValue<T>
  | { [key in keyof T]: Evaluable<T[key]> }
  | (T extends Array<infer V> ? Evaluable<V>[] : never);
// Unravels a deep Evaluable object, returning the concrete object it represents.
type Evaluated<T> = T extends LateValue<infer U>
  ? Evaluated<U>
  : T extends Array<infer U>
  ? Array<Evaluated<U>>
  : // Only recurse on Objects, not primitive types
  T extends Record<string, unknown> & { [key in infer K]: unknown }
  ? { [key in K]: Evaluated<T[key]> }
  : T;

// A Frame contains a set of Parameters which are pushed onto the stack.
// These values can be pulled out with calls to `get`.
type Frame<Parameters> = {
  [Param in keyof Parameters]?: Evaluable<Parameters[Param]> | Default<Parameters[Param]> | undefined;
};

// Wraps an Evaluable that will only be returned if there is no value set higher up in the Frame stack already.
class Default<T> {
  constructor(public value: Evaluable<T>) {}
}

// Contains a stack of Frames and provides methods to get, set and manipulate FrameValues.
// Parameters should be set to an interface which represents the keys and values that can
// be set within Frames.
export class Spogtan<Parameters> extends Function {
  private stack: Frame<Parameters>[] = [];

  constructor() {
    super();
    // Make the Spogtan object callable for easy access to get_evaluated.
    // This method is used in templates and affords the biggest readability improvement if made terse.
    const $ = this.get_evaluated.bind(this);
    Object.setPrototypeOf($, this);
    return $ as Spogtan<Parameters> & Spogtan<Parameters>['get_evaluated'];
  }

  // Wraps a default value
  default<T>(value: Evaluable<T>): Default<T> {
    return new Default<T>(value);
  }

  // Wraps all values within a Frame as default values. This is useful when using wrap(), so that you can
  // specify several defaults at once.
  defaults(frame: Frame<Parameters>): Frame<Parameters> {
    const default_entries = Object.entries(frame).map(([key, value]) => [key, this.default(value)]);
    return Object.fromEntries(default_entries) as Frame<Parameters>;
  }

  // Ensures that when `value` is evaluated, the given `frame`'s parameters are available in the stack.
  with<T>(frame: Frame<Parameters>, value: T) {
    return (): Evaluated<T> => {
      this.stack.push(frame);
      const return_value = evaluate(value);
      this.stack.pop();
      return return_value;
    };
  }

  // Allows a user to apply their own `frame` of parameters to a given value. This is useful for creating a reusable value.
  wrap<T>(value: Evaluable<T>) {
    return (frame: Frame<Parameters> = {}): (() => Evaluated<Evaluable<T>>) => this.with(frame, value);
  }

  // Returns an Evaluable which, When evaluated, will return the value of the given `parameter`.
  get<Param extends keyof Parameters>(parameter: Param): () => Evaluable<Parameters[Param]>;
  get<Param extends keyof Parameters>(
    parameter: Param,
    required: boolean,
  ): () => Evaluable<Parameters[Param]> | undefined;
  get<Param extends keyof Parameters>(
    parameter: Param,
    required = true,
  ): () => Evaluable<Parameters[Param]> | undefined {
    // undefined is added to the return type because Typescript can't tell that
    // undefined is only returned when Parameters[Param] extends undefined.
    return (): Evaluable<Parameters[Param]> | undefined => {
      if (this.stack.length === 0) {
        throw new Error(
          'Tried to get a parameter outside of an evaluation. ' +
            'Did you forget to wrap a $() inside a () =>, or try to use $() inside a $template``?',
        );
      }

      let value: Evaluable<Parameters[Param]> | undefined = undefined;

      for (const frame of this.stack) {
        const frame_value = frame[parameter] as Evaluable<Parameters[Param]>;
        if (frame_value === undefined) continue;

        if (frame_value instanceof Default) {
          if (value === undefined) {
            value = frame_value.value;
          }
        } else if (frame_value instanceof Function && frame_value.length === 1 && value !== undefined) {
          value = frame_value(evaluate(value) as Parameters[Param]);
        } else {
          value = frame_value;
        }
      }

      if (value === undefined && required) {
        throw new Error(
          `Missing required parameter ${parameter}. Current stack: ${util.inspect(this.stack, { depth: null })}`,
        );
      }
      return value;
    };
  }

  // Evaluates and returns the value of the given `parameter`.
  // Be sure not to call this method early, it should only be called from within a function that is later evaluated.
  get_evaluated<Param extends keyof Parameters>(parameter: Param): Parameters[Param];
  get_evaluated<Param extends keyof Parameters>(parameter: Param, required = true): Parameters[Param] | undefined {
    return evaluate(this.get(parameter, required)) as Parameters[Param];
  }

  // An ES6 template string which takes in parameter names and returns evaluated parameter values when evaluated.
  // E.g. $.template`This is the value of parameter a: ${'a'}`
  template(strings: readonly string[], ...parameters: (keyof Parameters | '_inherited')[]) {
    return (inherited?: unknown): string => {
      const parts = [];
      for (let p = 0; p < parameters.length; ++p) {
        const parameter = parameters[p];
        parts.push(strings[p]);
        if (parameter === '_inherited') {
          parts.push(inherited);
        } else {
          parts.push(this.get_evaluated(parameter));
        }
      }
      parts.push(strings[strings.length - 1]);
      return parts.join('');
    };
  }
}

// Recursively evaluates an Evaluable, making everything within `value` concrete.
export function evaluate<Evaluable>(value: Evaluable): Evaluated<Evaluable> {
  if (value instanceof Function) {
    return evaluate(value());
  } else if (value instanceof Array) {
    return value.map(evaluate) as Evaluated<Evaluable>;
  } else if (value instanceof Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [key, evaluate(value)]),
    ) as Evaluated<Evaluable>;
  } else {
    return value as Evaluated<Evaluable>;
  }
}

// Returns a late value of merged `items`.
// Merging for strings and lists means concatenation,
// and for objects it means combining entries, with later entries taking precedence.
export function merge(...items: Evaluable<string>[]): () => string;
export function merge<T>(...items: Evaluable<T[]>[]): () => Evaluated<T>[];
export function merge<T>(...items: Evaluable<Record<string, T>>[]): () => Record<string, Evaluated<T>>;
export function merge<T>(...items: Evaluable<string | T[] | Record<string, T>>[]) {
  return (): string | Evaluated<T>[] | Record<string, Evaluated<T>> => {
    const evaluated_items = evaluate(items);
    const first_item = evaluated_items[0];
    if (typeof first_item === 'string') {
      return evaluated_items.join('');
    } else if (first_item instanceof Array) {
      return evaluated_items.flat() as Evaluated<T>[];
    } else if (first_item instanceof Object) {
      return Object.fromEntries(
        (evaluated_items as Record<string, T>[]).map((item: Record<string, T>) => Object.entries(item)).flat(),
      ) as Record<string, Evaluated<T>>;
    } else {
      throw new Error(
        `Can't merge values of type ${evaluated_items[0].constructor.name}, must be a string, array or object.`,
      );
    }
  };
}
