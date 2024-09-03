import ts from "typescript";
import { TransformContext } from "./transformer";

export default function (program: ts.Program) {
	return (transformationContext: ts.TransformationContext): ((file: ts.SourceFile) => ts.Node) => {
		const context = new TransformContext(program, transformationContext);
		return (file) => context.UpdateFile(file);
	};
}
