import ts, { factory } from "typescript";
import { getSymbol, GetTypeUid } from ".";
import { ReflectionRuntime } from "../reflect-runtime";
import { ConvertValueToExpression } from "../type-builders";
import { TransformContext } from "../transformer";
import { GenerateGenericsFromAttributeApi } from "../transformers/transform-attribute-api";

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

export function GenerateSetupGenericParameters(node: ts.CallExpression) {
	if (!node.typeArguments) throw new Error("No type arguments");

	// For attribute API
	const newNode = GenerateGenericsFromAttributeApi(node);
	if (newNode) return newNode;

	return ReflectionRuntime.SetupGenericParameters(
		node.typeArguments.map((node) => {
			const type = TransformContext.Instance.typeChecker.getTypeFromTypeNode(node);

			if (type.isTypeParameter()) {
				const index = GetGenericIndex(type);

				if (index !== undefined) {
					return GenerateIndexOfGenerics(index);
				}
			}

			return GetTypeUid(type);
		}),
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
