import ts from "typescript";
import { TransformContext } from "../transformer";
import { TransformAnyFunction } from "./transform-any-function";

export function VisitMethodDeclaration(context: TransformContext, node: ts.MethodDeclaration) {
	const result = TransformAnyFunction(context, node);
	if (!result) return context.Transform(node);

	const [updatedNode, block] = result;

	return context.factory.updateMethodDeclaration(
		updatedNode,
		updatedNode.modifiers,
		updatedNode.asteriskToken,
		updatedNode.name,
		updatedNode.questionToken,
		updatedNode.typeParameters,
		updatedNode.parameters,
		updatedNode.type,
		block,
	);
}
