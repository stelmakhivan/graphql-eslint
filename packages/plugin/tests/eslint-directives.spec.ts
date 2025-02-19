import { join } from 'path';
import { GraphQLRuleTester } from '../src';
import rule from '../src/rules/no-anonymous-operations';

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('test-directives', rule, {
  valid: [
    /* GraphQL */ `
      # eslint-disable-next-line
      query {
        a
      }
    `,
    /* GraphQL */ `
      # eslint-disable-next-line test-directives
      query {
        a
      }
    `,
    `
      query { # eslint-disable-line test-directives
        a
      }
    `,
    `
      query { # eslint-disable-line
        a
      }
    `,
    /* GraphQL */ `
      # eslint-disable
      query {
        a
      }
    `,
    {
      filename: join(__dirname, 'mocks/test-directives-with-import.graphql'),
      code: ruleTester.fromMockFile('test-directives-with-import.graphql'),
    },
  ],
  invalid: [
    {
      errors: 2,
      code: /* GraphQL */ `
        # eslint-disable-next-line non-existing-rule
        query {
          a
        }
      `,
    },
    {
      code: /* GraphQL */ `
        query {
          a
        }
      `,
      errors: 1,
    },
  ],
});
