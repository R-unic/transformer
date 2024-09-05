import ts from "typescript";
import { GetTypeUid } from "../helpers";
import { GenerateIndexOfGenerics, GetGenericIndex } from "../helpers/generic-helper";
import { TransformContext } from "../transformer";
import { ConvertValueToCallExpression } from "../type-builders";

function TransformGetType(node: ts.CallExpression, typeId: string | ts.ElementAccessExpression) {
	return ConvertValueToCallExpression((node.expression as ts.Identifier).escapedText.toString(), [typeId]);
}

export function VisitGetType(state: TransformContext, node: ts.CallExpression) {
	if (!node.parent) return;

	if (!ts.isIdentifier(node.expression)) return;
	const name = node.expression.escapedText.toString();

	if (name !== "GetType") return;
	if (!state.HaveImported("GetType")) return;
	if (!node.typeArguments) return;

	const typeChecker = state.typeChecker;
	const typeArgument = node.typeArguments[0];
	const type = typeChecker.getTypeFromTypeNode(typeArgument);

	if (type.isTypeParameter()) {
		const index = GetGenericIndex(type);
		if (index === undefined) return state.Transform(node);

		return TransformGetType(node, GenerateIndexOfGenerics(index));
	}

	return TransformGetType(node, GetTypeUid(type));
}
