import ts from "typescript";

export interface IReflectionRuntime {
	RegisterType(id: string, type: Type): ts.ExpressionStatement;
	RegisterDataType(instance: ts.Identifier, typeId: string): ts.ExpressionStatement;
	GetType(id: string): Type;
	GetMethodCallback(ctor: ts.Identifier, name: string): (context: unknown, ...args: unknown[]) => unknown;
	GetConstructorCallback(ctor: ts.Identifier): (...args: unknown[]) => unknown;
}
