import ts, { factory } from "typescript";
import { getSymbol, GetTypeUid } from ".";
import { ReflectionRuntime } from "../reflect-runtime";
import { ConvertValueToExpression } from "../type-builders";

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

export function GenerateTypeUIDUsingGenerics(type: ts.Type) {
	if (type.isTypeParameter()) {
		const index = GetGenericIndex(type);

		if (index !== undefined) {
			return GenerateIndexOfGenerics(index);
		}
	}

	return ConvertValueToExpression(GetTypeUid(type));
}

export function GenerateIndexOfGenerics(index: number) {
	return factory.createElementAccessExpression(
		factory.createIdentifier(GENERICS_ARRAY),
		factory.createNumericLiteral(`${index}`),
	);
}
