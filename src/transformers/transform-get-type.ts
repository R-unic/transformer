import ts from "typescript";
import { TransformContext } from "../transformer";
import { GetTypeUid } from "../helpers";
import { ConvertValueToCallExpression } from "../type-builders";

function TransformGetType(node: ts.CallExpression, typeId: string) {
	return ConvertValueToCallExpression(node.expression.getText(), [typeId]);
}

export function VisitGetType(state: TransformContext, node: ts.CallExpression) {
	const name = node.expression.getText();
	if (name !== "GetType") return state.Transform(node);

	// TODO: Add check import

	if (!node.typeArguments) return;

	const typeChecker = state.typeChecker;
	const typeArgument = node.typeArguments[0];
	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isTypeParameter()) {
		console.log("Type parameter: ", type.getSymbol()?.name);
		return node;
	}

	return TransformGetType(node, GetTypeUid(type));
}
