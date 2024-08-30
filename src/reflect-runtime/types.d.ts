export interface IReflectionRuntime {
	RegisterType(id: string, type: Type): ts.ExpressionStatement;
	GetType(id: string): Type;
}
