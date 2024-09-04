import ts, { factory } from "typescript";
import { GenerateUID, getType } from "../helpers";
import { TransformContext } from "../transformer";

export function VisitCreateAttribute(state: TransformContext, node: ts.CallExpression) {
	const typeChecker = state.typeChecker;

	const identical = node.expression;
	if (!ts.isIdentifier(identical)) return;

	const type = typeChecker.getTypeAtLocation(node);
	const prop = type.getProperty("__special");
	if (!prop) return;

	const propType = getType(prop);
	if (!propType || !propType.isLiteral()) return;
	if (propType.value !== "AttributeMarker") return;
	if (node.arguments.length === 2) return;

	const variable = node.parent;
	if (!ts.isVariableDeclaration(variable)) return;

	return factory.updateCallExpression(node, node.expression, node.typeArguments, [
		...node.arguments,
		factory.createStringLiteral(GenerateUID(node.getSourceFile().fileName, variable.name.getText())),
	]);
}
