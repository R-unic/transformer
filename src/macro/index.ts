/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformIndefine } from "./indefine";

export const Macros = new Map<string, (node: any) => ts.Expression>([["indefine", TransformIndefine]]);

export function TransformMacro(node: ts.CallExpression) {
	const name = node.expression.getText();
	const macro = Macros.get(name);
	if (!macro) return;

	return macro(node);
}
