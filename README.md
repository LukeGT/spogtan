# Spogtan

**S**et **P**arameters **O**nce, **G**et **T**hem **A**s **N**eeded

Spogtan is a typed, terse and reusable configuration library that can generate any config you like.

- Never write repetitive YAML or JSON configs again
- Create customisable and reusable components in a jiffy
- Catch errors and get clever completions as you type, thanks to Typescript
- No need to write and test bespoke code to generate your configs

## The basic idea

Spogtan lets you set the value of a parameter for multiple objects at the same time.

```Typescript
// $.with takes a `Frame` of parameters and makes them available to the given object.
const sci_fis = $.with(
  {
    // This genre applies to all movies below
    genre: 'sci-fi',
  },
  [
    // Each movie accepts a `Frame` of parameters too
    $movie({
      title: 'Inception',
      year: 2010,
    }),
    $movie({
      title: 'Ex Machina',
      year: 2014,
    }),
  ],
);
```

To make this work, objects are built using "late values", which are just functions that build a value later.

```Typescript
// $.wrap allows our $movie to accept a `Frame` of parameters as input.
const $movie = $.wrap<Movie>({
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
console.log(spogtan.evaluate(sci_fis));
/*
[
  {
    title: 'Inception',
    year: 2010,
    genre: 'sci-fi',
    id: 'inception-2010',
  },
  {
    title: 'Ex Machina',
    year: 2014,
    genre: 'sci-fi',
    id: 'ex-machina-2014',
  },
]
*/
```

For more in-depth examples, see the [examples folder](https://github.com/LukeGT/spogtan/tree/main/examples).

## Concepts

### Parameters

`Parameters` live in a global and flat namespace that can be typed with Typescript.

```Typescript
// Define what parameters your config can take
interface Parameters {
  id: string;
  title: string;
  year: number;
  genre: Genre;
}
type Genre = 'action' | 'romance' | 'sci-fi' | 'adventure' | 'horror' | 'comedy';

// Initialise Spogtan with your Parameters type
const $ = spogtan<Parameters>();
```

Parameter values can also be deeply nested arrays and objects.

```Typescript
interface Parameters {
  ...
  actors: Actor[];
}

interface Actor {
  name: string;
  birthday: Date;
}
```

#### Parameter Frames

You specify values for `Parameters` by constructing parameter `Frame`s. A parameter `Frame` is a subset of `Parameters`
where the values can be:

- A concrete value
- A [Default Value](#default-values)
- An operation on an [Inherited Value](#inherited-values)
- An [Evaluable Object](#evaluable-objects)

```Typescript
{
  title: 'Looper',  // Concrete value
  year: $.default(2021),  // Default value
  id: () => [$('title'), $('year')].join('-'),  // Evaluable object (late value)
  // Operation on an inherited value
  actors: spogtan.merge([
    // Evaluable object (deeply nested)
    {
      name: 'Jennifer Aniston',
      birthday: () => new Date(Date.now() - 24 * YEARS),
    },
  ]),
}
```

#### Applying Parameters

`Parameters` are applied to [Evaluable Objects](#evaluable-objects) by calling `$.with`, which accepts a
[Parameter Frame](#parameter-frame) as its first argument and an [Evaluable Object](#evaluable-object) as its second.

```Typescript
$.with(
  { title: '2001: A Space Odyssey' },
  $.get('title'),  // Evaluates to '2001: A Space Odyssey'
)
```

`$.with` itself is a special kind of [Evaluable Object](#evaluable-object), so you can nest them within each other.

```Typescript
$.with(
  { genre: 'sci-fi' },  // Applied to all movies
  [
    $.with(
      { year: 2011 },  // Applied to In Time and Source Code
      [
        $movie({ title: 'In Time' }),
        $movie({ title: 'Source Code' }),
      ],
    ),
    $.with(
      { year: 2014 },  // Applied to Interstellar and Ex Machina
      [
        $movie({ title: 'Interstellar' }),
        $movie({ title: 'Ex Machina' }),
      ],
    ),
  ],
)
```

You can also set `$.with` as a parameter value.

```Typescript
$.with(
  {
    url: $.template`https://${'domain'}/${'path'}`,
    path: 'movies/',
    prod: $.with({ domain: 'website.com' }, $.get('url')),
    staging: $.with({ domain: 'staging.website.com' }, $.get('url')),
  },
  [
    $.get('prod'),  // https://website.com/movies/
    $.get('staging'),  // https://staging.website.com/movies/
  ]
)
```

#### Wrapped Objects

A wrapped object lets you easily reuse a given [Evaluable Object](#evaluable-object) with a different
[Parameter Frame](#parameter-frames) applied to it each time.

```Typescript
// This is equivalent to:
// $movie = (frame) => $.with(frame, {...})
const $movie = $.wrap<Movie>({
  title: $.get('title'),
  genre: $.get('genre'),
  year: $.get('year'),
});

const sci_fis = $.with(
  {
    genre: 'sci-fi',
  },
  [
    // Each movie accepts a `Frame` of parameters which are applied to the $movie's evaluable object
    $movie({
      title: 'Inception',
      year: 2010,
    }),
    $movie({
      title: 'Ex Machina',
      year: 2014,
    }),
  ],
);
```

#### Default Values

#### Inherited Values

### Late Values

A late value is just a function with no arguments that returns a value later, once called.

#### Evaluable Objects

#### Merging Values

#### Template Strings
