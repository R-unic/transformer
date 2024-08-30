/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformContext } from "../transformer";
import { VisitCallExpression } from "./transform-call-expression";
import { VisitClassDeclaration } from "./transform-class-declaration";
import { VisitInterfaceDeclaration } from "./transform-interface-declaration";

export const Transformers = new Map<
	ts.SyntaxKind,
	(state: TransformContext, node: any) => ts.Statement | ts.Statement[] | ts.Expression
>([
	[ts.SyntaxKind.ClassDeclaration, VisitClassDeclaration],
	[ts.SyntaxKind.InterfaceDeclaration, VisitInterfaceDeclaration],
	[ts.SyntaxKind.CallExpression, VisitCallExpression],
]);
