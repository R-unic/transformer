/* eslint-disable @typescript-eslint/no-explicit-any */
import ts, { factory } from "typescript";
import { AttributeVid as AttributeKind } from "../declarations";
import { getType } from "../helpers";
import { CreateVarriable } from "../helpers/factories";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

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

export function VisitDecorator(state: TransformContext, node: ts.Decorator) {
	const typeChecker = state.typeChecker;
	const callExpression = node.expression;
	if (!ts.isCallExpression(callExpression)) return;

	const identical = callExpression.expression;
	if (!ts.isIdentifier(identical)) return;

	const type = typeChecker.getTypeAtLocation(identical);
	const prop = type.getProperty("__special");
	if (!prop) return;

	const propType = getType(prop);
	if (!propType || !propType.isLiteral()) return;
	if (propType.value !== "AttributeMarker") return;

	const [kind, args] = GetAttributeKind(node) ?? [];
	if (!kind || !args) throw new Error(`Could not find kind for ${node.getText()}`);

	const finalVarriableName = `${varriableName}_${state.NextID}`;
	state.AddNode([
		ReflectionRuntime.SetupKindForAttribute(kind, args),
		CreateVarriable(finalVarriableName, callExpression),
	]);

	return factory.updateDecorator(node, factory.createIdentifier(finalVarriableName));
}
