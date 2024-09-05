import ts from "typescript";
import { getType } from "../helpers";
import { f } from "../helpers/factory";
import { TransformContext } from "../transformer";

export function VisitGetTypes(state: TransformContext, node: ts.CallExpression) {
	if (!node.parent) return;

	if (!ts.isIdentifier(node.expression)) return;
	const name = node.expression.escapedText.toString();

	if (name !== "GetTypes") return;
	if (!state.HaveImported("GetTypes")) return;

	const typeChecker = state.typeChecker;
	const argument = node.arguments[0];
	if (!argument) return;

	const type = typeChecker.getTypeAtLocation(argument);
	const prop = type.getProperty("_special");
	if (!prop) return;

	const propType = getType(prop);
	if (!propType || !propType.isLiteral()) return;
	if (propType.value !== "CurrentAssembly") return;

	return f.update.call(node, node.expression, [f.string(state.Config.packageName)]);
}
