export interface Type {
	Name: string;
	FullName: string;
}

export interface IReflectionRuntime {
	RegisterType(id: string, type: Type): void;
}
