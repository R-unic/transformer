/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import ts from "typescript";

export const PATH_SEPARATOR_REGEX = /\\/g;

interface AssemblyInfo {
	PackageName: string;
	OutDir: string;
	SrcDir: string;
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

	srcDir = removeLastFolder(srcDir.replace(PATH_SEPARATOR_REGEX, "/"));
	outDir = removeLastFolder(outDir.replace(PATH_SEPARATOR_REGEX, "/"));

	const packageInfo = fs.readFileSync(packageInfoPath, "utf-8");
	const packageName = JSON.parse(packageInfo).name as string;

	packageJsons.set(packageInfoPath, { packageName, tsConfigPath });
	tsconfigs.set(tsConfigPath, { srcDir, outDir, packagePath: packageInfoPath });

	return {
		PackageName: packageName,
		SrcDir: srcDir,
		OutDir: outDir,
	};
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
	const { PackageName, SrcDir, OutDir } = getAssemblyInfoFromFilePath(filePath);

	filePath = filePath.replace(OutDir, SrcDir);
	filePath = PackageName + "/" + path.relative(SrcDir, filePath).replace(PATH_SEPARATOR_REGEX, "/");

	return filePath + "#" + symbol.getName();
}
