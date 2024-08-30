import { TransformContext } from "../transformer";
import { ConvertValueToCallExpression as CreateCallExpression } from "../type-builders";
import { IReflectionRuntime } from "./types";

const proxy = new Proxy(
	{},
	{
		get: (_, functionName) => {
			return (...args: unknown[]) => {
				if (typeof functionName === "symbol") throw new Error(`Unsupported symbol`);

				TransformContext.Instance.AddImportDeclaration(functionName);
				return CreateCallExpression(functionName, args);
			};
		},
	},
);

export const ReflectionRuntime = proxy as IReflectionRuntime;
