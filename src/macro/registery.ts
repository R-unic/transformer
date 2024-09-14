import ts from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

export function TransformRegistery(node: ts.CallExpression) {
	const typeChecker = TransformState.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformState.Instance.Transform(node);

	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isUnion()) {
		const types = type.types.map((v) => GenerateTypeDescriptionFromNode(v, true)[0]);
		return ReflectionRuntime.RegisterTypes(...types);
	}

	return ReflectionRuntime.RegisterType([], GenerateTypeDescriptionFromNode(type)[0]);
}
