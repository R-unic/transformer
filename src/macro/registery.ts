import ts from "typescript";
import { GenerateRegisterType, getSymbol } from "../helpers";
import { GenerateTypeDescription } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function TransformRegistery(node: ts.CallExpression) {
	const typeChecker = TransformState.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformState.Instance.Transform(node);

	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isUnion()) {
		const types = type.types.map((v) => GenerateTypeDescription(v, true));
		return ReflectionRuntime.RegisterTypes(...types);
	}

	const symbol = getSymbol(type);
	if (!symbol) return GenerateRegisterType(type);

	const originalType = typeChecker.getDeclaredTypeOfSymbol(symbol);
	if (!originalType) return GenerateRegisterType(type);

	return GenerateRegisterType(originalType);
}
