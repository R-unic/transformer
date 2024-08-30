/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts from "typescript";
import { TransformContext } from "./transformer";

export const PATH_SEPARATOR_REGEX = /\\/g;
const nodeModulesPattern = "/node_modules/";

let typeIdCounter = -1;

/**
 * Returns id of given type
 * @description Id is taken from type's Symbol.
 * @param type
 * @param typeChecker
 */
export function getTypeId(type: ts.Type): number {
	return (type as any).id ?? ((type as any).id = typeIdCounter--);
}

/**
 * Returns declaration of symbol. ValueDeclaration is preferred.
 * @param symbol
 */
export function getDeclaration(symbol?: ts.Symbol): ts.Declaration | undefined {
	if (!symbol) {
		return undefined;
	}

	return symbol.valueDeclaration || symbol.declarations?.[0];
}

/**
 * Returns symbol of the type.
 * @param type
 */
export function getSymbol(type: ts.Type): ts.Symbol {
	return type.aliasSymbol || type.symbol;
}

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

/**
 * Get full name of the type
 * @param type
 * @param context
 */
export function getTypeFullName(type: ts.Type) {
	const symbol = getSymbol(type);
	const declaration = getDeclaration(symbol);

	if (!declaration) {
		return undefined;
	}

	let filePath = declaration.getSourceFile().fileName;
	const [packageInfoPath, tsConfigPath] = findPackageJsonAndTSConfigFromFilePath(filePath);

	if (!tsConfigPath || !packageInfoPath) {
		throw new Error("tsconfig.json or package.json not found");
	}

	const { srcDir, outDir } = readSrcAndOutDir(tsConfigPath);
	if (!outDir || !srcDir) {
		throw new Error("outDir or srcDir not found");
	}
	const packageInfo = fs.readFileSync(packageInfoPath, "utf-8");
	const packageName = JSON.parse(packageInfo).name as string;

	filePath = filePath.replace(outDir.split("/").at(-1)!, srcDir.split("/").at(-1)!);
	filePath = packageName + "/" + path.relative(removeLastFolder(srcDir), filePath).replace(PATH_SEPARATOR_REGEX, "/");

	return filePath + "#" + symbol.getName();
}
