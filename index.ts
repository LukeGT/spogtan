import * as spogtan_lib from './lib/spogtan';

// Constructs a Spogtan object, and gives it the right type.
export function spogtan<Parameters>(): spogtan_lib.Spogtan<Parameters> &
  spogtan_lib.Spogtan<Parameters>['get_evaluated'] {
  return new spogtan_lib.Spogtan<Parameters>() as spogtan_lib.Spogtan<Parameters> &
    spogtan_lib.Spogtan<Parameters>['get_evaluated'];
}
spogtan.evaluate = spogtan_lib.evaluate;
spogtan.merge = spogtan_lib.merge;

export const evaluate = spogtan_lib.evaluate;
export const merge = spogtan_lib.merge;
