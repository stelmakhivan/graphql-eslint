import { GraphQLRuleTester, ParserOptions } from '../src';
import rule from '../src/rules/selection-set-depth';

const WITH_SIBLINGS = {
  parserOptions: <ParserOptions>{
    operations: /* GraphQL */ `
      fragment AlbumFields on Album {
        id
      }
    `,
  },
};

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('selection-set-depth', rule, {
  valid: [
    {
      options: [{ maxDepth: 2 }],
      code: `
        query deep2 {
          viewer { # Level 0
            albums { # Level 1
              title # Level 2
            }
          }
        }
      `,
    },
    {
      ...WITH_SIBLINGS,
      options: [{ maxDepth: 2 }],
      code: /* GraphQL */ `
        query deep2 {
          viewer {
            albums {
              ...AlbumFields
            }
          }
        }
      `,
    },
    {
      ...WITH_SIBLINGS,
      options: [{ maxDepth: 1, ignore: ['albums'] }],
      code: /* GraphQL */ `
        query deep2 {
          viewer {
            albums {
              ...AlbumFields
            }
          }
        }
      `,
    },
  ],
  invalid: [
    {
      options: [{ maxDepth: 1 }],
      errors: [{ message: `'deep2' exceeds maximum operation depth of 1` }],
      code: /* GraphQL */ `
        query deep2 {
          viewer {
            albums {
              title
            }
          }
        }
      `,
    },
    {
      ...WITH_SIBLINGS,
      options: [{ maxDepth: 1 }],
      errors: [{ message: `'deep2' exceeds maximum operation depth of 1` }],
      code: /* GraphQL */ `
        query deep2 {
          viewer {
            albums {
              ...AlbumFields
            }
          }
        }
      `,
    },
  ],
});
