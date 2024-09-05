import ts from "typescript";
import { GenerateUID, getType } from "../helpers";
import { TransformContext } from "../transformer";
import { f } from "../helpers/factory";

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

	return f.update.call(node, node.expression, [
		...node.arguments,
		f.string(GenerateUID(node.getSourceFile().fileName, variable.name.getText())),
	]);
}
