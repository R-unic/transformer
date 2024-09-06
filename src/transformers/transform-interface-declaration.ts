import ts from "typescript";
import { IsCanRegisterType } from "../helpers";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitInterfaceDeclaration(context: TransformContext, node: ts.InterfaceDeclaration) {
	if (!IsCanRegisterType(node)) return node;

	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	context.AddNode([ReflectionRuntime.RegisterType(typeDescription)], "before");
	return context.Transform(node);
}
