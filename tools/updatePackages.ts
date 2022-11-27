import * as fs from 'node:fs'
import { EOL } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Project } from 'ts-morph'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packagesDir = join(root, 'packages')

const packageNames = fs
  .readdirSync(packagesDir)
  .filter((name) => fs.statSync(join(packagesDir, name)).isDirectory())

const readJson = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8').toString())

const rootPackageJson = readJson(join(root, 'package.json'))

for (const name of packageNames) {
  const packageDir = join(packagesDir, name)
  const srcDir = join(packageDir, 'src')
  const filePaths = getAllFilePaths(srcDir)
  const packageJson = readJson(join(packageDir, 'package.json'))
  const tsconfigJson = readJson(join(packageDir, 'tsconfig.json'))
  const project = new Project({ tsConfigFilePath: join(packageDir, 'tsconfig.build.json') })
  const dependencies = new Set<string>()
  const references = new Set<string>()

  for (const path of filePaths) {
    const sourceFile = project.getSourceFileOrThrow(path)
    const imports = sourceFile
      .getImportStringLiterals()
      .map((x) => x.getText())
      .filter((x) => x.includes('@typed') || x.includes('@fp-ts'))

    for (const importPath of imports) {
      const [orgName, packageName] = importPath.split(/\/g/)

      dependencies.add(`${orgName}/${packageName}`)

      if (orgName === '@typed') {
        references.add(packageName)
      }
    }
  }

  packageJson.dependencies = {}
  for (const dependency of dependencies) {
    if (dependency in rootPackageJson.dependencies) {
      packageJson.dependencies[dependency] = findRootPackageVersion(dependency)
    } else {
      packageJson.dependencies[dependency] = 'workspace:*'
    }
  }

  fs.writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2) + EOL)

  tsconfigJson.references = Array.from(references)
    .sort()
    .map((name) => ({
      path: `.../${name}/tsconfig.build.json`,
    }))

  fs.writeFileSync(join(packageDir, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2) + EOL)
}

function getAllFilePaths(directory: string): readonly string[] {
  const files = fs.readdirSync(directory)

  return files.flatMap((name) => {
    const path = join(directory, name)
    const stat = fs.statSync(path)

    if (stat.isDirectory()) {
      return getAllFilePaths(path)
    }

    return [path]
  })
}

function findRootPackageVersion(name: string) {
  return rootPackageJson.dependencies[name] as string
}
