import ts, { factory } from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));
	return [
		context.Transform(node),
		ReflectionRuntime.RegisterType(typeDescription.FullName, typeDescription),
		ReflectionRuntime.RegisterDataType(factory.createIdentifier(typeDescription.Name), typeDescription.FullName),
	];
}
