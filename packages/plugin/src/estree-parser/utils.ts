import {
  Kind,
  Location,
  ValueNode,
  TokenKind,
  GraphQLOutputType,
  GraphQLNamedType,
  isNonNullType,
  isListType,
} from 'graphql';
import { Comment } from 'estree';
import { GraphQLESTreeNode } from './estree-ast';

function keyValMap<T, V>(list: ReadonlyArray<T>, keyFn: (item: T) => string, valFn: (item: T) => V): Record<string, V> {
  return Object.fromEntries(list.map(item => [keyFn(item), valFn(item)]));
}

export function valueFromNode(valueNode: GraphQLESTreeNode<ValueNode>, variables?: Record<string, any>): any {
  switch (valueNode.type) {
    case Kind.NULL:
      return null;
    case Kind.INT:
      return parseInt(valueNode.value, 10);
    case Kind.FLOAT:
      return parseFloat(valueNode.value);
    case Kind.STRING:
    case Kind.ENUM:
    case Kind.BOOLEAN:
      return valueNode.value;
    case Kind.LIST:
      return valueNode.values.map(node => valueFromNode(node, variables));
    case Kind.OBJECT:
      return keyValMap(
        valueNode.fields,
        field => field.name.value,
        field => valueFromNode(field.value, variables)
      );
    case Kind.VARIABLE:
      return variables?.[valueNode.name.value];
  }
}

export function getBaseType(type: GraphQLOutputType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return getBaseType(type.ofType);
  }

  return type;
}

export function extractCommentsFromAst(loc: Location): Comment[] {
  if (!loc) {
    return [];
  }
  const comments: Comment[] = [];
  let token = loc.startToken;

  while (token !== null) {
    const { kind, value, line, column, start, end, next } = token;
    if (kind === TokenKind.COMMENT) {
      comments.push({
        type: 'Block',
        value,
        loc: {
          start: { line, column },
          end: { line, column },
        },
        range: [start, end],
      });
    }
    token = next;
  }
  return comments;
}
