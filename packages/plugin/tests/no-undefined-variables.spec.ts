import { join } from 'path';
import { GraphQLRuleTester, rules } from '../src';

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('no-undefined-variables', rules['no-undefined-variables'], {
  valid: [],
  invalid: [
    {
      filename: join(__dirname, 'mocks/no-undefined-variables.gql'),
      code: ruleTester.fromMockFile('no-undefined-variables.gql'),
      parserOptions: {
        schema: join(__dirname, 'mocks/user-schema.graphql'),
        operations: join(__dirname, 'mocks/user-fields-with-variables.gql'),
      },
      errors: [
        { message: 'Variable "$limit" is not defined by operation "User".' },
        { message: 'Variable "$offset" is not defined by operation "User".' },
      ],
    },
  ],
});
