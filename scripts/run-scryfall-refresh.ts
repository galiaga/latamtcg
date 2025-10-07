 
import 'dotenv/config'
import { runScryfallRefresh } from '../src/services/scryfallIngest'

async function main() {
  try {
    const result = await runScryfallRefresh()
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()


