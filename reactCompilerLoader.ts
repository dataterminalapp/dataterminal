import { transformSync } from '@babel/core';
import BabelPluginReactCompiler from 'babel-plugin-react-compiler';

const ReactCompilerConfig = {
  sources: (filename: string) => filename.indexOf('src/') !== -1,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function reactCompilerLoader(this: any, sourceCode: string, sourceMap: any) {
  const options = this.getOptions();
  const result = transformSync(sourceCode, {
    filename: options.filename,
    plugins: [
      [BabelPluginReactCompiler, ReactCompilerConfig],
    ],
    sourceMaps: true,
    inputSourceMap: sourceMap,
  });

  if (result === null) {
    this.callback(
      new Error(`Failed to transform "${options.filename}"`)
    );
    return;
  }

  this.callback(
    null,
    result.code,
    result.map === null ? undefined : result.map
  );
}