# Spogtan

**S**et **P**arameters **O**nce, **G**et **T**hem **A**s **N**eeded

Spogtan is a typed, terse and reusable configuration library that can generate any config you like.

- Never write repetitive YAML or JSON configs again
- Create customisable and reusable components in a jiffy
- Catch errors as you type them thanks to Typescript
- No need to write and test bespoke code to generate your configs

## The basic idea

For more in-depth examples, see the [examples folder](https://github.com/LukeGT/spogtan/tree/main/examples).

```Typescript
const comedies = $.with(
  {
    // This genre applies to all movies below
    genre: 'comedy',
  },
  [
    $movie({
      title: 'Four Weddings and Funeral',
      tag_line: 'Five good reasons to stay single',
    }),
    $movie({
      title: 'Bridesmaids',
    }),
  ],
);
```
