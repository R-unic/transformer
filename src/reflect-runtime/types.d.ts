import ts from "typescript";
import { Type } from "../declarations";

export interface IReflectionRuntime {
	RegisterType(id: string, type: Type): ts.ExpressionStatement;
	RegisterTypes(...args: { name: string; _type: Type }[]): ts.ExpressionStatement;
	RegisterDataType(instance: ts.Identifier, typeId: string): ts.ExpressionStatement;
	SetupGenericParameters(params: (string | ts.Node)[]): ts.ExpressionStatement;
	SetupDefaultGenericParameters(params: [number, ts.Expression][]): ts.ExpressionStatement;
	GetGenericParameters(): ts.Expression;
	GetType(id: string): Type;
	GetMethodCallback(ctor: ts.Identifier, name: string): (context: unknown, ...args: unknown[]) => unknown;
	GetConstructorCallback(ctor: ts.Identifier): (...args: unknown[]) => unknown;
}
