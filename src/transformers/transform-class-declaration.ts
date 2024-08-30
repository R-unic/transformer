import ts from "typescript";
import { getTypeFullName } from "../helpers";
import { ReflectionRuntime } from "../reflect-runtime";
import { TransformContext } from "../transformer";

export function VisitClassDeclaration(context: TransformContext, node: ts.ClassDeclaration) {
	const typeChecker = context.typeChecker;
	const fullName = getTypeFullName(typeChecker.getTypeAtLocation(node));

	return [
		context.Transform(node),
		ReflectionRuntime.RegisterType("", { Name: node.name?.getText() ?? "", FullName: fullName ?? "" }),
	];
}
