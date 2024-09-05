export type PackageInfo = {
	rootDir: string;
	name: string;
};

export type AttributeVid = "class" | "method" | "property" | "parameter";

export interface Type {
	readonly Name: string;
	readonly FullName: string;
	readonly Assembly: string;
	readonly Value?: unknown;
	readonly Constructor?: ConstructorInfo;
	readonly Kind: TypeKind;
	readonly BaseType: Type | undefined;
	readonly Interfaces: Type[];
	readonly Properties: Property[];
	readonly Methods: Method[];
}

export interface Parameter {
	readonly Name: string;
	readonly Type: Type;
	readonly Optional: boolean;
}

export interface Method {
	readonly Name: string;
	readonly ReturnType: Type;
	readonly Parameters: Parameter[];
	readonly AccessModifier: number;
	readonly IsStatic: boolean;
	readonly IsAbstract: boolean;
	readonly Callback?: (context: unknown, ...args: unknown[]) => unknown;
}

export interface ConstructorInfo {
	readonly Parameters: Parameter[];
	readonly AccessModifier: number;
	readonly Callback?: (...args: unknown[]) => unknown;
}

export interface Property {
	readonly Name: string;
	readonly Type: Type;
	readonly Optional: boolean;
	readonly AccessModifier: number;
	//readonly accessor: Accessor;
	readonly Readonly: boolean;
}

export interface TSConfig {
	reflectAllCalls?: boolean;
	autoRegister?: boolean;
}
