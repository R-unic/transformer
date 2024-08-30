/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformContext } from "../transformer";
import { VisitClassDeclaration } from "./transform-class-declaration";
import { VisitCallExpression } from "./transform-call-expression";

export const Transformers = new Map<
	ts.SyntaxKind,
	(state: TransformContext, node: any) => ts.Statement | ts.Statement[] | ts.Expression
>([
	[ts.SyntaxKind.ClassDeclaration, VisitClassDeclaration],
	[ts.SyntaxKind.CallExpression, VisitCallExpression],
]);
