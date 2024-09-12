import ts from "typescript";
import { GetTypeUid } from "../helpers";
import { TransformState } from "../transformer";
import { ConvertValueToExpression } from "../type-builders";

export function TransformIndefine(node: ts.CallExpression) {
	const typeChecker = TransformState.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformState.Instance.Transform(node);

	const id = GetTypeUid(typeChecker.getTypeFromTypeNode(typeArgument));
	return ConvertValueToExpression(id);
}
