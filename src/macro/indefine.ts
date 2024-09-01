import ts from "typescript";
import { GetTypeUid } from "../helpers";
import { ConvertValueToExpression } from "../type-builders";
import { TransformContext } from "../transformer";

export function TransformIndefine(node: ts.CallExpression) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return TransformContext.Instance.Transform(node);

	const id = GetTypeUid(typeChecker.getTypeFromTypeNode(typeArgument));
	return ConvertValueToExpression(id);
}
