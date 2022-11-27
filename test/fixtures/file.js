const os = require('node:os')
const path = require('node:path')
const ReadLine = require('node:readline')
const { writeFileSync, appendFileSync } = require('node:fs')

const options = {
  mode: '',
  filanme: ''
}
const tmpdir = os.tmpdir()
const reader = ReadLine.createInterface({
  input: process.stdin,
  output: process.stdout
})

process.stdout.write(`Writting to temp dir: ${tmpdir}\n`)

reader.question(
  'Should create(c) a file or append(a) to an already existent one? (c/a) ',
  answer => {
    if (answer !== 'c' && answer !== 'a') {
      reader.write(`Invalid option, exiting now ${os.EOL}`)
      reader.close()
      process.exit(1)
    } else if (answer === 'e') {
      reader.write('Press enter to exit')
      reader.once('line', process.exit.bind(process, 0))
    } else {
      reader.question('Enter the filename: ', answer => {
        options.filename = answer

        if (options.mode === 'c') {
          const filepath = path.join(tmpdir, options.filename)
          writeFileSync(filepath, 'Hello World!', { encoding: 'utf8' })

          reader.write(
            `File created at ${filepath}. Click enter to exit ${os.EOL}`
          )
        } else {
          const filepath = path.join(tmpdir, options.filename)

          appendFileSync(filepath, 'Hello World!', { encoding: 'utf8' })
          reader.write('Press enter to exit')
        }

        reader.once('line', process.exit.bind(process, 0))
      })
    }

    options.mode = answer
  }
)
