/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformIndefine } from "./indefine";
import { TransformRegistery } from "./registery";

export const Macros = new Map<string, (node: any) => ts.Expression | ts.Statement>([
	["$indefine", TransformIndefine],
	["$reflect", TransformRegistery],
]);

export function TransformMacro(node: ts.CallExpression) {
	if (!node.parent) return;

	if (!ts.isIdentifier(node.expression)) return;
	const name = node.expression.escapedText.toString();

	const macro = Macros.get(name);
	if (!macro) return;

	return macro(node);
}
