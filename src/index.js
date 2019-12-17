const {Command, flags} = require('@oclif/command')
const {cosmiconfig} = require('cosmiconfig')
const {prompt} = require('inquirer')
const Conf = require('conf')
const copyTemplateDir = require('copy-template-dir')
const {promisify} = require('util')
const path = require('path')
const copy = promisify(copyTemplateDir)
const execa = require('execa')

class LocalpenCommand extends Command {
  constructor() {
    super(...arguments)
    this.name = 'localpen'
    this.userPrefs = new Conf({projectName: this.name})
  }

  async run() {
    const options = await this.getOptions()
    this.saveUserPreferences(options)

    await this.createLocalpen(options)
    this.installDependencies()
  }

  async getOptions() {
    // read config found in files (.*rc, package.json, etc.)
    const explorer = cosmiconfig(this.name)
    const configInFiles = await explorer.search()
    const localConfig = configInFiles ? configInFiles.config : {}

    // override local config with flags
    const {flags} = this.parse(LocalpenCommand)
    const params = Object.assign(localConfig, flags)

    return this.requestMissingParams(params)
  }

  async requestMissingParams(params) {
    const userPrefs = this.userPrefs.get(this.name) || {}
    let answers = {}
    const questions = [
      {
        type: 'input',
        name: 'title',
        message: 'Page title',
      },
      {
        type: 'confirm',
        name: 'sass',
        message: 'Do you want to use sass?',
        default: userPrefs.sass,
      },
    ]

    const notInParams = entry => !Object.keys(params).includes(entry.name)
    const missingParams = questions.filter(notInParams)

    if (missingParams.length > 0) {
      answers = await prompt(missingParams).catch(this.exit)
    }

    // mix the user answers with the params
    return Object.assign(params, answers)
  }

  saveUserPreferences(options) {
    this.userPrefs.set(`${this.name}.sass`, options.sass)
  }

  async createLocalpen(options) {
    const srcDir = path.join(__dirname, '..', 'template')
    const destDir = process.cwd()

    const stylesExtension = options.sass ? 'scss' : 'css'
    const templateVars = {
      title: options.title,
      format: stylesExtension,
    }

    await copy(srcDir, destDir, templateVars)
  }

  installDependencies() {
    const subprocess = execa('npm', ['i'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    })

    subprocess.on('close', () => {
      this.log('💥 Run "npm start" to lauch your localpen!')
    })
  }
}

LocalpenCommand.description = `Describe the command here
...
Extra documentation goes here
`

LocalpenCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),

  title: flags.string({
    char: 't',
    description: 'page title',
  }),

  sass: flags.boolean({
    char: 's',
    description: 'use sass for styles',
  }),
}

module.exports = LocalpenCommand
