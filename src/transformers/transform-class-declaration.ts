import ts, { factory } from "typescript";
import { PasteNodeInStaticBlock } from "../helpers/factories";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	node = context.Transform(node);
	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	return PasteNodeInStaticBlock(node, [
		ReflectionRuntime.RegisterType(typeDescription),
		ReflectionRuntime.RegisterDataType(factory.createIdentifier(typeDescription.Name), typeDescription.FullName),
	]);
}
