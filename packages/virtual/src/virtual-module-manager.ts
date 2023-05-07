import { ResolveFileNameParams, VirtualModule, VirtualModulePlugin } from './virtual-module'

export class VirtualModuleManager {
  protected idToPlugin = new Map<string, VirtualModulePlugin>()
  protected idToFilePath = new Map<string, string>()
  protected idToImporter = new Map<string, string>()
  protected idToContent = new Map<string, string>()
  protected filePathToId = new Map<string, string>()

  constructor(
    readonly plugins: readonly VirtualModulePlugin[],
    readonly log: (msg: string) => void,
  ) {}

  readonly match = (id: string): boolean => !!this.getPluginById(id)

  readonly hasFileName = (fileName: string): boolean => this.filePathToId.has(fileName)

  /**
   * Should only be called AFTER `match` has been called.
   */
  readonly resolveFileName = (params: ResolveFileNameParams): string => {
    const fileName = // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.getPluginById(params.id)!.resolveFileName({
        ...params,
      })

    this.log(`Resolved ${params.id} to ${fileName}`)

    this.idToFilePath.set(params.id, fileName)
    this.idToImporter.set(params.id, params.importer)
    this.filePathToId.set(fileName, params.id)

    return fileName
  }

  /**
   * Should only be called AFTER `match` has been called.
   */
  readonly createContent = (fileName: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = this.filePathToId.get(fileName)!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const importer = this.idToImporter.get(id)!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const content = this.getPluginById(id)!.createContent({
      id,
      fileName,
      importer,
    })

    this.idToContent.set(id, content)

    // // Add the file to the project
    // this.projectFiles.set(fileName, ts.ScriptSnapshot.fromString(content))

    return content
  }

  readonly getVirtualModuleById = (id: string): VirtualModule | undefined => {
    const importer = this.idToImporter.get(id)
    const fileName = this.idToFilePath.get(id)
    const content = this.idToContent.get(id)

    if (!importer || !fileName || !content) {
      return undefined
    }

    return VirtualModule(id, importer, fileName, content)
  }

  readonly getVirtualModuleByFileName = (fileName: string): VirtualModule | undefined => {
    const filePath = this.filePathToId.get(fileName)

    return filePath ? this.getVirtualModuleById(filePath) : undefined
  }

  protected getPluginById(id: string): VirtualModulePlugin | undefined {
    const cached = this.idToPlugin.get(id)

    if (cached) {
      return cached
    }

    const found = this.plugins.find((plugin) => plugin.match.test(id))

    if (found) {
      this.idToPlugin.set(id, found)

      return found
    }
  }
}
