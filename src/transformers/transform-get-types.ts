import ts, { factory } from "typescript";
import { getType } from "../helpers";
import { TransformContext } from "../transformer";

export function VisitGetTypes(state: TransformContext, node: ts.CallExpression) {
	if (!node.parent) return;

	const name = node.expression.getText();
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

	return factory.updateCallExpression(node, node.expression, node.typeArguments, [
		factory.createStringLiteral(state.Config.packageName),
	]);
}
