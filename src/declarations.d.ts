export type PackageInfo = {
	rootDir: string;
	name: string;
};

export interface Type {
	Name: string;
	FullName: string;
	BaseType: Type | undefined;
	Interfaces: Type[];
	Properties: Property[];
	Methods: Method[];
}

export interface Method {
	readonly Name: string;
	readonly ReturnType: Type;
	readonly Parameters: Type[];
	readonly AccessModifier: number;
	readonly IsStatic: boolean;
	readonly IsAbstract: boolean;
	//readonly Callback: (context: unknown, ...args: unknown[]) => unknown;
}

export interface Property {
	readonly Name: string;
	readonly Type: Type;
	readonly Optional: boolean;
	readonly AccessModifier: number;
	//readonly accessor: Accessor;
	readonly Readonly: boolean;
}
