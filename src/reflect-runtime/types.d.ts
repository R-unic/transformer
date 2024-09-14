import ts from "typescript";
import { AttributeVid, Type } from "../declarations";

export interface IReflectionRuntime {
	RegisterType(typeParams: Type[], type: Type): ts.ExpressionStatement;
	RegisterTypes(...args: Type[]): ts.ExpressionStatement;
	RegisterDataType(instance: ts.Identifier, typeId: string): ts.ExpressionStatement;
	GetGenericParameter(paramName: string): Type;
	DefineGenericParameters(typeParams: Type[]): Type[];
	SetupGenericParameters(params: (string | ts.Node)[]): ts.ExpressionStatement;
	SetupDefaultGenericParameters(defined: ts.Identifier, params: [number, ts.Expression][]): ts.ExpressionStatement;
	GetGenericParameters(): ts.Expression;
	__GetType(id: string, schedulingType?: boolean, typeArguments?: Type[]): Type;
	SetupKindForAttribute(vid: AttributeVid, args: unknown[]): ts.ExpressionStatement;
	GetMethodCallback(ctor: ts.Identifier, name: string): (context: unknown, ...args: unknown[]) => unknown;
	GetConstructorCallback(ctor: ts.Identifier): (...args: unknown[]) => unknown;
}
