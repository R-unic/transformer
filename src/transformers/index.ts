/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformContext } from "../transformer";
import { VisitArrowFunction } from "./transform-arrow-function";
import { VisitCallExpression } from "./transform-call-expression";
import { VisitClassDeclaration } from "./transform-class-declaration";
import { VisitFunctionDeclaration } from "./transform-function-declaration";
import { VisitFunctionExpression } from "./transform-function-expression";
import { VisitInterfaceDeclaration } from "./transform-interface-declaration";
import { VisitMethodDeclaration } from "./transform-method-declaration";

export const Transformers = new Map<ts.SyntaxKind, (state: TransformContext, node: any) => any>([
	[ts.SyntaxKind.ClassDeclaration, VisitClassDeclaration],
	[ts.SyntaxKind.InterfaceDeclaration, VisitInterfaceDeclaration],
	[ts.SyntaxKind.CallExpression, VisitCallExpression],
	[ts.SyntaxKind.FunctionDeclaration, VisitFunctionDeclaration],
	[ts.SyntaxKind.ArrowFunction, VisitArrowFunction],
	[ts.SyntaxKind.MethodDeclaration, VisitMethodDeclaration],
	[ts.SyntaxKind.FunctionExpression, VisitFunctionExpression],
]);
