import { GraphQLRuleTester, ParserOptions, rules } from '../src';

const TEST_SCHEMA = /* GraphQL */ `
  type Query {
    foo: String!
    bar: String!
  }

  type Mutation {
    foo: String!
  }

  type T {
    foo: String!
  }
`;

const WITH_SCHEMA = {
  parserOptions: <ParserOptions>{
    schema: TEST_SCHEMA,
  },
};

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('executable-definitions', rules['executable-definitions'], {
  valid: [
    {
      ...WITH_SCHEMA,
      code: `query test2 { foo }`,
    },
    {
      ...WITH_SCHEMA,
      code: `mutation test { foo }`,
    },
    {
      ...WITH_SCHEMA,
      code: `fragment Test on T { foo }`,
    },
  ],
  invalid: [
    {
      ...WITH_SCHEMA,
      code: `type Query { t: String }`,
      errors: [{ message: 'The "Query" definition is not executable.' }],
    },
  ],
});
