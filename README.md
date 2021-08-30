# Spogtan

**S**et **P**arameters **O**nce, **G**et **T**hem **A**s **N**eeded

Spogtan is a typed, terse and reusable configuration library that can generate any config you like.

- Never write repetitive YAML or JSON configs again
- Create customisable and reusable components in a jiffy
- Catch errors as you type them thanks to Typescript
- No need to write and test bespoke code to generate your configs

## The basic idea

Spogtan lets you set the value of a parameter for multiple objects at the same time.

```Typescript
// $.with takes a `Frame` of parameters and makes them available to the object passed in
const comedies = $.with(
  {
    // This genre applies to all movies below
    genre: 'comedy',
  },
  [
    $movie({
      title: 'Four Weddings and a Funeral',
      year: 1994,
    }),
    $movie({
      title: 'Bridesmaids',
      year: 2011,
    }),
  ],
);
```

To make this work, objects are built using "late values", which are just functions that build a value later.

```Typescript
const $movie = $.wrap({
  // These values are pulled from the parameters in scope at evaluation time
  title: $.get('title'),  // This is equivalent to () => $('title')
  year: $.get('year'),
  genre: $.get('genre'),
  // The id is constructed based on the title and year Parameters
  id: () =>
    [
      $('title')
        .toLowerCase()
        .replace(/[^\w]+/g, '-'),
      $('year'),
    ].join('-'),
})
```

Calling `spogtan.evaluate` will recursively call all late values and return a concrete object.

```Typescript
console.log(spogtan.evaluate(comedies));
/*
[
  {
    title: 'Four Weddings and a Funeral',
    year: 1994,
    genre: 'comedy',
    id: 'four-weddings-and-a-funeral-1994',
  },
  {
    title: 'Bridesmaids',
    year: 2011,
    genre: 'comedy',
    id: 'bridesmaids-2011',
  },
]
*/
```

For more in-depth examples, see the [examples folder](https://github.com/LukeGT/spogtan/tree/main/examples).
