import { GraphQLRuleTester, ParserOptions, rules } from '../src';

const TEST_SCHEMA = /* GraphQL */ `
  type Query {
    foo: String
    bar: Boolean
  }
`;

const WITH_SCHEMA = {
  parserOptions: <ParserOptions>{
    schema: TEST_SCHEMA,
    operations: [],
  },
};

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('unique-type-names', rules['unique-type-names'], {
  valid: [
    { ...WITH_SCHEMA, code: TEST_SCHEMA },
    {
      ...WITH_SCHEMA,
      code: /* GraphQL */ `
        type Query {
          foo: String
        }

        extend type Query {
          bar: Boolean
        }
      `,
    },
  ],
  invalid: [
    {
      ...WITH_SCHEMA,
      code: /* GraphQL */ `
        type Query {
          foo: String
        }

        type Query {
          bar: Boolean
        }
      `,
      errors: [{ message: 'There can be only one type named "Query".' }],
    },
  ],
});
