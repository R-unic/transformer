/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts from "typescript";
import { Tags } from "../project-config.json";
import { TransformContext } from "../transformer";
import { f } from "./factory";

const nodeModulesPattern = "/node_modules/";
const PATH_SEPARATOR_REGEX = /\\/g;
const EXTENSION = /\..*$/g;
export const PRIMITIVES = ["string", "number", "boolean", "undefined", "object", "function", "bigint", "symbol"];

interface AssemblyInfo {
	PackageName: string;
	PackagePath: string;
	OutDir: string;
	SrcDir: string;
}

export function getDeclaration(symbol?: ts.Symbol): ts.Declaration | undefined {
	if (!symbol) {
		return undefined;
	}

	return symbol.valueDeclaration || symbol.declarations?.[0];
}

export function getSymbol(type: ts.Type): ts.Symbol {
	return type.aliasSymbol || type.symbol;
}

export function IsNode(value: any): boolean {
	if (typeof value !== "object") return false;
	return "kind" in value && "parent" in value;
}

const packageJsons = new Map<string, { packageName: string; tsConfigPath: string }>(); // path -> { packageName, tsConfigPath }
const tsconfigs = new Map<string, { srcDir: string; outDir: string; packagePath: string }>(); // path -> { srcDir, outDir packagePath }

function findPackageJsonAndTSConfigFromFilePath(filePath: string) {
	const spl = filePath.split("/");
	let packagePath: string | undefined;
	let tsConfigPath: string | undefined;

	for (let i = spl.length - 1; i >= 0; i--) {
		if (!tsConfigPath) {
			const fullPath = path.join(...spl.slice(0, i), "tsconfig.json");
			if (fs.existsSync(fullPath)) {
				tsConfigPath = fullPath;
			}
		}

		if (!packagePath) {
			const fullPathPackage = path.join(...spl.slice(0, i), "package.json");
			if (fs.existsSync(fullPathPackage)) {
				packagePath = fullPathPackage;
			}
		}

		if (packagePath && tsConfigPath) {
			break;
		}
	}

	return [packagePath?.replace(PATH_SEPARATOR_REGEX, "/"), tsConfigPath?.replace(PATH_SEPARATOR_REGEX, "/")] as const;
}

function readSrcAndOutDir(tsConfigPath: string) {
	const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
	const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, path.dirname(tsConfigPath));
	return { srcDir: parsedTsConfig.options.rootDir, outDir: parsedTsConfig.options.outDir };
}

function removeLastFolder(_path: string) {
	const spl = _path.split("/").slice(0, -1);
	return path.join(...spl).replace(PATH_SEPARATOR_REGEX, "/");
}

function findPackageNameAndSrcOutDir(filePath: string) {
	let result: AssemblyInfo | undefined;

	packageJsons.forEach(({ packageName, tsConfigPath }, packagePath) => {
		if (result) return;

		const relativePath = path.relative(packagePath, filePath);
		if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return;

		result = {
			PackageName: packageName,
			PackagePath: removeLastFolder(packagePath),
			SrcDir: tsconfigs.get(tsConfigPath)!.srcDir,
			OutDir: tsconfigs.get(tsConfigPath)!.outDir,
		};
	});

	return result;
}

function getAssemblyInfoFromFilePath(filePath: string): AssemblyInfo {
	const found = findPackageNameAndSrcOutDir(filePath);

	if (found) {
		return found;
	}

	const [packageInfoPath, tsConfigPath] = findPackageJsonAndTSConfigFromFilePath(filePath);

	if (!tsConfigPath || !packageInfoPath) {
		throw new Error("tsconfig.json or package.json not found");
	}

	let { srcDir, outDir } = readSrcAndOutDir(tsConfigPath);
	if (!outDir || !srcDir) {
		throw new Error("outDir or srcDir not found");
	}

	srcDir = path.relative(removeLastFolder(tsConfigPath), srcDir.replace(PATH_SEPARATOR_REGEX, "/"));
	outDir = path.relative(removeLastFolder(tsConfigPath), outDir.replace(PATH_SEPARATOR_REGEX, "/"));

	const packageInfo = fs.readFileSync(packageInfoPath, "utf-8");
	const packageName = JSON.parse(packageInfo).name as string;

	packageJsons.set(packageInfoPath, { packageName, tsConfigPath });
	tsconfigs.set(tsConfigPath, { srcDir, outDir, packagePath: packageInfoPath });

	return {
		PackageName: packageName,
		PackagePath: removeLastFolder(packageInfoPath),
		SrcDir: srcDir,
		OutDir: outDir,
	};
}

// https://github.com/roblox-ts/roblox-ts/blob/dc74f34fdab3caf20d65db080cf2dbf5c4f38fdc/src/TSTransformer/util/types.ts#L70
function IsDefinedType(type: ts.Type) {
	return (
		type.flags === ts.TypeFlags.Object &&
		type.getProperties().length === 0 &&
		type.getCallSignatures().length === 0 &&
		type.getConstructSignatures().length === 0 &&
		type.getNumberIndexType() === undefined &&
		type.getStringIndexType() === undefined
	);
}

export function getType(symbol: ts.Symbol): ts.Type | undefined {
	const typeChecker = TransformContext.Instance.typeChecker;

	if (symbol.flags == ts.SymbolFlags.Interface) {
		return typeChecker.getDeclaredTypeOfSymbol(symbol);
	}

	const declaration = getDeclaration(symbol);
	if (!declaration) return undefined;

	return typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
}

function GetSymbolNamespace(type: ts.Type) {
	const symbol = getSymbol(type);
	const declaration = getDeclaration(symbol);

	if (!declaration) {
		return "UnknownDeclaration";
	}

	const filePath = declaration.getSourceFile().fileName;
	const { PackageName } = getAssemblyInfoFromFilePath(filePath);

	return PackageName;
}

export function GenerateUID(filePath: string, name: string) {
	const nodeModulesIndex = filePath.lastIndexOf(nodeModulesPattern);
	const { PackageName, SrcDir, OutDir, PackagePath } = getAssemblyInfoFromFilePath(filePath);

	if (nodeModulesIndex === -1) {
		filePath = filePath.replace(SrcDir, OutDir);
	}

	filePath =
		PackageName +
		":" +
		path.relative(PackagePath, filePath).replace(PATH_SEPARATOR_REGEX, "/").replace(EXTENSION, "");

	return filePath + "#" + name;
}

export function GetSymbolUID(symbol: ts.Symbol) {
	const declaration = getDeclaration(symbol);

	if (!declaration) {
		return "UnknownDeclaration";
	}

	return GenerateUID(declaration.getSourceFile().fileName, symbol.name);
}

export function CreateIDGenerator() {
	let index = 0;
	return () => {
		index++;
		return index;
	};
}

export function GetDeclarationName(type: ts.Type) {
	const declaration = getDeclaration(getSymbol(type));
	if (!declaration || !ts.isNamedDeclaration(declaration)) return "UnknownDeclaration";

	return declaration.name.getText();
}

export function HaveTag(declaration: ts.Node, tag: string) {
	const tags = ts.getJSDocTags(declaration);
	return tags.find((foundTag) => foundTag.tagName.text === tag) !== undefined;
}

export function HaveReflectTag(declaration: ts.Node) {
	return HaveTag(declaration, Tags.reflect);
}

export function IsReflectSignature(signature: ts.Signature | ts.Declaration) {
	const declaration = IsNode(signature) ? (signature as ts.Declaration) : (signature as ts.Signature).declaration;
	return (
		declaration &&
		(TransformContext.Instance.tsConfig.reflectAllCalls
			? !TransformContext.Instance.IsDisabledReflect
			: (HaveReflectTag(declaration) || TransformContext.Instance.IsEnableGlobalReflect) &&
			  !TransformContext.Instance.IsDisabledReflect)
	);
}

export function IsCanRegisterType(node: ts.Node) {
	return TransformContext.Instance.tsConfig.autoRegister
		? !TransformContext.Instance.IsDisabledRegister
		: HaveReflectTag(node) && !TransformContext.Instance.IsDisabledRegister;
}

export function GetTypeName(type: ts.Type) {
	if (getSymbol(type)) {
		return GetDeclarationName(type);
	} else if (IsDefinedType(type)) {
		return `defined`;
	} else if (type.flags & ts.TypeFlags.Intrinsic) {
		const name = (type as ts.IntrinsicType).intrinsicName;
		if (name === "true" || name === "false") {
			return "boolean";
		}
		return name;
	} else if (type.flags & ts.TypeFlags.NumberLiteral) {
		return `${(type as ts.NumberLiteralType).value}`;
	} else if (type.flags & ts.TypeFlags.StringLiteral) {
		return (type as ts.StringLiteralType).value;
	} else if (type.flags & ts.TypeFlags.ObjectFlagsType) {
		return "object";
	}

	return "Unknown";
}

export function GetTypeNamespace(type: ts.Type) {
	if (getSymbol(type)) {
		return GetSymbolNamespace(type);
	}

	return "Global";
}

export function IsPrimive(type: ts.Type) {
	if (type.flags & ts.TypeFlags.Intrinsic) {
		return true;
	} else if (type.flags & ts.TypeFlags.NumberLiteral) {
		return true;
	} else if (type.flags & ts.TypeFlags.StringLiteral) {
		return true;
	}

	return false;
}

export function WrapInNeverExpression(expression: ts.Expression) {
	return f.asNever(expression);
}

export function IsContainerNode(node: ts.Node) {
	return "statements" in node;
}

export function GetTypeUid(type: ts.Type) {
	if (getSymbol(type)) {
		return GetSymbolUID(getSymbol(type));
	} else if (IsDefinedType(type)) {
		return `Primitive:defined`;
	} else if (type.flags & ts.TypeFlags.Intrinsic) {
		const name = (type as ts.IntrinsicType).intrinsicName;
		if (name === "true" || name === "false") {
			return "Primitive:boolean";
		}
		return `Primitive:${name}`;
	} else if (type.flags & ts.TypeFlags.NumberLiteral) {
		return `PrimitiveNumber:${(type as ts.NumberLiteralType).value}`;
	} else if (type.flags & ts.TypeFlags.StringLiteral) {
		return `PrimitiveString:${(type as ts.StringLiteralType).value}`;
	} else if (type.flags & ts.TypeFlags.ObjectFlagsType) {
		return `Object`;
	}

	return "UnknownType";
}
