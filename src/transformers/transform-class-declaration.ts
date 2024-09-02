import ts, { factory } from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));
	const modifiers = node.modifiers ?? ([] as ts.Modifier[]);

	return factory.updateClassDeclaration(
		node,
		[
			...modifiers,
			factory.createDecorator(ReflectionRuntime.RegisterTypeDecorator(typeDescription.FullName, typeDescription)),
		],
		node.name,
		node.typeParameters,
		node.heritageClauses,
		node.members,
	);
}
