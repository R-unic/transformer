import { AccessModifier } from "./enums";

export type PackageInfo = {
	rootDir: string;
	name: string;
};

export interface Type {
	Name: string;
	FullName: string;
	Interfaces: Type[];
	Properties: Map<string, Property>;
}

export interface Property {
	readonly Name: string;
	readonly Type: Type;
	readonly Optional: boolean;
	readonly AccessModifier: number;
	//readonly accessor: Accessor;
	readonly Readonly: boolean;
}
