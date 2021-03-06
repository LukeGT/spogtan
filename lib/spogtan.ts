import * as util from 'util';

// A LateValue is a function that defines how to construct a value at a later time, when `evaluate` is called.
type LateValue<T> = () => Evaluable<T>;
// An InheritedOp modifies the next highest value for a parameter in the stack.
type InheritedOp<T> = (inherited: T | undefined) => Evaluable<T>;
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
  [Param in keyof Parameters]?: FrameValue<Parameters[Param]>;
};
type FrameValue<T> = Evaluable<T> | InheritedOp<T>;

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

  // Creates an InheritedOp which only sets the given value if there's no inherited value
  default<T>(value: Evaluable<T>): InheritedOp<T> {
    return (inherited) => (inherited === undefined ? value : inherited);
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
    return (frame: Frame<Parameters> = {}): (() => Evaluated<T>) => this.with(frame, value) as () => Evaluated<T>;
  }

  // A helper for creating a wrapped evaluable with a frame of defaults
  wrap_with_defaults<T>(
    defaults: Frame<Parameters>,
    value: Evaluable<T>,
  ): (frame?: Frame<Parameters>) => () => Evaluated<T> {
    return this.wrap(this.with(this.defaults(defaults), value) as Evaluable<T>);
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
        if (!(parameter in frame)) continue;
        const frame_value = frame[parameter] as FrameValue<Parameters[Param]>;

        if (frame_value instanceof Function && frame_value.length === 1) {
          value = frame_value(evaluate(value) as Parameters[Param] | undefined);
        } else {
          value = frame_value as Evaluable<Parameters[Param]>;
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
  get_evaluated<Param extends keyof Parameters>(parameter: Param, required: true): Parameters[Param];
  get_evaluated<Param extends keyof Parameters>(parameter: Param, required: false): Parameters[Param] | undefined;
  get_evaluated<Param extends keyof Parameters>(parameter: Param, required = true): Parameters[Param] | undefined {
    return evaluate(this.get(parameter, required)) as Parameters[Param];
  }

  // Constructs an object with a key for each parameter in `parameters`, where the value is $.get() for that parameter.
  // `extra_object` can be passed to define other properties of the final object. It keys are merged into the $.get()
  // object, taking precedence if there's a key clash.
  objectify<
    Param extends keyof Parameters,
    Return extends {
      [key in Param]: Evaluable<key extends Param ? Parameters[key] : unknown>;
    },
  >(parameters: Param[]): Return;
  objectify<
    Param extends keyof Parameters,
    Extra extends Record<string, unknown>,
    Return extends {
      [key in Param | keyof Extra]: key extends keyof Extra
        ? Extra[key]
        : Evaluable<key extends Param ? Parameters[key] : unknown>;
    },
  >(parameters: Param[], extra_object: Extra): Return;
  objectify<
    Param extends keyof Parameters,
    Extra extends Record<string, unknown>,
    Return extends {
      [key in Param | keyof Extra]: key extends keyof Extra
        ? Extra[key]
        : Evaluable<key extends Param ? Parameters[key] : unknown>;
    },
  >(parameters: Param[], extra_object: Extra = {} as Extra): Return {
    const parameter_entries = parameters.map((parameter) => [parameter, this.get(parameter)]) as [
      Param,
      Evaluable<unknown>,
    ][];
    const extra_entries = Object.entries(extra_object) as [keyof Extra, unknown][];
    return Object.fromEntries(
      ([] as [Param | keyof Extra, unknown][]).concat(parameter_entries, extra_entries),
    ) as Return;
  }

  // An ES6 template string which takes in parameter names and returns evaluated parameter values when evaluated.
  // E.g. $.template`This is the value of parameter a: ${'a'}`
  template(strings: readonly string[], ...parameters: (keyof Parameters | '$inherited')[]) {
    return (inherited?: unknown): string => {
      const parts = [];
      for (let p = 0; p < parameters.length; ++p) {
        const parameter = parameters[p];
        parts.push(strings[p]);
        const evaluated = parameter === '$inherited' ? inherited : this.get_evaluated(parameter);
        if (evaluated === null) {
          // String.join() returns empty string for null
          parts.push('null');
        } else {
          parts.push(evaluated);
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
export function merge<Value extends string | InnerValue[] | Record<string, InnerValue>, InnerValue>(
  ...items: Evaluable<Value>[]
) {
  return (inherited?: Evaluated<Value>): Evaluated<Value> => {
    const evaluated_items = (inherited !== undefined ? [inherited] : []).concat(evaluate(items) as Evaluated<Value>[]);
    const first_item = evaluated_items[0];
    if (typeof first_item === 'string') {
      return evaluated_items.join('') as Evaluated<Value>;
    } else if (first_item instanceof Array) {
      return evaluated_items.flat() as Evaluated<Value>;
    } else if (typeof first_item === 'object') {
      return Object.fromEntries(
        (evaluated_items as Record<string, InnerValue>[]).map((item) => Object.entries(item)).flat(),
      ) as Evaluated<Value>;
    } else {
      throw new Error(
        `Can't merge values of type ${evaluated_items[0].constructor.name}, must be a string, array or object.`,
      );
    }
  };
}
