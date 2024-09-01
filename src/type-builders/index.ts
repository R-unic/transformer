/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { Expression } from "typescript";
import { ConvertArrayToExpression } from "./array-builder";
import { ConvertMapToExpression } from "./map-builder";
import { ConvertObjectToExpression } from "./object-builder";
import { IsNode } from "../helpers";

type Collections = "array" | "map";
type Primities = "string" | "number" | "boolean" | "undefined" | "object" | "function" | "bigint" | "symbol";

export const TypeBuilders = new Map<Primities | Collections, (value: any) => Expression>([
	["string", (value) => ts.factory.createStringLiteral(value)],
	["number", (value) => ts.factory.createNumericLiteral(value)],
	["boolean", (value) => (value ? ts.factory.createTrue() : ts.factory.createFalse())],
	["undefined", () => ts.factory.createIdentifier("undefined")],
	["object", (value) => ConvertObjectToExpression(value)],
	["array", (value) => ConvertArrayToExpression(value)],
	["map", (value) => ConvertMapToExpression(value)],
]);

const Collections = new Map<Collections, (value: any) => boolean>([
	["array", (v) => Array.isArray(v)],
	["map", (v) => v instanceof Map],
]);

function TypeofCollection(value: any) {
	for (const [key, validator] of Collections) {
		if (validator(value)) {
			return key;
		}
	}
}

export const ConvertValueToExpression = (value: any) => {
	if (value && IsNode(value)) return value as ts.Expression;

	const typeName = typeof value;
	let builder = TypeBuilders.get(typeName);
	if (typeName === "object") {
		const collectionType = TypeofCollection(value);
		if (collectionType) {
			builder = TypeBuilders.get(collectionType);
		}
	}

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
