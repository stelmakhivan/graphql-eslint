import { join } from 'path';
import { GraphQLRuleTester, rules } from '../src';

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('known-fragment-names', rules['known-fragment-names'], {
  valid: [
    {
      filename: join(__dirname, 'mocks/user.graphql'),
      code: ruleTester.fromMockFile('user.graphql'),
      parserOptions: {
        schema: join(__dirname, 'mocks/user-schema.graphql'),
        operations: join(__dirname, 'mocks/user-fields-with-variables.gql'),
      },
    },
    {
      filename: join(__dirname, 'mocks/known-fragment-names.ts/1_document.graphql'),
      code: /* GraphQL */ `
        query User {
          user {
            ...UserFields
          }
        }
      `,
      parserOptions: {
        schema: join(__dirname, 'mocks/user-schema.graphql'),
        operations: join(__dirname, 'mocks/known-fragment-names.ts'),
      },
    },
  ],
  invalid: [],
});
