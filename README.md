# Spogtan

**S**et **P**arameters **O**nce, **G**et **T**hem **A**s **N**eeded

Spogtan is a typed, terse and reusable configuration library that can generate any config you like.

- Never write repetitive YAML or JSON configs again
- Create customisable and reusable components in a jiffy
- Catch errors as you type them thanks to Typescript
- No need to write and test bespoke code to generate your configs

## Example

```Typescript
import { spogtan } from 'spogtan';

type Genre = 'action' | 'romance' | 'sci-fi' | 'adventure' | 'horror' | 'comedy';
type Award = 'oscar' | 'bafta' | 'aacta';

// Define interfaces for your final config's output
interface Movie {
  id: string;
  title: string;
  tag_line: string | null;
  summary: string;
  genre: Genre;
  awards: Award[];
}
interface Config {
  movies: Movie[];
}

// Define what parameters your config can take
interface Parameters {
  title: string;
  tag_line: string | null;
  summary: string;
  genre: Genre;
  awards: Award[];
}

// Initialise Spogtan with your Parameters type
const $ = spogtan<Parameters>();

// Create a reusable $movie object which is constructed based on the available Parameters
const $movie = $.wrap<Movie>(
  $.with(
    // You can specify defaults to make some parameters optional
    $.defaults({
      tag_line: null,
      awards: [],
    }),
    {
      // $.get() will look up the given parameter later, at evaluation time
      title: $.get('title'),
      genre: $.get('genre'),
      tag_line: $.get('tag_line'),
      awards: $.get('awards'),
      // You can automatically generate parameter values based on other parameters
      // Any function-valued parameters will be called later, at evaluation time
      id: () =>
        // $() will look up and evaluate the given parameter,
        // returning concrete data that you can manipulate with code
        $('title')
          .toLowerCase()
          .replace(/[^\w]+/g, '-'),
      // $.template lets you substitute concrete parameter values into strings with ease
      summary: $.template`${'title'} (${'genre'})`,
    },
  ),
);

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

const oscar_sci_fis = $.with(
  {
    genre: 'sci-fi',
    awards: ['oscar'],
  },
  [
    $movie({
      title: 'Interstellar',
      tag_line: 'The end of Earth will not be the end of us.',
      // You can expand on inherited values
      awards: (inherited) => (inherited ?? []).concat('bafta'),
    }),
    $movie({
      title: 'Ex Machina',
      tag_line: 'What happens to me if I fail your test?',
    }),
  ],
);

// Make your spogtan config concrete by evaluating it.
// Evaluate will unravel the given types and return the concrete type.
const config: Config = spogtan.evaluate({
  // When evaluate is called, merge will concatenate lists and strings or combine objects after evaluating them
  movies: spogtan.merge(comedies, oscar_sci_fis),
});

// Then do whatever it is you need to do with your config
console.log(inspect(config, { depth: null }));

/*
{
  movies: [
    {
      title: 'Four Weddings and Funeral',
      genre: 'comedy',
      tag_line: 'Five good reasons to stay single',
      awards: [],
      id: 'four-weddings-and-funeral',
      summary: 'Four Weddings and Funeral (comedy)'
    },
    {
      title: 'Bridesmaids',
      genre: 'comedy',
      tag_line: null,
      awards: [],
      id: 'bridesmaids',
      summary: 'Bridesmaids (comedy)'
    },
    {
      title: 'Interstellar',
      genre: 'sci-fi',
      tag_line: 'The end of Earth will not be the end of us.',
      awards: [ 'oscar', 'bafta' ],
      id: 'interstellar',
      summary: 'Interstellar (sci-fi)'
    },
    {
      title: 'Ex Machina',
      genre: 'sci-fi',
      tag_line: 'What happens to me if I fail your test?',
      awards: [ 'oscar' ],
      id: 'ex-machina',
      summary: 'Ex Machina (sci-fi)'
    }
  ]
}
*/
```
