export interface Type {
	Name: string;
	FullName: string;
	Interfaces: Type[];
	Properties: Map<string, Type>;
}

export interface IReflectionRuntime {
	RegisterType(id: string, type: Type): void;
}
