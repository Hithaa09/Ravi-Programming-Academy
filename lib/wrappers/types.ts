// Function-Only ("LeetCode style") execution mode — shared types.
//
// The type set is deliberately small and closed for v1. Adding a new type
// later (e.g. a linked-list or tree node) means adding one new ParamType
// variant plus one serializer entry per language adapter — nothing else in
// this module, or in run-code.ts/submit-code.ts, needs to change.

export type ScalarType = "int" | "long" | "double" | "float" | "boolean" | "char" | "String";
export type ArrayType = "int[]" | "long[]" | "double[]" | "boolean[]" | "String[]";
export type ParamType = ScalarType | ArrayType;

export const PARAM_TYPES: ParamType[] = [
  "int", "long", "double", "float", "boolean", "char", "String",
  "int[]", "long[]", "double[]", "boolean[]", "String[]",
];

export function isArrayType(type: ParamType): type is ArrayType {
  return type.endsWith("[]");
}

export function elementType(type: ArrayType): ScalarType {
  return type.slice(0, -2) as ScalarType;
}

export interface FunctionParam {
  name: string;
  type: ParamType;
}

export interface FunctionSignature {
  // Same identifier used across every language's generated code — avoids
  // per-language case-conversion bugs and matches how LeetCode itself keeps
  // one method name across languages for a given problem.
  functionName: string;
  params: FunctionParam[];
  returnType: ParamType;
}

export interface FunctionTestCase {
  // One JSON-representable value per param, in signature order.
  args: unknown[];
  // JSON-representable value matching returnType.
  expected: unknown;
}
