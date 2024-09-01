import ts from "typescript";
import { ClearDefinedGenerics, DefineGenerics, GenerateUnpackGenerics } from "../helpers/generic-helper";
import { TransformContext } from "../transformer";

export function VisitFunctionDeclaration(context: TransformContext, node: ts.FunctionDeclaration) {
	const typeParameters = node.typeParameters;
	if (!typeParameters) return context.Transform(node);

	if (!node.body) return context.Transform(node);
	const unpackStatement = GenerateUnpackGenerics(context.factory);

	DefineGenerics(
		typeParameters.map((typeParameter) => {
			return context.typeChecker.getTypeAtLocation(typeParameter);
		}),
	);

	let updatedNode = context.Transform(node);
	const block = updatedNode.body!;

	updatedNode = context.factory.updateFunctionDeclaration(
		updatedNode,
		updatedNode.modifiers,
		updatedNode.asteriskToken,
		updatedNode.name,
		updatedNode.typeParameters,
		updatedNode.parameters,
		updatedNode.type,
		context.factory.updateBlock(block, [unpackStatement, ...block.statements]),
	);

	ClearDefinedGenerics();

	return updatedNode;
}
