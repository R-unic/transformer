import ts from "typescript";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";
import { HaveReflectTag } from "../helpers";

export function VisitInterfaceDeclaration(context: TransformContext, node: ts.InterfaceDeclaration) {
	if (!(context.tsConfig.autoRegister ? true : HaveReflectTag(node))) return node;

	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	context.AddNode([ReflectionRuntime.RegisterType(typeDescription)], "before");
	return context.Transform(node);
}
