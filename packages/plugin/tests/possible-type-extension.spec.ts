import { GraphQLRuleTester, rules } from '../src';

const ruleTester = new GraphQLRuleTester();

ruleTester.runGraphQLTests('possible-type-extension', rules['possible-type-extension'], {
  valid: [
    /* GraphQL */ `
      type User {
        id: ID!
      }

      extend type User {
        name: String!
      }
    `,
  ],
  invalid: [
    {
      code: /* GraphQL */ `
        type User {
          id: ID!
        }

        extend type OtherUser {
          name: String!
        }
      `,
      errors: [{ message: 'Cannot extend type "OtherUser" because it is not defined.' }],
    },
  ],
});
