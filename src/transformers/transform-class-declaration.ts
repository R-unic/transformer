import ts, { factory } from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	node = context.Transform(node);
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	return factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, [
		factory.createClassStaticBlockDeclaration(
			factory.createBlock(
				[
					ReflectionRuntime.RegisterType(typeDescription.FullName, typeDescription),
					ReflectionRuntime.RegisterDataType(
						factory.createIdentifier(typeDescription.Name),
						typeDescription.FullName,
					),
				],
				true,
			),
		),
		...node.members,
	]);
}
