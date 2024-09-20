/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { AttributeKind } from "../declarations";
import { getType } from "../helpers";
import { f } from "../helpers/factory";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformState } from "../transformer";

const AttributeKinds: Record<AttributeKind, (node: ts.Decorator) => [boolean, unknown[]]> = {
	class: (node: ts.Decorator) => {
		return [ts.isClassDeclaration(node.parent), []];
	},
	property: (node) => {
		return [ts.isPropertyDeclaration(node.parent), []];
	},
	method: (node) => {
		return [ts.isMethodDeclaration(node.parent), []];
	},
	parameter: (node) => {
		if (!ts.isParameter(node.parent)) return [false, []];
		if (!ts.isMethodDeclaration(node.parent.parent)) return [false, []];

		return [ts.isParameter(node.parent), [node.parent.parent.name.getText()]];
	},
};

function GetAttributeKind(node: ts.Decorator) {
	for (const [key, value] of Object.entries(AttributeKinds)) {
		const [success, args] = value(node);
		if (success) {
			return [key as AttributeKind, args] as const;
		}
	}
}

const varriableName = "decorator";

export function VisitDecorator(state: TransformState, node: ts.Decorator) {
	const typeChecker = state.typeChecker;
	const callExpression = node.expression;
	if (!ts.isCallExpression(callExpression)) return node;

	const identical = callExpression.expression;
	if (!ts.isIdentifier(identical)) return node;

	const type = typeChecker.getTypeAtLocation(identical);
	const prop = type.getProperty("__special");
	if (!prop) return node;

	const propType = getType(prop);
	if (!propType || !propType.isLiteral()) return node;
	if (propType.value !== "AttributeMarker") return node;

	const [kind, args] = GetAttributeKind(node) ?? [];
	if (!kind || !args) throw new Error(`Could not find kind for ${node.getText()}`);

	const finalVarriableName = `${varriableName}_${state.NextID}`;
	state.AddNode([
		ReflectionRuntime.SetupKindForAttribute(kind, args),
		f.variableStatement(finalVarriableName, callExpression),
	]);

	return f.update.decorator(node, f.identifier(finalVarriableName));
}
