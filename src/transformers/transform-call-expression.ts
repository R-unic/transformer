import ts from "typescript";
import { TransformContext } from "../transformer";
import { getTypeFullName } from "../helpers";
import { ConvertValueToExpression } from "../type-builders";

export function VisitCallExpression(state: TransformContext, node: ts.CallExpression) {
	const fullName = node.expression.getText();
	if (fullName !== "$Indefine") return state.Transform(node);

	const typeChecker = state.typeChecker;
	const typeArgument = node.typeArguments?.[0];
	if (!typeArgument) return state.Transform(node);

	const id = getTypeFullName(typeChecker.getTypeFromTypeNode(typeArgument));

	return ConvertValueToExpression(id);
}
