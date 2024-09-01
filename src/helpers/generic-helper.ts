import ts, { factory } from "typescript";
import { getSymbol } from ".";
import { ReflectionRuntime } from "../reflect-runtime";

export const GENERICS_ARRAY = "__GENERICS_ARRAY";
let DefinedGenerics: ts.Type[] | undefined = undefined;

export function DefineGenerics(types: ts.Type[]) {
	DefinedGenerics = types;
}

export function ClearDefinedGenerics() {
	DefinedGenerics = undefined;
}

export function GetDefinedGenerics() {
	return DefinedGenerics;
}

export function GetGenericIndex(generic: ts.Type) {
	if (!generic.isTypeParameter()) return undefined;

	const index = DefinedGenerics?.findIndex(
		(type) => getSymbol(type).escapedName.toString() === generic.symbol.escapedName.toString(),
	);

	return index !== undefined && index >= 0 ? index : undefined;
}

export function GenerateUnpackGenerics(factory: ts.NodeFactory) {
	return factory.createVariableStatement(
		undefined,
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					factory.createIdentifier(GENERICS_ARRAY),
					undefined,
					undefined,
					ReflectionRuntime.GetGenericParameters(),
				),
			],
			ts.NodeFlags.Const,
		),
	);
}

export function GenerateIndexOfGenerics(index: number) {
	return factory.createElementAccessExpression(
		factory.createIdentifier(GENERICS_ARRAY),
		factory.createNumericLiteral(`${index}`),
	);
}
