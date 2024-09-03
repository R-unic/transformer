import ts from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function TransformRegistery(node: ts.CallExpression) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformContext.Instance.Transform(node);

	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isUnion()) {
		const types = type.types.map(GenerateTypeDescriptionFromNode);
		return ReflectionRuntime.RegisterTypes(...types);
	}

	return ReflectionRuntime.RegisterType(GenerateTypeDescriptionFromNode(type));
}
