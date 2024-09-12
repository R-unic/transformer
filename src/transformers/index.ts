/* eslint-disable @typescript-eslint/no-explicit-any */
import ts from "typescript";
import { TransformState } from "../transformer";
import { VisitArrowFunction } from "./transform-arrow-function";
import { VisitCallExpression } from "./transform-call-expression";
import { VisitClassDeclaration } from "./transform-class-declaration";
import { VisitDecorator } from "./transform-decorator";
import { VisitEnumDeclaration } from "./transform-enum-declaration";
import { VisitFunctionDeclaration } from "./transform-function-declaration";
import { VisitFunctionExpression } from "./transform-function-expression";
import { VisitInterfaceDeclaration } from "./transform-interface-declaration";
import { VisitMethodDeclaration } from "./transform-method-declaration";
import { VisitTypeAliasDeclaration } from "./transform-type-alias-declaration";

export const Transformers = new Map<ts.SyntaxKind, (state: TransformState, node: any) => ts.Node>([
	[ts.SyntaxKind.ClassDeclaration, VisitClassDeclaration],
	[ts.SyntaxKind.InterfaceDeclaration, VisitInterfaceDeclaration],
	[ts.SyntaxKind.CallExpression, VisitCallExpression],
	[ts.SyntaxKind.FunctionDeclaration, VisitFunctionDeclaration],
	[ts.SyntaxKind.ArrowFunction, VisitArrowFunction],
	[ts.SyntaxKind.MethodDeclaration, VisitMethodDeclaration],
	[ts.SyntaxKind.FunctionExpression, VisitFunctionExpression],
	[ts.SyntaxKind.Decorator, VisitDecorator],
	[ts.SyntaxKind.TypeAliasDeclaration, VisitTypeAliasDeclaration],
	[ts.SyntaxKind.EnumDeclaration, VisitEnumDeclaration],
]);
