/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { Expression } from "typescript";
import { ConvertObjectToExpression } from "./object-builder";

type Primitives = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

export const TypeBuilders = new Map<Primitives, (value: any) => Expression>([
	["string", (value) => ts.factory.createStringLiteral(value)],
	["number", (value) => ts.factory.createNumericLiteral(value)],
	["bigint", (value) => ts.factory.createBigIntLiteral(value)],
	["boolean", (value) => (value ? ts.factory.createTrue() : ts.factory.createFalse())],
	["undefined", () => ts.factory.createIdentifier("undefined")],
	["object", (value) => ConvertObjectToExpression(value)],
]);

export const ConvertValueToExpression = (value: any) => {
	const typeName = typeof value;
	const builder = TypeBuilders.get(typeName);
	if (!builder) throw new Error(`Unsupported type: ${typeName}`);

	return builder(value);
};

export const ConvertValueToCallExpression = (name: string, args: any[]) => {
	return ts.factory.createCallExpression(
		ts.factory.createIdentifier(name),
		undefined,
		args.map(ConvertValueToExpression),
	);
};
