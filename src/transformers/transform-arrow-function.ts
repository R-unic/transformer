import ts from "typescript";
import { TransformContext } from "../transformer";
import { ClearDefinedGenerics, DefineGenerics, GenerateUnpackGenerics } from "../helpers/generic-helper";

export function VisitArrowFunction(context: TransformContext, node: ts.ArrowFunction) {
	const typeParameters = node.typeParameters;
	if (!typeParameters) return context.Transform(node);

	const unpackStatement = GenerateUnpackGenerics(context.factory);

	DefineGenerics(
		typeParameters.map((typeParameter) => {
			return context.typeChecker.getTypeAtLocation(typeParameter);
		}),
	);

	let updatedNode = context.Transform(node);
	const block = updatedNode.body as ts.Block;

	updatedNode = context.factory.updateArrowFunction(
		updatedNode,
		updatedNode.modifiers,
		updatedNode.typeParameters,
		updatedNode.parameters,
		updatedNode.type,
		updatedNode.equalsGreaterThanToken,
		context.factory.updateBlock(block, [unpackStatement, ...block.statements]),
	);

	ClearDefinedGenerics();

	return updatedNode;
}
