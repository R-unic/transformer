import ts from "typescript";
import { IsCanRegisterType } from "../helpers";
import { PasteNodeInStaticBlock } from "../helpers/factories";
import { f } from "../helpers/factory";
import { GenerateTypeDescriptionFromNode } from "../helpers/generate-type-description";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	node = context.Transform(node);
	if (!IsCanRegisterType(node)) return node;

	const typeChecker = TransformContext.Instance.typeChecker;
	const typeDescription = GenerateTypeDescriptionFromNode(typeChecker.getTypeAtLocation(node));

	return PasteNodeInStaticBlock(node, [
		ReflectionRuntime.RegisterType(typeDescription),
		ReflectionRuntime.RegisterDataType(f.identifier(typeDescription.Name), typeDescription.FullName),
	]);
}
