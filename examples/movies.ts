import { inspect } from 'util';
import { spogtan } from '../dist';

type Genre = 'action' | 'romance' | 'sci-fi' | 'adventure' | 'horror' | 'comedy';
type Award = 'oscar' | 'bafta' | 'aacta';

// Define what parameters your config can take
interface Parameters {
  title: string;
  tag_line: string | null;
  summary: string;
  genre: Genre;
  awards: Award[];
}

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

// Initialise Spogtan with your Paramters type
const $ = spogtan<Parameters>();

// Create a reusable $movie object which is constructed based on the available Parameters
const $movie = $.wrap<Movie>({
  // $.get will look up the given parameter later, at evaluation time
  title: $.get('title'),
  genre: $.get('genre'),
  // You can specify defaults to make these parameters optional
  tag_line: $.get('tag_line', null),
  awards: $.get('awards', []),
  // You can automatically generate parameter values based on other parameters
  id: () =>
    $('title')
      .toLowerCase()
      .replace(/[^\w]+/g, '-'),
  summary: $.template`${'title'} (${'genre'})`,
});

const comedies = $.with(
  {
    // This genre is available to all movies below
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
